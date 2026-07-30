import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/research/auth";
import { checkRateLimit, getClientKey } from "@/lib/research/rate-limit";
import { MAX_RESEARCH_CHARS } from "@/lib/research/types";
import { extractTextFromPdf } from "@/lib/research/pdf-extract";
import { resolveArxiv } from "@/lib/research/url-resolvers";
import { assessImportQuality } from "@/lib/research/text-quality";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

function debugLog(location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7430/ingest/35e7a5bc-92bf-4f9d-98ae-f97d5b186231", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "43cd19" },
    body: JSON.stringify({
      sessionId: "43cd19",
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId: data.hypothesisId,
    }),
  }).catch(() => {});
  // #endregion
}

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    const clientKey = getClientKey(req, user?.id);
    const rate = checkRateLimit(`extract-pdf:${clientKey}`, 10, 60 * 60 * 1000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: `Rate limit reached. Try again in ${rate.retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF must be under 20 MB" }, { status: 400 });
    }

    const name = file instanceof File ? file.name : "upload.pdf";
    if (!name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Try arXiv ID from filename (e.g. 2301.00001.pdf) or PDF metadata
    const rawUtf8 = buffer.toString("utf8");
    const arxivId =
      name.match(/(\d{4}\.\d{4,5})/)?.[1] ||
      rawUtf8.match(/arXiv[:\s]*(\d{4}\.\d{4,5})/i)?.[1];

    if (arxivId) {
      const arxivText = await resolveArxiv(arxivId);
      if (arxivText && arxivText.length >= 50) {
        debugLog("extract-pdf:arxiv-meta", "Resolved via arXiv ID", {
          hypothesisId: "H-PDF",
          arxivId,
          textLength: arxivText.length,
        });
        return NextResponse.json({
          text: arxivText.slice(0, MAX_RESEARCH_CHARS),
          charCount: Math.min(arxivText.length, MAX_RESEARCH_CHARS),
          source: "arxiv-api",
        });
      }
    }

    const text = extractTextFromPdf(buffer);

    debugLog("extract-pdf:result", "PDF upload extraction", {
      hypothesisId: "H-PDF",
      fileName: name,
      fileSize: file.size,
      textLength: text.length,
      preview: text.slice(0, 100),
    });

    if (!text || text.length < 50) {
      return NextResponse.json({
        error:
          "Could not extract readable text from this PDF. It may be a scanned image (photo of pages). Try copying the abstract manually, or use a text-based PDF from arXiv or Google Scholar.",
      }, { status: 400 });
    }

    const finalText = text.slice(0, MAX_RESEARCH_CHARS);
    const assessment = assessImportQuality(finalText);

    return NextResponse.json({
      text: finalText,
      charCount: finalText.length,
      quality: assessment.quality,
      qualityMessage: assessment.reason,
    });
  } catch (error) {
    console.error("PDF extract error:", error);
    debugLog("extract-pdf:error", "PDF extraction failed", {
      hypothesisId: "H-PDF",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Failed to extract text from PDF" }, { status: 500 });
  }
}
