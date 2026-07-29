const DOI_REGEX = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;

export interface AcademicMetadata {
  title: string;
  authors: string[];
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  year: string;
  doi: string;
}

export async function extractMetadataFromPdfText(rawPdfText: string, fileName: string): Promise<AcademicMetadata | null> {
  try {
    const doiMatch = rawPdfText.match(DOI_REGEX);
    if (doiMatch) {
      const doi = doiMatch[0].replace(/[.,;)\]]$/, "");
      return await fetchMetadataByDoi(doi);
    }
    const lines = rawPdfText.split("\n").map((l) => l.trim()).filter(Boolean);
    const suspectedTitle = lines[0] && lines[0].length > 15 ? lines[0] : fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    return await searchMetadataByTitle(suspectedTitle);
  } catch {
    return null;
  }
}

export async function extractMetadataFromDoiOrTitle(doi?: string, title?: string): Promise<AcademicMetadata | null> {
  if (doi) {
    const result = await fetchMetadataByDoi(doi);
    if (result) return result;
  }
  if (title && title.length > 5) {
    return await searchMetadataByTitle(title);
  }
  return null;
}

async function fetchMetadataByDoi(doi: string): Promise<AcademicMetadata | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": "CapstoneAcademicApp/1.0 (mailto:capstone@example.com)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return formatCrossrefItem(json.message);
  } catch {
    return null;
  }
}

async function searchMetadataByTitle(title: string): Promise<AcademicMetadata | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(title)}&rows=1`, {
      headers: { "User-Agent": "CapstoneAcademicApp/1.0 (mailto:capstone@example.com)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const items = json.message?.items;
    if (!items || items.length === 0) return null;
    return formatCrossrefItem(items[0]);
  } catch {
    return null;
  }
}

function extractSoftwareAuthors(apiResponse: any): string[] {
  let rawAuthors: string[] = [];

  // 1. Check DataCite style 'creators' array
  if (apiResponse.creators && Array.isArray(apiResponse.creators)) {
    rawAuthors = apiResponse.creators.map((c: any) => c.name || `${c.givenName || ""} ${c.familyName || ""}`.trim());
  }
  // 2. Fallback to Crossref style 'author' array
  else if (apiResponse.author && Array.isArray(apiResponse.author)) {
    rawAuthors = apiResponse.author.map((a: any) => `${a.given || ""} ${a.family || ""}`.trim());
  }
  // 3. Fallback to a single flat author string (common in CRAN descriptions)
  else if (typeof apiResponse.author === "string") {
    rawAuthors = apiResponse.author.split(/,|and/).map((name: string) => name.trim());
  }

  // Clean up any empty strings or "and" artifacts
  return rawAuthors
    .map((name) => name.replace(/^and\s+/i, "").trim())
    .filter((name) => name.length > 0 && !name.toLowerCase().includes("cran"));
}

/**
 * Extract author names from the first ~1-2 pages of PDF text.
 * Looks for typical byline patterns: names appearing near the title,
 * separated by commas/and, optionally followed by affiliation in parens.
 * Strips footnote markers, acknowledgment lines, and "with research assistance from" lines.
 */
export function extractAuthorsFromPdfText(pdfText: string): string[] {
  if (!pdfText) return [];

  // Grab first 3000 chars — covers the title area + byline on first 1-2 pages
  const head = pdfText.slice(0, 3000);

  // Remove acknowledgment/research-assistance lines entirely
  const cleaned = head.replace(/acknowledge?ments?[\s\S]{0,500}$/i, "")
    .replace(/with research assistance from[\s\S]{0,200}$/i, "")
    .replace(/supported by[\s\S]{0,200}$/i, "");

  const result: string[] = [];

  // Pattern 1: Lines that look like a byline — "John Smith, Jane Doe, and Bob Jones"
  // Typically found after the title, before "Abstract" or body text.
  // Match lines containing 2+ capitalized names separated by commas/and, ending before abstract
  const bodyStart = cleaned.search(/\b(abstract|introduction|background|1\.?\s)/i);
  const headerArea = bodyStart > 0 ? cleaned.slice(0, bodyStart) : cleaned;

  const lines = headerArea.split("\n").map((l) => l.trim()).filter(Boolean);

  // Find the byline: usually the first line that has multiple capitalized names
  // with commas or "and" and doesn't look like a title (too short or all-caps)
  for (const line of lines) {
    if (result.length > 0) break;

    // Skip lines that are clearly titles (all caps, too many words)
    if (line.length > 120) continue;
    if (line === line.toUpperCase() && line.length > 30) continue;
    if (/^(figure|table|chapter|section|\d+\.)/i.test(line)) continue;

    // Count potential author names: capitalized words followed by more capitalized words
    const nameMatches = line.match(/([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+\.?)?)/g);
    if (!nameMatches || nameMatches.length < 1) continue;

    // A byline typically has 1-20 names separated by commas or "and"
    // It should NOT contain typical header words
    if (/\b(abstract|introduction|keywords|email|correspondence|university|institute|department|college|school|journal|volume|issue|page|doi|published|received|accepted)\b/i.test(line)) {
      continue;
    }

    // If the line has commas separating name-like tokens, it's likely a byline
    const tokens = line.split(/[,;]| and | & /).map((t) => t.trim().replace(/\s+/g, " ")).filter(Boolean);

    const validNames: string[] = [];
    for (const token of tokens) {
      // Skip tokens with lowercase-starting first letter (likely affiliations)
      if (/^[a-z]/.test(token)) continue;
      // Skip tokens containing digits, URLs, email addresses
      if (/\d/.test(token) || /@/.test(token) || /https?:\/\//i.test(token)) continue;
      // Skip single words
      if (!token.includes(" ")) continue;
      // Skip very short tokens
      if (token.length < 5) continue;
      // Skip if it looks like a footnote marker (e.g. "1", "†", "*")
      if (/^[\d*†‡§¶#]+/.test(token)) continue;

      // Strip footnote/affiliation markers like "1," "2," "†," at end
      const clean = token.replace(/[,;]?\s*[\d*†‡§¶#]+$/, "").trim();

      // Must have at least two words that start with capital letters
      const words = clean.split(" ");
      const capped = words.filter((w) => /^[A-Z]/.test(w));
      if (capped.length < 1 || words.length < 2) continue;

      // Skip tokens that are clearly affiliations (contain "University", "Institute", etc.)
      if (/\b(University|Institute|College|School|Department|Laboratory|Lab|Center|Centre|Corporation|Inc|Ltd|LLC|GmbH|Company)\b/i.test(clean)) {
        continue;
      }

      validNames.push(clean);
    }

    if (validNames.length >= 1) {
      // Remove duplicates
      const seen = new Set<string>();
      for (const name of validNames) {
        if (!seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          result.push(name);
        }
      }
    }
  }

  return result;
}

/**
 * Parse the OJS article's HTML page for a visible page range.
 * Looks for page-range patterns near volume/issue/citation text
 * in the "How to Cite" block or article metadata.
 */
export function extractPageRangeFromOjsHtml(html: string): string {
  if (!html || html.length < 100) return "";

  // Strip HTML tags for text search
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  // Look for volume/issue pattern like "12(4)" or "Vol. 12 No. 4" followed by a page range
  const patterns = [
    // "12(4), 38-49" or "12(4): 38-49"
    /(\d+)\s*\(\s*\d+\s*\)\s*[,:;]?\s*(\d+)\s*[-–]\s*(\d+)/,
    // "Vol. 12 No. 4, pp. 38-49"
    /vol\.?\s*\d+\s*(?:no\.?|issue)?\s*\d+[,:;]?\s*(?:pp?\.?\s*)?(\d+)\s*[-–]\s*(\d+)/i,
    // "volume 12, issue 4, pages 38-49"
    /volume\s*\d+[,:;]?\s*(?:issue|number|no\.?)\s*\d+[,:;]?\s*(?:pages?|pp?\.?)\s*(\d+)\s*[-–]\s*(\d+)/i,
    // "pp. 38-49"
    /pp\.?\s*(\d+)\s*[-–]\s*(\d+)/,
    // "Pages 38-49"
    /pages?\s*(\d+)\s*[-–]\s*(\d+)/i,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const start = m[m.length - 2];
      const end = m[m.length - 1];
      if (start && end && Number(end) > Number(start)) {
        return `${start}-${end}`;
      }
    }
  }

  return "";
}

/**
 * Fetch only the page range from Crossref via a direct DOI lookup.
 * Never falls back to title search — avoids wrong-article risk.
 */
export async function fetchCrossrefPagesByDoi(doi: string): Promise<string> {
  try {
    const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, "");
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      headers: { "User-Agent": "CapstoneAcademicApp/1.0 (mailto:capstone@example.com)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return "";
    const json = await res.json();
    return json.message?.page || "";
  } catch {
    return "";
  }
}

function formatCrossrefItem(item: any): AcademicMetadata {
  const title = item.title?.[0] || "Unknown Title";
  const authors = extractSoftwareAuthors(item);
  const journal = item["container-title"]?.[0] || "";
  const volume = item.volume || "";
  const issue = item.issue || "";
  const pages = item.page || "";
  const year =
    item["published-print"]?.["date-parts"]?.[0]?.[0]?.toString() ||
    item["published-online"]?.["date-parts"]?.[0]?.[0]?.toString() ||
    item.created?.["date-parts"]?.[0]?.[0]?.toString() ||
    "";
  const doi = item.DOI ? `https://doi.org/${item.DOI}` : "";
  return { title, authors, journal, volume, issue, pages, year, doi };
}
