import { NextRequest, NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/research/ssrf";
import { getUserFromRequest } from "@/lib/research/auth";
import { checkRateLimit, getClientKey } from "@/lib/research/rate-limit";
import { MAX_RESEARCH_CHARS } from "@/lib/research/types";
import { extractTextFromPdf } from "@/lib/research/pdf-extract";
import { resolvePaperFromUrl, buildMetaText, extractDoiFromHtml, resolveFromDoi } from "@/lib/research/url-resolvers";
import { assessImportQuality } from "@/lib/research/text-quality";

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

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

async function readLimitedBytes(res: Response, maxBytes: number): Promise<Buffer> {
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Response too large");
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(combined);
}

function normalizeArxivUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "arxiv.org") return url;

    const pdfMatch = parsed.pathname.match(/^\/pdf\/([^/]+?)(?:\.pdf)?$/i);
    if (pdfMatch) return `https://arxiv.org/abs/${pdfMatch[1]}`;

    const oldPdfMatch = parsed.pathname.match(/^\/ftp\/([^/]+)\.pdf$/i);
    if (oldPdfMatch) return `https://arxiv.org/abs/${oldPdfMatch[1]}`;

    return url;
  } catch {
    return url;
  }
}

function extractHtmlText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_RESEARCH_CHARS);
}

function extractMetaFromHtml(html: string): string | null {
  return buildMetaText(html);
}

async function enrichWithDoi(text: string, html: string): Promise<string | null> {
  const doi = extractDoiFromHtml(html) || extractDoiFromHtml(text);
  if (!doi) return null;
  return resolveFromDoi(doi);
}

function buildFetchResponse(text: string, source: string) {
  const trimmed = text.slice(0, MAX_RESEARCH_CHARS);
  const assessment = assessImportQuality(trimmed);
  return NextResponse.json({
    text: trimmed,
    source,
    quality: assessment.quality,
    qualityMessage: assessment.reason,
  });
}

async function fetchPdfText(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { ...FETCH_HEADERS, Accept: "application/pdf,*/*" },
    signal: AbortSignal.timeout(20000),
    redirect: "follow",
  });

  if (!res.ok) return null;

  const buf = await readLimitedBytes(res, MAX_PDF_BYTES);
  const text = extractTextFromPdf(buf);
  debugLog("fetch-url:pdf-extract", "PDF extraction result", {
    hypothesisId: "H-PDF",
    url,
    bufferSize: buf.length,
    textLength: text.length,
    preview: text.slice(0, 80),
  });
  return text.length >= 50 ? text.slice(0, MAX_RESEARCH_CHARS) : null;
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    const clientKey = getClientKey(req, user?.id);
    const rate = checkRateLimit(`fetch-url:${clientKey}`, 20, 60 * 60 * 1000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: `Rate limit reached. Try again in ${rate.retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    let { url } = await req.json();
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json(
        { error: "Please provide a valid URL starting with http:// or https://" },
        { status: 400 }
      );
    }

    const originalUrl = url;
    url = normalizeArxivUrl(url.trim());
    debugLog("fetch-url:entry", "Fetch URL request", {
      hypothesisId: "H-URL",
      originalUrl,
      normalizedUrl: url,
    });

    await assertSafeUrl(url);

    // Academic resolvers (arXiv API, etc.) — most reliable for student papers
    const resolved = await resolvePaperFromUrl(url);
    if (resolved && resolved.length >= 50) {
      debugLog("fetch-url:resolver-success", "Academic resolver succeeded", {
        hypothesisId: "H-RESOLVER",
        length: resolved.length,
        url,
      });
      return buildFetchResponse(resolved, "resolver");
    }

    // HTML page fetch
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
      const pdfText = await fetchPdfText(url);
      if (pdfText) {
        return buildFetchResponse(pdfText, "pdf");
      }
      return NextResponse.json({
        error:
          "Could not read text from this PDF link. Download the file and use Upload PDF instead, or paste the abstract manually.",
      }, { status: 400 });
    }

    if (!res.ok) {
      debugLog("fetch-url:http-error", "HTTP fetch failed", {
        hypothesisId: "H-URL",
        status: res.status,
        url,
      });
      if (res.status === 403) {
        const domain = new URL(url).hostname;
        return NextResponse.json({
          error: `${domain} blocked automated access. Copy and paste the abstract text directly instead.`,
        }, { status: 400 });
      }
      return NextResponse.json({ error: `Failed to fetch URL (HTTP ${res.status})` }, { status: 400 });
    }

    const htmlBuf = await readLimitedBytes(res, MAX_HTML_BYTES);
    const html = htmlBuf.toString("utf-8");

    const metaText = extractMetaFromHtml(html);
    if (metaText) {
      const enriched = await enrichWithDoi(metaText, html);
      const finalText = enriched && enriched.length > metaText.length ? enriched : metaText;
      if (finalText.length >= 50) {
        debugLog("fetch-url:meta-success", "Meta/DOI extraction", {
          hypothesisId: "H-META",
          length: finalText.length,
          enriched: Boolean(enriched),
        });
        return buildFetchResponse(finalText, enriched ? "doi-resolver" : "meta");
      }
    }

    const text = extractHtmlText(html);
    debugLog("fetch-url:html-fallback", "HTML strip result", {
      hypothesisId: "H-HTML",
      length: text.length,
    });

    if (!text || text.length < 50) {
      const domain = new URL(url).hostname;
      return NextResponse.json({
        error: `Could not extract enough text from ${domain}. Try pasting the abstract directly, or upload a PDF file.`,
      }, { status: 400 });
    }

    return buildFetchResponse(text, "html");
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    debugLog("fetch-url:error", "Fetch URL exception", {
      hypothesisId: "H-URL",
      name: e.name,
      message: e.message,
    });
    const msg =
      e.name === "TimeoutError"
        ? "Request timed out. Try a different link or paste the abstract manually."
        : e.message === "Response too large"
          ? "Page is too large to process. Try pasting the abstract directly."
          : e.message === "This URL is not allowed"
            ? "This URL is not allowed for security reasons."
            : e.message === "Could not resolve URL hostname"
              ? "Could not reach that website. Check the URL and try again."
              : `Failed to fetch URL: ${e.message || "Unknown error"}`;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
