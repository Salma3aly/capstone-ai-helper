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

type ScrapeResult = { title: string; siteName: string; authors: string[]; pubDate: string };

function tryExtractMeta(html: string): ScrapeResult | null {
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

/** Detect if page content is an error / directory listing / non-article page */
function isErrorPage(html: string): boolean {
  const signals = [
    "There are no readable files",
    "open_basedir",
    "Index of /",
    "Directory Listing",
    "403 Forbidden",
    "404 Not Found",
    "500 Internal Server Error",
    "Access Denied",
    "You don't have permission",
    "This page could not be found",
    "Sorry, the page you requested",
    "nothing found",
    "no results",
    "Please try again",
  ];
  const lower = html.toLowerCase();
  return signals.some((s) => lower.includes(s.toLowerCase()));
}

/** Strip HTML tags to get clean text for LLM analysis */
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Try to infer article title from URL path segments */
function titleFromUrlPath(pathname: string): string {
  const segments = pathname
    .replace(/\/$/, "")
    .split("/")
    .filter((s) => s && !/^\d+$/.test(s) && !/^(index|article|view|download|paper|pdf)$/i.test(s));
  if (segments.length === 0) return "";
  const last = segments[segments.length - 1];
  return last
    .replace(/[-_]/g, " ")
    .replace(/\.(html?|php|asp|aspx|jsp)$/i, "")
    .replace(/\b(\w)/g, (c) => c.toUpperCase());
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

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL format. Please enter a full URL like https://example.com/article" }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.replace(/^www\./i, "");

    // Fetch the page
    let html = "";
    let fetchFailed = false;
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
      fetchFailed = true;
      console.warn("Citation scrape: fetch failed for", cleanUrl);
    }

    // If the page is an error/directory listing, don't use its content
    if (html && isErrorPage(html)) {
      html = ""; // clear so we only use URL-based fallback
    }

    // Try extracting from meta tags first
    const metaResult = tryExtractMeta(html);
    if (metaResult && metaResult.title && metaResult.authors.length > 0 && metaResult.pubDate) {
      return NextResponse.json(metaResult);
    }

    // Try LLM if we have meaningful HTML
    const needsLLM = metaResult ? (metaResult.authors.length === 0 || !metaResult.pubDate || !metaResult.title) : true;
    if (needsLLM && html && html.length > 200) {
      const text = htmlToText(html).slice(0, 6000);
      const snippet = text.replace(/[ \t]+/g, " ").slice(0, 4000);

      // Try to extract date from raw HTML/URL using regex as fallback
      const dateRegexes = [
        /(?:published|date|created|received|accepted|submitted)[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
        /(?:published|date|created)[:\s]*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
        /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/,
        /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/,
        /\/(\d{4})\/(?:0[1-9]|1[0-2])\//,
      ];
      let fallbackDate = "";
      for (const re of dateRegexes) {
        const m = snippet.match(re);
        if (m) {
          fallbackDate = m[1] || m[0];
          break;
        }
      }

      const prompt = `You are an academic citation metadata parser.
Given the URL and page text below, extract:
- title: the article or page title
- siteName: website or publication name
- authors: array of author names (look for bylines, credit lines, or author sections — empty array if none found)
- pubDate: publication date in YYYY-MM-DD format (look for date stamps near the title/byline — find any date, even if it looks like "${fallbackDate}", convert it to YYYY-MM-DD; empty string if not found)

Focus especially on finding the **author names** and **publication date** from the page header area, byline, or metadata.
If you are unsure about pubDate but see something like "${fallbackDate}" in the text, use that rather than returning empty.
Return ONLY raw JSON matching: {"title": "...", "siteName": "...", "authors": [...], "pubDate": "..."}

URL: "${cleanUrl}"
Domain: "${hostname}"

Page text:
${snippet}`;

      try {
        const data = await grokChatJSON<ScrapeResult>(
          [{ role: "user", content: prompt }],
          "llama-3.3-70b-versatile",
          2048
        );

        // Validate: reject obviously wrong titles (error messages, too short, etc.)
        const junkTitles = ["there are no readable files", "index of", "403 forbidden", "404 not found", "access denied", "error", "page not found"];
        const isValid = data.title && data.title.length > 5 && !junkTitles.some((j) => data.title.toLowerCase().includes(j));

        let llmPubDate = data.pubDate || "";
        if (!llmPubDate && fallbackDate) {
          const d = new Date(fallbackDate);
          if (!isNaN(d.getTime())) {
            llmPubDate = d.toISOString().slice(0, 10);
          } else {
            llmPubDate = fallbackDate.replace(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/, "$1-$2-$3");
          }
        }
        return NextResponse.json({
          title: isValid ? data.title : (metaResult?.title || titleFromUrlPath(parsedUrl.pathname)),
          siteName: data.siteName || metaResult?.siteName || hostname,
          authors: Array.isArray(data.authors) && data.authors.length > 0 ? data.authors : (metaResult?.authors || []),
          pubDate: llmPubDate || metaResult?.pubDate || "",
        });
      } catch {
        // LLM failed, fall through to URL-based fallback
        console.warn("LLM extraction failed for", cleanUrl);
      }
    }

    // Fallback: use what we have from meta or URL path
    const title = metaResult?.title || titleFromUrlPath(parsedUrl.pathname) || "";
    const siteName = metaResult?.siteName || hostname;

    if (title || siteName) {
      return NextResponse.json({
        title,
        siteName,
        authors: metaResult?.authors || [],
        pubDate: metaResult?.pubDate || "",
      });
    }

    // Nothing found at all
    const msg = fetchFailed
      ? `Could not connect to ${hostname}. The site may be blocking automated requests.`
      : "This page doesn't appear to be a research article or web page with citation metadata.";
    return NextResponse.json({ error: msg }, { status: 422 });
  } catch (error) {
    console.error("Scrape API Error:", error);
    return NextResponse.json(
      { error: "Could not scrape metadata. Please fill in details manually." },
      { status: 500 }
    );
  }
}
