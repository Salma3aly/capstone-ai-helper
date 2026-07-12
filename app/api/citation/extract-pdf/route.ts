import { NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/research/pdf-extract";
import { grokChatJSON } from "@/lib/sandbox/grok";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = extractTextFromPdf(buffer);

    if (!text || text.length < 50) {
      return NextResponse.json({ error: "Could not extract readable text from this PDF" }, { status: 400 });
    }

    const snippet = text.slice(0, 6000);
    const fileName = file.name.replace(/\.pdf$/i, "");

    // Try to extract publication date from raw text using regex patterns
    const dateRegexes = [
      /(?:published|date|created|received|accepted|submitted)[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
      /(?:published|date|created)[:\s]*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/,
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/,
    ];
    let fallbackDate = "";
    for (const re of dateRegexes) {
      const m = text.match(re);
      if (m) {
        fallbackDate = m[1] || m[0];
        break;
      }
    }

    const prompt = `You are an academic citation metadata parser.
Given the PDF text snippet below, extract:
- title: paper/article title
- siteName: journal or publication name (infer from context, empty if unknown)
- authors: array of author names (find them in the header/abstract area — empty array if none)
- pubDate: publication date in YYYY-MM-DD format (look near the title or in the abstract — if you find a date string like "${fallbackDate}" convert it to YYYY-MM-DD; empty string if not found)

Focus especially on finding the **author names** and **publication date** from the PDF header/abstract area.
Use the filename "${fileName}" as a hint for the title if the text doesn't clearly indicate one.

Return ONLY raw JSON matching: {"title": "...", "siteName": "...", "authors": [...], "pubDate": "..."}

If you are unsure about pubDate but find something like "${fallbackDate}" in the text, use that rather than returning empty.

PDF text:
${snippet}`;

    const data = await grokChatJSON<{ title: string; siteName: string; authors: string[]; pubDate: string }>(
      [{ role: "user", content: prompt }],
      "llama-3.3-70b-versatile",
      2048
    );

    // If LLM didn't find a date but regex did, use the regex result
    let finalPubDate = data.pubDate || "";
    if (!finalPubDate && fallbackDate) {
      const d = new Date(fallbackDate);
      if (!isNaN(d.getTime())) {
        finalPubDate = d.toISOString().slice(0, 10);
      } else {
        finalPubDate = fallbackDate.replace(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/, "$1-$2-$3");
      }
    }

    return NextResponse.json({
      title: data.title || fileName,
      siteName: data.siteName || "",
      authors: Array.isArray(data.authors) ? data.authors : [],
      pubDate: finalPubDate,
    });
  } catch (error) {
    console.error("PDF extraction API Error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF. Please fill in details manually." },
      { status: 500 }
    );
  }
}
