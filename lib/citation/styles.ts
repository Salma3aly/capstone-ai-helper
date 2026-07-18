import type { Source, CitationStyle } from "./types";

function initialsFrom(parts: string[]): string[] {
  return parts.flatMap((p) => p.split(".").map((s) => s.trim()).filter(Boolean));
}

function formatApaAuthor(authors: string[]): string {
  if (authors.length === 0) return "";

  const fmtOne = (name: string) => {
    const parts = name.split(" ");
    const last = parts.pop() || "";
    const initials = initialsFrom(parts).map((p) => p[0] + ".").join(", ");
    if (!initials) return last;
    return `${last}, ${initials}`;
  };

  if (authors.length === 1) return fmtOne(authors[0]);
  if (authors.length === 2) return authors.map(fmtOne).join(" & ");

  // APA 7th: up to 20 authors, & before last
  if (authors.length <= 20) {
    const all = authors.map(fmtOne);
    const last = all.pop() || "";
    return all.join(", ") + `, & ${last}`;
  }

  // 21+: first 19, ..., last
  const first19 = authors.slice(0, 19).map(fmtOne);
  const last = fmtOne(authors[authors.length - 1]);
  return first19.join(", ") + `, ... ${last}`;
}

function formatMlaAuthor(authors: string[]): string {
  if (authors.length === 0) return "";

  const fmtLastFirst = (name: string) => {
    const parts = name.split(" ");
    const last = parts.pop() || "";
    const given = parts.join(" ");
    if (!given) return last;
    return `${last}, ${given}`;
  };

  if (authors.length === 1) return fmtLastFirst(authors[0]);
  if (authors.length === 2) return `${fmtLastFirst(authors[0])}, and ${authors[1]}`;

  // MLA 9th: first Author, et al.
  const first = fmtLastFirst(authors[0]);
  return `${first}, et al.`;
}

function formatIeeeAuthor(authors: string[]): string {
  if (authors.length === 0) return "";

  const fmtOne = (name: string) => {
    const parts = name.split(" ");
    const last = parts.pop() || "";
    const initials = initialsFrom(parts).map((p) => p[0]).join(".");
    if (!initials) return last;
    return `${initials}. ${last}`;
  };

  if (authors.length === 1) return fmtOne(authors[0]);

  // IEEE: 1-6 list all with "and" before last; 7+ just first author + et al.
  if (authors.length <= 6) {
    const all = authors.map(fmtOne);
    const last = all.pop() || "";
    return all.join(", ") + `, and ${last}`;
  }

  const first = fmtOne(authors[0]);
  return `${first}, et al.`;
}

function formatAmaAuthor(authors: string[]): string {
  if (authors.length === 0) return "";

  const fmtOne = (name: string) => {
    const parts = name.split(" ");
    const last = parts.pop() || "";
    const initials = initialsFrom(parts).map((p) => p[0]).join("");
    if (!initials) return last;
    return `${last} ${initials}`;
  };

  if (authors.length === 1) return fmtOne(authors[0]);

  // AMA 11th: 2-6 authors, commas (no "and"); 7+ first 3 + et al.
  if (authors.length <= 6) {
    return authors.map(fmtOne).join(", ");
  }

  const first3 = authors.slice(0, 3).map(fmtOne);
  return first3.join(", ") + ", et al.";
}

function formatAuthors(authors: string[], style: CitationStyle): string {
  switch (style) {
    case "APA": return formatApaAuthor(authors);
    case "MLA": return formatMlaAuthor(authors);
    case "IEEE": return formatIeeeAuthor(authors);
    case "AMA": return formatAmaAuthor(authors);
    default: return authors.join(", ");
  }
}

function onlyYear(date: string): string {
  if (!date) return "";
  const m = date.match(/^\d{4}/);
  return m ? m[0] : date;
}

function formatDate(date: string): string {
  return onlyYear(date);
}

function isArticleNumber(pages?: string): boolean {
  if (!pages) return false;
  return !pages.includes("-") && /^\d+$/.test(pages);
}

function doiStr(doi?: string): string {
  if (!doi) return "";
  const url = doi.startsWith("http") ? doi : `https://doi.org/${doi}`;
  return ` ${url}`;
}

function stripTrailingPeriod(s: string): string {
  return s.replace(/\.+$/, "");
}

/** Extract a clean site name from a URL domain (e.g. "https://www.elindependiente.com/..." → "El Independiente") */
function extractDomain(url: string): string {
  if (!url) return "";
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return hostname
      .split(".")
      .slice(0, -1) // remove TLD
      .join(" ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "";
  }
}

export function formatCitation(source: Source, style: CitationStyle): string {
  const author = formatAuthors(source.authors, style);
  const title = source.title || "Untitled";
  const date = formatDate(source.pubDate || "");

  // Derive site: use provided name, fall back to domain from URL, or empty
  const rawSite = source.siteName || extractDomain(source.url) || "";

  // Build the site segment with leading/trailing punctuation for each style
  function siteSegment(prefix: string, suffix: string): string {
    return rawSite ? `${prefix}${rawSite}${suffix}` : "";
  }

  // No authors → software/web resource: suppress all journal metadata
  if (!author) {
    switch (style) {
      case "APA": {
        const datePart = date ? `(${date})` : "(n.d.)";
        const s = siteSegment("", ". ");
        let out = s ? `${s}${datePart}. ${stripTrailingPeriod(title)}` : `${datePart}. ${stripTrailingPeriod(title)}`;
        return out;
      }
      case "MLA": {
        const datePart = date ? ` ${date}` : " n.d.";
        const s = siteSegment("", "");
        return `"${stripTrailingPeriod(title)}."${s ? ` ${s}` : ""}${datePart}.`;
      }
      case "IEEE": {
        const datePart = date ? ` ${date}` : "";
        const s = siteSegment("", "");
        return `"${stripTrailingPeriod(title)}."${s ? ` ${s}` : ""}${datePart}.`;
      }
      case "AMA": {
        const s = siteSegment("", ".");
        let out = s ? `${stripTrailingPeriod(title)}. ${s}` : `${stripTrailingPeriod(title)}.`;
        if (date) out += ` ${date}`;
        return out;
      }
      default:
        return "";
    }
  }

  switch (style) {
    case "APA": {
      const datePart = date ? `(${date})` : "(n.d.)";
      const vol = rawSite ? journalVol(rawSite, source.volume, source.number) : "";
      const artNum = isArticleNumber(source.pages) ? `Article ${source.pages}` : "";
      const pp = !isArticleNumber(source.pages) && source.pages ? `. ${source.pages}` : "";
      const doi = doiStr(source.doi);
      let out = `${author} ${datePart}. ${stripTrailingPeriod(title)}.`;
      if (vol) out += ` ${vol}`;
      if (artNum) out += `, ${artNum}`;
      if (pp) out += pp;
      if (doi) out += `.${doi}`;
      return out;
    }

    case "MLA": {
      const datePart = date ? ` ${date}` : " n.d.";
      const s = siteSegment("", "");
      let vol = "";
      if (source.volume) vol += `, vol. ${source.volume}`;
      if (source.number) vol += `, no. ${source.number}`;
      const isRange = source.pages && source.pages.includes("-");
      const pp = pagesStr(source.pages, isRange ? "pp" : "p");
      const doi = doiStr(source.doi);
      const middle = [s, vol].filter(Boolean).join("") + pp;
      return `${stripTrailingPeriod(author)}. "${stripTrailingPeriod(title)}."${middle ? ` ${middle}` : ""}${datePart}.${doi}`;
    }

    case "IEEE": {
      const datePart = date ? ` ${date}` : "";
      const s = siteSegment("", "");
      let vol = "";
      if (source.volume) vol += `, vol. ${source.volume}`;
      if (source.number) vol += `, no. ${source.number}`;
      const artNum = isArticleNumber(source.pages) ? `, art. no. ${source.pages}` : "";
      const pp = !isArticleNumber(source.pages) && source.pages ? `, pp. ${source.pages}` : "";
      const doi = doiStr(source.doi);
      const middle = [s, vol].filter(Boolean).join("") + pp + artNum;
      return `${author}, "${stripTrailingPeriod(title)},"${middle ? ` ${middle}` : ""}${datePart}.${doi}`;
    }

    case "AMA": {
      let volIssue = "";
      if (source.volume) volIssue += source.volume;
      if (source.number) volIssue += `(${source.number})`;
      const colonPages = source.pages ? `:${source.pages}` : "";
      const doi = doiStr(source.doi);
      const s = siteSegment("", ".");
      let out = `${stripTrailingPeriod(author)}. ${stripTrailingPeriod(title)}.`;
      if (s) out += ` ${s}`;
      if (date) out += ` ${date}`;
      if (volIssue) out += `;${volIssue}${colonPages}.`;
      if (doi) out += `${doi}`;
      return out;
    }

    default:
      return "";
  }
}

function journalVol(site: string, volume?: string, number?: string): string {
  let out = site;
  if (volume) out += `, ${volume}`;
  if (number) out += ` (${number})`;
  return out;
}

function pagesStr(pages?: string, prefix: "pp" | "p" = "pp"): string {
  if (!pages) return "";
  return `, ${prefix}. ${pages}`;
}

export function formatAllCitations(source: Source): Record<CitationStyle, string> {
  return {
    APA: formatCitation(source, "APA"),
    MLA: formatCitation(source, "MLA"),
    IEEE: formatCitation(source, "IEEE"),
    AMA: formatCitation(source, "AMA"),
  };
}