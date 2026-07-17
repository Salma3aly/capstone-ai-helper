import { NextResponse } from "next/server";
import { grokChatJSON } from "@/lib/sandbox/grok";
import { extractMetadataFromDoiOrTitle } from "@/lib/citation/metadataFetcher";

function buildSearchQueryFromUrl(parsedUrl: URL, hostname: string): string {
  const isCran = /cran/i.test(hostname);
  if (isCran) {
    const pkg = parsedUrl.searchParams.get("package");
    if (pkg) return pkg;
  }
  const segments = parsedUrl.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const meaningful = segments.filter(
    (s) => !/^(index|article|view|download|paper|pdf)$/i.test(s) && !/^\d+$/.test(s)
  );
  const candidate = meaningful
    .map((s) => s.replace(/[-_]/g, " "))
    .join(" ")
    .trim();
  if (candidate.length >= 4) return candidate;
  const hostParts = hostname.replace(/^(www|beta|dev)\./i, "").split(".");
  const mainDomain = hostParts.slice(0, hostParts.length - 1).join(" ");
  return mainDomain;
}

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

function extractMetaField(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
  }
  return "";
}

function extractMetaTags(html: string): Record<string, string[]> {
  const meta: Record<string, string[]> = {};
  const matches = html.matchAll(/<meta\s+([^>]+)>/gi);
  for (const m of matches) {
    const attrs = m[1];
    const nameMatch = attrs.match(/(?:name|property)=["']([^"']+)["']/i);
    const contentMatch = attrs.match(/content=["']([^"']+)["']/i);
    if (nameMatch && contentMatch) {
      const name = nameMatch[1].toLowerCase();
      const content = contentMatch[1]
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .trim();
      if (!meta[name]) meta[name] = [];
      meta[name].push(content);
    }
  }
  return meta;
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
            const name = typeof a === "string" ? a : (a?.name || (a?.givenName && a?.familyName ? `${a.givenName} ${a.familyName}` : a?.givenName || a?.familyName || ""));
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

type ScrapeResult = { title: string; siteName: string; authors: string[]; pubDate: string; volume?: string; issue?: string; pages?: string; doi?: string };

function tryExtractMeta(html: string): ScrapeResult | null {
  const meta = extractMetaTags(html);

  const getMeta = (keys: string[]): string => {
    for (const key of keys) {
      const val = meta[key.toLowerCase()]?.[0];
      if (val) return val;
    }
    return "";
  };

  const getAllMeta = (keys: string[]): string[] => {
    const list: string[] = [];
    for (const key of keys) {
      const vals = meta[key.toLowerCase()];
      if (vals) {
        for (const val of vals) {
          if (!list.includes(val)) list.push(val);
        }
      }
    }
    return list;
  };

  const title =
    getMeta(["og:title", "twitter:title", "title"]) ||
    extractMetaField(html, [/<title>([^<]+)<\/title>/i]) ||
    extractMetaField(html, [/<h1[^>]*>([^<]+)<\/h1>/i]);

  const siteName = getMeta(["og:site_name", "application-name"]);

  const authors = getAllMeta(["citation_author"]);
  if (authors.length === 0) {
    const author = getMeta(["author", "creator", "twitter:creator"]);
    if (author) {
      // CRAN/software pages often list multiple authors with role annotations in one meta tag
      // e.g. "Mahdi Teimouri [aut, cre], Adel Mohammadpour [aut], Saralees Nadarajah [aut]"
      if (/\[.*?\]/.test(author) && author.includes(",")) {
        const split = author
          .replace(/\[.*?\]/g, "")     // strip [aut, cre] etc
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        authors.push(...split);
      } else {
        authors.push(author);
      }
    }
  }

  const pubDate = getMeta(["article:published_time", "citation_date", "date", "book:release_date"]);
  const volume = getMeta(["citation_volume"]);
  const issue = getMeta(["citation_issue"]);

  const firstpage = getMeta(["citation_firstpage"]);
  const lastpage = getMeta(["citation_lastpage"]);
  const pages = firstpage && lastpage ? `${firstpage}-${lastpage}` : (firstpage || "");

  const doi = getMeta(["citation_doi"]);

  const ld = parseJSONLD(html);
  for (const a of ld.authors) {
    if (!authors.includes(a)) authors.push(a);
  }

  // Fallback: regex-based author extraction for CRAN/JSTOR/software pages
  if (authors.length === 0) {
    const authorHtml = extractAuthorsFromHtml(html);
    for (const a of authorHtml) {
      if (!authors.includes(a)) authors.push(a);
    }
  }

  const finalPubDate = pubDate || ld.pubDate;

  if (title || siteName || authors.length > 0 || finalPubDate) {
    return {
      title: title || "",
      siteName: siteName || "",
      authors,
      pubDate: finalPubDate ? finalPubDate.slice(0, 10) : "",
      volume: volume || "",
      issue: issue || "",
      pages: pages || "",
      doi: doi || "",
    };
  }
  return null;
}

/** Fallback: extract author names from CRAN/JSTOR/software page HTML structures */
function extractAuthorsFromHtml(html: string): string[] {
  const result: string[] = [];

  // Pattern 1: CRAN-style table row: <td>Author(s):</td><td>Name [aut], Name [aut]</td>
  const tablePattern = /Author\s*\(?s?\)?\s*:\s*<\/t[dh]>\s*<t[dh][^>]*>\s*([^<]+(?:\s*<br\s*\/?>\s*[^<]*)*)/i;
  const tableMatch = html.match(tablePattern);
  if (tableMatch) {
    const raw = tableMatch[1]
      .replace(/<br\s*\/?>/gi, ",")
      .replace(/\[.*?\]/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    const names = raw.split(",").map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean);
    for (const n of names) {
      if (n.length > 2 && !n.includes(":") && !/^https?:\/\//i.test(n)) {
        result.push(n);
      }
    }
    if (result.length > 0) return result;
  }

  // Pattern 2: CRAN definition list: <dt>Author(s):</dt><dd>Names</dd>
  const dlPattern = /Author\s*\(?s?\)?\s*:\s*<\/dt>\s*<dd[^>]*>\s*([^<]+)/i;
  const dlMatch = html.match(dlPattern);
  if (dlMatch) {
    const raw = dlMatch[1].replace(/\[.*?\]/g, "").trim();
    const names = raw.split(",").map((n) => n.trim()).filter(Boolean);
    for (const n of names) {
      if (n.length > 2) result.push(n);
    }
    if (result.length > 0) return result;
  }

  // Pattern 3: Plain "Author(s):" or "Created by:" label followed by text
  const labelPattern = /(?:Author\(?s?\)?\s*:\s*|Created\s+by\s*:\s*|By\s*:\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?\s*)+(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?\s*)*)*)/g;
  let labelMatch;
  while ((labelMatch = labelPattern.exec(html)) !== null) {
    const raw = labelMatch[1].replace(/\[.*?\]/g, "").trim();
    if (raw.length > 2 && !raw.startsWith("http")) {
      result.push(raw);
    }
  }
  if (result.length > 0) return result;

  return result;
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
    const body: any = await req.json();
    const { url } = body;
    const userTitle: string | undefined = body.title;

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
    let fetchStatus = 0;
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
      fetchStatus = res.status;
      if (res.ok) {
        html = await res.text();
      } else {
        console.error(`Citation scrape: HTTP ${res.status} ${res.statusText} for ${cleanUrl}`);
        fetchFailed = true;
      }
    } catch (err: any) {
      fetchFailed = true;
      console.error(`Citation scrape: fetch exception for ${cleanUrl} — ${err?.message || err}`);
    }

    // If the page is an error/directory listing, don't use its content
    if (html && isErrorPage(html)) {
      html = ""; // clear so we only use URL-based fallback
    }

    // Step 1: Extract from meta tags (gives us baseline data + possible DOI)
    const metaResult = tryExtractMeta(html);

    // Step 2: Build CRAN DOI from URL if applicable
    let doi = metaResult?.doi || "";
    if (!doi && /cran/i.test(hostname)) {
      const pkg = parsedUrl.searchParams.get("package");
      if (pkg) doi = `10.32614/CRAN.package.${pkg}`;
    }

    // Step 3: Try Crossref immediately (same order as PDF pipeline)
    let title = metaResult?.title || userTitle || titleFromUrlPath(parsedUrl.pathname) || "";
    // When fetch failed, build a higher-quality search query from the URL
    const fallbackTitle = title || buildSearchQueryFromUrl(parsedUrl, hostname) || "";
    if (fetchFailed && fallbackTitle) {
      console.error(`Citation scrape: fetch failed for ${cleanUrl}, using Crossref search with query: "${fallbackTitle}"`);
    }
    let crossrefData = await extractMetadataFromDoiOrTitle(doi || metaResult?.doi, fallbackTitle || title);
    if (!crossrefData) {
      console.error(`Citation scrape: Crossref returned no data for ${hostname} (query: "${fallbackTitle}")`);
    } else {
      console.error(`Citation scrape: Crossref returned data for ${hostname} — title="${crossrefData.title}", authors=${crossrefData.authors.length}`);
    }

    // Step 4: Establish baseline — Crossref takes precedence, meta fills gaps
    let siteName = "";
    let authors: string[] = [];
    let pubDate = "";
    let volume = "";
    let issue = "";
    let pages = "";

    if (crossrefData) {
      if (crossrefData.title && crossrefData.title !== "Unknown Title") title = crossrefData.title;
      if (crossrefData.authors && crossrefData.authors.length > 0) authors = crossrefData.authors;
      if (crossrefData.journal) siteName = crossrefData.journal;
      if (crossrefData.volume) volume = crossrefData.volume;
      if (crossrefData.issue) issue = crossrefData.issue;
      if (crossrefData.pages) pages = crossrefData.pages;
      if (crossrefData.year) pubDate = crossrefData.year;
      if (crossrefData.doi) doi = crossrefData.doi;
    }
    // Meta fills any gaps Crossref left empty
    if (!title) title = metaResult?.title || titleFromUrlPath(parsedUrl.pathname) || "";
    if (!siteName) siteName = metaResult?.siteName || hostname;
    if (authors.length === 0) authors = metaResult?.authors || [];
    if (!pubDate) pubDate = metaResult?.pubDate || "";
    if (!volume) volume = metaResult?.volume || "";
    if (!issue) issue = metaResult?.issue || "";
    if (!pages) pages = metaResult?.pages || "";
    if (!doi) doi = metaResult?.doi || "";

    // CRAN-specific: fetch DESCRIPTION file for reliable author/year extraction
    if (authors.length === 0 && /cran/i.test(hostname)) {
      const pkg = parsedUrl.searchParams.get("package");
      if (pkg) {
        try {
          const descRes = await fetch(`https://cran.r-project.org/web/packages/${pkg}/DESCRIPTION`);
          if (descRes.ok) {
            const desc = await descRes.text();
            // Parse Author line — strip [aut, cre] roles, split by comma
            const authorMatch = desc.match(/^Author:\s*(.+)$/m);
            if (authorMatch) {
              const raw = authorMatch[1].replace(/\[.*?\]/g, "").trim();
              const names = raw.split(",").map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean);
              if (names.length > 0) authors = names;
            }
            // Parse Year from Date/Publication entry
            if (!pubDate) {
              const dateMatch = desc.match(/^Date\/Publication:\s*(\d{4})/m) || desc.match(/^Packaged:\s*(\d{4})/m);
              if (dateMatch) pubDate = dateMatch[1];
            }
          }
        } catch (cranErr: any) {
          console.error(`Citation scrape: CRAN DESCRIPTION fetch failed for ${pkg} — ${cranErr?.message || cranErr}`);
        }
      }
    }

    // Step 5: Run LLM only for fields still missing (same conditional as PDF pipeline)
    let fallbackDate = "";
    if (html && html.length > 200) {
      const text = htmlToText(html).slice(0, 6000);
      const snippet = text.replace(/[ \t]+/g, " ").slice(0, 4000);

      const dateRegexes = [
        /(?:published|date|created|received|accepted|submitted)[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
        /(?:published|date|created)[:\s]*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
        /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/,
        /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/,
        /\/(\d{4})\/(?:0[1-9]|1[0-2])\//,
      ];
      for (const re of dateRegexes) {
        const m = snippet.match(re);
        if (m) {
          fallbackDate = m[1] || m[0];
          break;
        }
      }

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
        const hasExisting = crossrefData || title || siteName || authors.length > 0 || pubDate || volume || issue || pages || doi;
        const hint = hasExisting
          ? `We already have partial data from Crossref/meta:\n${JSON.stringify({ title, siteName, authors, pubDate, volume, issue, pages, doi }, null, 2)}\n\nFill in the missing fields: ${missingFields.join(", ")}.`
          : `Extract ALL metadata fields thoroughly.`;

        const prompt = `You are an academic citation metadata parser.
Given the page text below, ${hint}

- title: the article, software package, or page title
- siteName: FULL journal name, publication name, or software repository (e.g. "Current Opinion in Solid State and Materials Science", "CRAN")
- authors: EVERY single author/creator name as a complete array, in "FirstName LastName" format. For software packages, look in "Author(s):" or "Created by" sections and strip role annotations like [aut, cre]. List ALL of them.
- pubDate: publication year only, as a 4-digit string (e.g. "2025")
- volume: journal volume number as a string (e.g. "35"), leave empty for software packages
- issue: journal issue/number as a string (e.g. "2"), leave empty for software packages
- pages: page range or article number as a string (e.g. "101218"), leave empty for software packages
- doi: DOI identifier (e.g. "10.1016/j.cossms.2025.101218" or "10.32614/CRAN.package.Weighted.Desc.Stat")

Be thorough.

Return ONLY raw JSON matching: {"title": "...", "siteName": "...", "authors": [...], "pubDate": "2025", "volume": "35", "issue": "2", "pages": "101218", "doi": "10.1016/..."}

If you are unsure about pubDate but find something like "${fallbackDate}" in the text, use the year from that rather than returning empty.

Page text:
${snippet}`;

        try {
          const data = await grokChatJSON<ScrapeResult>(
            [{ role: "user", content: prompt }],
            "llama-3.3-70b-versatile",
            2048
          );

          if (data.title && !title) title = data.title;
          if (data.siteName && !siteName) siteName = data.siteName;
          if (data.authors && data.authors.length > 0 && authors.length === 0) authors = data.authors;
          if (data.volume && !volume) volume = data.volume;
          if (data.issue && !issue) issue = data.issue;
          if (data.pages && !pages) pages = data.pages;
          if (data.doi && !doi) doi = data.doi;
          if (data.pubDate && !pubDate) pubDate = data.pubDate;
        } catch {
          // LLM failed — keep whatever Crossref/meta gave us
        }
      }
    }

    // Fallback date from regex if still missing
    if (!pubDate && fallbackDate) {
      const m = fallbackDate.match(/\b(20\d{2})\b/);
      if (m) pubDate = m[0];
    }

    if (title || siteName) {
      return NextResponse.json({
        title: cleanString(title) || "",
        siteName: cleanString(siteName) || "",
        authors: cleanAuthors(authors),
        pubDate: cleanString(pubDate),
        volume: cleanString(volume) || "",
        issue: cleanString(issue) || "",
        pages: cleanString(pages) || "",
        doi: cleanString(doi) || "",
      });
    }

    // Nothing found at all
    const msg = fetchFailed
      ? `Could not connect to ${hostname}. The site may be blocking automated requests.${fallbackTitle ? ` Crossref search for "${fallbackTitle}" returned no results. Try providing a more specific title.` : ""}`
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
