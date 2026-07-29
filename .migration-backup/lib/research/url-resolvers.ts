/** Resolve academic paper metadata from known sources (no PDF parsing required). */

import { isCitationLine } from "./text-quality";

export async function resolvePaperFromUrl(url: string): Promise<string | null> {
  const arxiv = await resolveArxiv(url);
  if (arxiv) return arxiv;

  const doiFromUrl = extractDoi(url);
  if (doiFromUrl) {
    const fromDoi = await resolveViaSemanticScholar(doiFromUrl);
    if (fromDoi) return fromDoi;
  }

  return null;
}

export async function resolveFromDoi(doi: string): Promise<string | null> {
  return resolveViaSemanticScholar(doi);
}

export function extractDoi(input: string): string | null {
  const match = input.match(/10\.\d{4,9}\/[^\s"'<>]+/i);
  if (!match) return null;
  return match[0].replace(/[.,;)\]]+$/, "");
}

export async function resolveArxiv(urlOrId: string): Promise<string | null> {
  const idMatch = urlOrId.match(/(\d{4}\.\d{4,5})(?:v\d+)?/);
  if (!idMatch) return null;

  const id = idMatch[1];
  try {
    const res = await fetch(`https://export.arxiv.org/api/query?id_list=${id}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;

    const xml = await res.text();
    const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1] || xml;
    const title = decodeXml(extractTag(entry, "title"));
    const abstract = decodeXml(extractTag(entry, "summary"));
    const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1].trim());

    if (!abstract || abstract.length < 30) return null;

    const parts: string[] = [];
    if (authors.length) parts.push(`Authors: ${authors.join(", ")}`);
    if (title) parts.push(`Title: ${title.replace(/\s+/g, " ").trim()}`);
    parts.push(`Abstract: ${abstract.replace(/\s+/g, " ").trim()}`);
    parts.push(`Source: arXiv:${id}`);

    return parts.join("\n\n");
  } catch {
    return null;
  }
}

async function resolveViaSemanticScholar(doi: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,abstract,authors`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      title?: string;
      abstract?: string | null;
      authors?: { name: string }[];
    };

    if (!data.abstract || data.abstract.length < 50) return null;

    const parts: string[] = [];
    if (data.authors?.length) {
      parts.push(`Authors: ${data.authors.map((a) => a.name).join(", ")}`);
    }
    if (data.title) parts.push(`Title: ${data.title}`);
    parts.push(`Abstract: ${data.abstract.trim()}`);
    parts.push(`DOI: ${doi}`);

    return parts.join("\n\n");
  } catch {
    return null;
  }
}

export function extractDoiFromHtml(html: string): string | null {
  const citationDoi = html.match(
    /<meta\s+name=["']citation_doi["'][^>]*content=["']([^"']+)["']/i
  );
  if (citationDoi) return extractDoi(citationDoi[1]);

  const doiMeta = html.match(/<meta\s+name=["']DC\.Identifier["'][^>]*content=["']doi:([^"']+)["']/i);
  if (doiMeta) return extractDoi(doiMeta[1]);

  return extractDoi(html);
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(re);
  return match?.[1]?.trim() || "";
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function buildMetaText(html: string): string | null {
  const parts: string[] = [];

  const citationAbstract = html.match(
    /<meta\s+name=["']citation_abstract["'][^>]*content=["']([^"']+)["']/i
  );
  if (citationAbstract?.[1] && !isCitationLine(citationAbstract[1])) {
    parts.push(`Abstract: ${citationAbstract[1]}`);
  }

  const title = html.match(/<meta\s+name=["']citation_title["'][^>]*content=["']([^"']+)["']/i);
  const authors = [
    ...html.matchAll(/<meta\s+name=["']citation_author["'][^>]*content=["']([^"']+)["']/gi),
  ].map((m) => m[1]);
  const journal = html.match(
    /<meta\s+name=["']citation_journal_title["'][^>]*content=["']([^"']+)["']/i
  );
  const date = html.match(/<meta\s+name=["']citation_date["'][^>]*content=["']([^"']+)["']/i);
  const doi = extractDoiFromHtml(html);

  if (title) parts.unshift(`Title: ${title[1]}`);
  if (authors.length > 0) parts.unshift(`Authors: ${authors.join(", ")}`);
  if (journal) parts.push(`Journal: ${journal[1]}`);
  if (date) parts.push(`Date: ${date[1]}`);
  if (doi) parts.push(`DOI: ${doi}`);

  const description = html.match(
    /<meta\s+name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  if (description?.[1] && !isCitationLine(description[1]) && !parts.some((p) => p.startsWith("Abstract:"))) {
    const desc = description[1].trim();
    if (desc.split(/\s+/).length >= 40) parts.push(`Abstract: ${desc}`);
  }

  const result = parts
    .join("\n\n")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');

  return result.length >= 50 ? result : null;
}
