import { Router } from "express";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function fetchPageMetadata(url: string): Promise<Record<string, string | undefined>> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Capstone/1.0)" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const html = await res.text();

  function getMeta(name: string): string | undefined {
    const patterns = [
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
      new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"),
    ];
    for (const p of patterns) { const m = html.match(p); if (m?.[1]) return m[1].trim(); }
  }

  const title = getMeta("og:title") || getMeta("twitter:title") || html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || "";
  const authors = (getMeta("citation_author") || getMeta("author") || getMeta("article:author") || "").split(/[,;]/).map((a) => a.trim()).filter(Boolean);
  const year = getMeta("citation_publication_date") || getMeta("article:published_time") || getMeta("datePublished") || "";
  const publisher = getMeta("og:site_name") || getMeta("citation_journal_title") || new URL(url).hostname.replace(/^www\./, "");
  const doi = getMeta("citation_doi") || "";
  const volume = getMeta("citation_volume") || "";
  const issue = getMeta("citation_issue") || "";
  const pages = getMeta("citation_firstpage") && getMeta("citation_lastpage") ? `${getMeta("citation_firstpage")}–${getMeta("citation_lastpage")}` : "";
  const accessDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return { title, authors: authors.join(", "), year: year.slice(0, 4) || new Date().getFullYear().toString(), publisher, url, doi, volume, issue, pages, accessDate };
}

router.post("/citation/scrape", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });
    const metadata = await fetchPageMetadata(url);
    return res.json({ metadata });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to scrape URL" }); }
});

router.post("/citation/extract-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "PDF file required" });
    // Dynamic import of pdf-parse
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(req.file.buffer);
    const text = data.text.slice(0, 5000);
    // Try to extract metadata from the PDF text
    const titleMatch = text.match(/^(.+?)(?:\n|Abstract)/i);
    const title = titleMatch?.[1]?.trim().slice(0, 200) || req.file.originalname.replace(".pdf", "");
    return res.json({ text, metadata: { title, pageCount: data.numpages } });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to extract PDF" }); }
});

export default router;
