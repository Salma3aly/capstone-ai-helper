import { inflateSync, inflateRawSync } from "zlib";

/** Extract readable text from PDFs using metadata, streams, and ASCII fallback. */
export function extractTextFromPdf(buffer: Buffer): string {
  const metadata = extractPdfMetadata(buffer);
  const streamText = extractFromStreams(buffer);
  const asciiText = extractAsciiRuns(buffer);

  // Combine all sources — prefer the longest valid text to get full paper content
  const candidates = [
    { text: metadata, label: "metadata" },
    { text: streamText, label: "streams" },
    { text: asciiText, label: "ascii" },
  ].filter((c) => c.text.length >= 80 && letterRatio(c.text) > 0.4);

  if (candidates.length === 0) {
    return streamText.length > asciiText.length ? streamText : asciiText;
  }

  // Merge metadata (title/authors/abstract) with the longest body text
  candidates.sort((a, b) => b.text.length - a.text.length);
  const body = candidates[0].text;
  const metaParts: string[] = [];

  if (metadata) {
    const lines = metadata.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      if (line.startsWith("Title:") || line.startsWith("Authors:")) {
        if (!body.includes(line.replace(/^(Title|Authors):\s*/, "").slice(0, 60))) {
          metaParts.push(line);
        }
      }
    }
  }

  if (metaParts.length > 0) {
    return metaParts.join("\n") + "\n\n" + body;
  }
  return body;
}

function extractPdfMetadata(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  const parts: string[] = [];

  const title =
    matchMeta(utf8, /dc:title[\s\S]*?<rdf:li[^>]*>([^<]{5,})</i) ||
    matchMeta(utf8, /<pdfx:Title>([^<]+)</i) ||
    matchMeta(utf8, /<rdf:li xml:lang="en">([^<]{5,})<\/rdf:li>/i);

  const description =
    matchMeta(utf8, /dc:description[\s\S]*?<rdf:li[^>]*>([^<]{20,})</i) ||
    matchMeta(utf8, /<pdfx:Abstract>([^<]+)</i);

  const authors = [
    ...utf8.matchAll(/<dc:creator[\s\S]*?<rdf:li>([^<]+)<\/rdf:li>/gi),
  ].map((m) => m[1].trim());

  if (authors.length) parts.push(`Authors: ${authors.join(", ")}`);
  if (title) parts.push(`Title: ${cleanText(title)}`);
  if (description && !isCategoryList(description)) {
    parts.push(`Abstract: ${cleanText(description)}`);
  }

  const result = parts.join("\n\n");
  return result.length >= 80 && letterRatio(result) > 0.4 ? result : "";
}

function isCategoryList(s: string): boolean {
  return s.includes("->") || s.includes("→") || /^[\s\-•\d.]+$/.test(s);
}

function matchMeta(haystack: string, re: RegExp): string | null {
  const m = haystack.match(re);
  return m?.[1]?.trim() || null;
}

function extractFromStreams(buffer: Buffer): string {
  const parts: string[] = [];
  parts.push(...extractOperators(buffer.toString("latin1")));

  const latin = buffer.toString("latin1");
  const streamRegex = /(\d+\s+\d+\s+obj[\s\S]*?)stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(latin)) !== null) {
    if (!/\/Filter\s*(\/FlateDecode|\[\s*\/FlateDecode)/.test(match[1])) continue;
    const decompressed = tryInflate(Buffer.from(match[2], "latin1"));
    if (!decompressed) continue;
    parts.push(...extractOperators(decompressed.toString("latin1")));
  }

  return cleanText(parts.join(" "));
}

function extractAsciiRuns(buffer: Buffer): string {
  const runs = buffer.toString("latin1").match(/[\x20-\x7E]{50,}/g) || [];
  const filtered = runs.filter(
    (r) =>
      /[a-zA-Z]{4,}/.test(r) &&
      !r.includes("/Filter") &&
      !r.includes("endobj") &&
      !r.includes("begin") &&
      letterRatio(r) > 0.55
  );
  return cleanText(filtered.join(" "));
}

function tryInflate(buf: Buffer): Buffer | null {
  for (const fn of [inflateSync, inflateRawSync]) {
    try {
      return fn(buf);
    } catch {
      /* try next */
    }
  }
  return null;
}

function extractOperators(content: string): string[] {
  const parts: string[] = [];

  const btBlocks = content.match(/BT[\s\S]*?ET/g) || [];
  for (const block of btBlocks) {
    let match: RegExpExecArray | null;
    const parenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    while ((match = parenRegex.exec(block)) !== null) {
      const decoded = decodePdfString(match[1]);
      if (isReadableFragment(decoded)) parts.push(decoded);
    }
    const arrayRegex = /\[([^\]]*)\]\s*TJ/g;
    while ((match = arrayRegex.exec(block)) !== null) {
      for (const sm of match[1].matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g)) {
        const decoded = decodePdfString(sm[1]);
        if (isReadableFragment(decoded)) parts.push(decoded);
      }
    }
  }

  return parts;
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function isReadableFragment(s: string): boolean {
  if (s.length < 2 || !/[a-zA-Z]/.test(s)) return false;
  return letterRatio(s) > 0.4;
}

function letterRatio(s: string): number {
  if (!s.length) return 0;
  const letters = (s.match(/[a-zA-Z]/g) || []).length;
  return letters / s.length;
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
