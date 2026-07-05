import { NextResponse } from "next/server";
import { grokChatJSON } from "@/lib/sandbox/grok";

function extractMetaField(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
  }
  return "";
}

function extractMetaArray(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((m) => m[1].trim()).filter(Boolean);
}

function parseJSONLD(html: string): { authors: string[]; pubDate: string } {
  const authors: string[] = [];
  let pubDate = "";
  const ldBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!ldBlocks) return { authors, pubDate };
  for (const block of ldBlocks) {
    try {
      const raw = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "").trim();
      const parsed = JSON.parse(raw);
      const items = parsed["@graph"] || [parsed];
      for (const item of items) {
        if (item.author) {
          const itemAuthors = Array.isArray(item.author) ? item.author : [item.author];
          for (const a of itemAuthors) {
            const name = a.name || (a.givenName && a.familyName ? `${a.givenName} ${a.familyName}` : a.givenName || a.familyName || "");
            if (name && !authors.includes(name)) authors.push(name);
          }
        }
        if (item.datePublished && !pubDate) {
          pubDate = item.datePublished;
        }
      }
    } catch { /* skip invalid JSON-LD */ }
  }
  return { authors, pubDate };
}

function tryExtractMeta(html: string): { title: string; siteName: string; authors: string[]; pubDate: string } | null {
  const title =
    extractMetaField(html, [
      /<meta\s+property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
      /<meta\s+name=["']title["'][^>]*content=["']([^"']+)["']/i,
    ]) || extractMetaField(html, [/<h1[^>]*>([^<]+)<\/h1>/i]);

  const siteName = extractMetaField(html, [
    /<meta\s+property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+name=["']application-name["'][^>]*content=["']([^"']+)["']/i,
  ]);

  const authors = extractMetaArray(html, /<meta\s+name=["']citation_author["'][^>]*content=["']([^"']+)["']/gi);
  if (authors.length === 0) {
    const author = extractMetaField(html, [
      /<meta\s+name=["']author["'][^>]*content=["']([^"']+)["']/i,
      /<meta\s+name=["']twitter:creator["'][^>]*content=["']([^"']+)["']/i,
    ]);
    if (author) authors.push(author);
  }

  const pubDate = extractMetaField(html, [
    /<meta\s+property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+name=["']citation_date["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+name=["']date["'][^>]*content=["']([^"']+)["']/i,
    /<meta\s+property=["']book:release_date["'][^>]*content=["']([^"']+)["']/i,
  ]);

  // Also try JSON-LD for authors/date (common on academic/news sites)
  const ld = parseJSONLD(html);
  for (const a of ld.authors) {
    if (!authors.includes(a)) authors.push(a);
  }
  const finalPubDate = pubDate || ld.pubDate;

  if (title || siteName || authors.length > 0 || finalPubDate) {
    return {
      title: title || "",
      siteName: siteName || "",
      authors,
      pubDate: finalPubDate ? finalPubDate.slice(0, 10) : "",
    };
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl;
    }

    // Fetch the page with comprehensive browser headers
    let html = "";
    try {
      const res = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch {
      console.warn("Citation scrape: fetch failed for", cleanUrl);
    }

    // Try extracting from meta tags first (works for many academic sites)
    const metaResult = tryExtractMeta(html);
    if (metaResult && metaResult.title && metaResult.authors.length > 0 && metaResult.pubDate) {
      return NextResponse.json(metaResult);
    }

    // Fallback: use LLM when meta extraction has gaps (missing authors, date, or title)
    const needsLLM = metaResult ? (metaResult.authors.length === 0 || !metaResult.pubDate || !metaResult.title) : true;
    if (needsLLM && html) {
      const snippet = html.slice(0, 8000).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
      const parsedUrl = new URL(cleanUrl);
      const hostname = parsedUrl.hostname.replace(/^www\./i, "");

      const prompt = `You are an academic citation metadata parser.
Given the URL and HTML snippet below, extract:
- title: page/article title
- siteName: website or publication name
- authors: array of author names (empty array if none)
- pubDate: publication date in YYYY-MM-DD format (empty string if none)

Return ONLY raw JSON matching: {"title": "...", "siteName": "...", "authors": [...], "pubDate": "..."}

URL: "${cleanUrl}"
Domain: "${hostname}"

HTML:
${snippet}`;

      const data = await grokChatJSON<{ title: string; siteName: string; authors: string[]; pubDate: string }>(
        [{ role: "user", content: prompt }],
        "llama-3.3-70b-versatile",
        2048
      );

      return NextResponse.json({
        title: data.title || metaResult?.title || "",
        siteName: data.siteName || metaResult?.siteName || "",
        authors: Array.isArray(data.authors) && data.authors.length > 0 ? data.authors : (metaResult?.authors || []),
        pubDate: data.pubDate || metaResult?.pubDate || "",
      });
    }

    // Return whatever meta found, even if partial
    if (metaResult) {
      return NextResponse.json(metaResult);
    }

    return NextResponse.json({
      title: "",
      siteName: "",
      authors: [],
      pubDate: "",
    });
  } catch (error) {
    console.error("Scrape API Error:", error);
    return NextResponse.json(
      { error: "Could not scrape metadata. Please fill in details manually." },
      { status: 500 }
    );
  }
}
