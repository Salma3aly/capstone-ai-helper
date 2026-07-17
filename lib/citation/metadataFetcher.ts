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
