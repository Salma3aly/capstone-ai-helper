import { NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/research/pdf-extract";
import { grokChatJSON } from "@/lib/sandbox/grok";
import { extractMetadataFromPdfText } from "@/lib/citation/metadataFetcher";

function cleanString(s: any): string {
  if (!s || typeof s !== "string") return "";
  const cleaned = s.trim();
  const lower = cleaned.toLowerCase();
  if (lower === "n/a" || lower === "none" || lower === "unknown" || lower === "null" || lower === "undefined") {
    return "";
  }
  return cleaned;
}

function cleanAuthors(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((a) => (typeof a === "string" ? a.trim() : ""))
    .filter((a) => a && !/^(n\/a|none|unknown|null|undefined)$/i.test(a));
}

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

    // Step 1: Try Crossref (DOI lookup > title search) for verified metadata
    const crossrefData = await extractMetadataFromPdfText(text, fileName);

    // Step 2: If Crossref returned good data, use it as the baseline
    // Then fill any remaining gaps via LLM
    let title = crossrefData?.title && crossrefData.title !== "Unknown Title" ? crossrefData.title : "";
    let siteName = crossrefData?.journal || "";
    let authors = crossrefData?.authors || [];
    let pubDate = crossrefData?.year || "";
    let volume = crossrefData?.volume || "";
    let issue = crossrefData?.issue || "";
    let pages = crossrefData?.pages || "";
    let doi = crossrefData?.doi || "";

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

    // Step 3: Use LLM to fill any remaining gaps
    const missingFields: string[] = [];
    if (!title) missingFields.push("title");
    if (!siteName) missingFields.push("siteName");
    if (!authors || authors.length === 0) missingFields.push("authors");
    if (!volume) missingFields.push("volume");
    if (!issue) missingFields.push("issue");
    if (!pages) missingFields.push("pages");
    if (!doi) missingFields.push("doi");
    if (!pubDate) missingFields.push("pubDate");

    if (missingFields.length > 0) {
      const hasExisting = title || siteName || authors.length > 0 || pubDate || volume || issue || pages || doi;
      const hint = hasExisting
        ? `We already have partial data from Crossref:\n${JSON.stringify({ title, siteName, authors, pubDate, volume, issue, pages, doi }, null, 2)}\n\nFill in the missing fields: ${missingFields.join(", ")}.`
        : `Extract ALL metadata fields thoroughly.`;

      const prompt = `You are an academic citation metadata parser.
Given the PDF text snippet below, ${hint}

- title: paper/article title
- siteName: FULL, complete journal or publication name — NEVER truncate it
- authors: EVERY single author name as a complete array, in "FirstName LastName" format. List ALL of them.
- pubDate: publication year only, as a 4-digit string (e.g. "2025")
- volume: journal volume number as a string (e.g. "35")
- issue: journal issue/number as a string (e.g. "2")
- pages: page range or article number as a string (e.g. "101218" or "1-10")
- doi: DOI identifier (e.g. "10.1016/j.cossms.2025.101218")

Be thorough. Use the filename "${fileName}" as a hint for the title if the text doesn't clearly indicate one.

Return ONLY raw JSON matching: {"title": "...", "siteName": "...", "authors": [...], "pubDate": "2025", "volume": "35", "issue": "2", "pages": "101218", "doi": "10.1016/..."}

If you are unsure about pubDate but find something like "${fallbackDate}" in the text, use the year from that rather than returning empty.

PDF text:
${snippet}`;

      try {
        const data = await grokChatJSON<{ title: string; siteName: string; authors: string[]; pubDate: string; volume: string; issue: string; pages: string; doi: string }>(
          [{ role: "user", content: prompt }],
          "llama-3.3-70b-versatile",
          2048
        );

        // Merge: LLM fills gaps, but Crossref data takes precedence when non-empty
        if (data.title && !title) title = data.title;
        if (data.siteName && !siteName) siteName = data.siteName;
        if (data.authors && data.authors.length > 0 && authors.length === 0) authors = data.authors;
        if (data.volume && !volume) volume = data.volume;
        if (data.issue && !issue) issue = data.issue;
        if (data.pages && !pages) pages = data.pages;
        if (data.doi && !doi) doi = data.doi;
        if (data.pubDate && !pubDate) pubDate = data.pubDate;
      } catch {
        // LLM failed — keep whatever Crossref gave us
      }
    }

    // Fallback date from regex if still missing
    if (!pubDate && fallbackDate) {
      const m = fallbackDate.match(/\b(20\d{2})\b/);
      if (m) pubDate = m[0];
    }

    return NextResponse.json({
      title: cleanString(title) || fileName,
      siteName: cleanString(siteName) || "",
      authors: cleanAuthors(authors),
      pubDate: cleanString(pubDate),
      volume: cleanString(volume) || "",
      issue: cleanString(issue) || "",
      pages: cleanString(pages) || "",
      doi: cleanString(doi) || "",
    });
  } catch (error) {
    console.error("PDF extraction API Error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF. Please fill in details manually." },
      { status: 500 }
    );
  }
}
