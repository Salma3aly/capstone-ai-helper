import { NextResponse } from "next/server";

interface ArxivEntry {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  link: string;
  category: string;
}

export async function POST(req: Request) {
  try {
    const { query, maxResults = 10 } = await req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const searchQuery = encodeURIComponent(query.trim());
    const url = `https://export.arxiv.org/api/query?search_query=all:${searchQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

    const res = await fetch(url, {
      headers: { Accept: "application/atom+xml", "User-Agent": "CapstoneAssistant/1.0" },
    });

    if (!res.ok) throw new Error(`arXiv API returned ${res.status}`);

    const xml = await res.text();

    const entries: ArxivEntry[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const id = extractXml(entryXml, "id")?.trim() || "";
      const title = extractXml(entryXml, "title")?.replace(/\s+/g, " ").trim() || "";
      const summary = extractXml(entryXml, "summary")?.replace(/\s+/g, " ").trim() || "";
      const published = extractXml(entryXml, "published")?.trim() || "";
      const category = extractXml(entryXml, "category", "term") || "";

      const authors: string[] = [];
      const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
      let authorMatch;
      while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
        authors.push(authorMatch[1].trim());
      }

      entries.push({ id, title, authors, summary, published, link: id, category });
    }

    return NextResponse.json({ entries, total: entries.length, source: "arXiv" });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 500 });
  }
}

function extractXml(xml: string, tag: string, attr?: string): string | null {
  if (attr) {
    const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`);
    const m = regex.exec(xml);
    return m ? m[1] : null;
  }
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const m = regex.exec(xml);
  return m ? m[1] : null;
}
