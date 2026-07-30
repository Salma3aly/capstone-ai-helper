export type ImportQuality = "full" | "metadata_only" | "insufficient";

export interface ImportAssessment {
  quality: ImportQuality;
  reason?: string;
  wordCount: number;
}

/** Detect whether imported text has enough prose to summarize meaningfully. */
export function assessImportQuality(text: string): ImportAssessment {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 30) {
    if (looksLikeMetadataOnly(trimmed)) {
      return {
        quality: "metadata_only",
        reason:
          "We only found the title and citation info — not the actual abstract. Open the paper on the journal website, copy the abstract paragraph, and paste it here.",
        wordCount,
      };
    }
    return {
      quality: "insufficient",
      reason: "Too little text. Paste the full abstract (not just the title).",
      wordCount,
    };
  }

  const abstractBody = extractAbstractBody(trimmed);
  const proseWords = countProseWords(abstractBody || trimmed);

  if (proseWords >= 60) {
    return { quality: "full", wordCount };
  }

  const looksLikeCitationOnly =
    looksLikeMetadataOnly(trimmed) ||
    ((/title\s*:/i.test(trimmed) || /authors?\s*:/i.test(trimmed)) && proseWords < 50);

  if (looksLikeCitationOnly || (wordCount < 100 && proseWords < 50)) {
    return {
      quality: "metadata_only",
      reason:
        "We only found the title and citation info — not the actual abstract. Open the paper on the journal website, copy the abstract paragraph, and paste it here.",
      wordCount,
    };
  }

  if (proseWords < 50) {
    return {
      quality: "insufficient",
      reason: "Text is too short to summarize. Paste the full abstract (usually 150–300 words).",
      wordCount,
    };
  }

  return { quality: "full", wordCount };
}

function extractAbstractBody(text: string): string | null {
  const match = text.match(/(?:^|\n)\s*abstract\s*:?\s*([\s\S]+)/i);
  return match?.[1]?.trim() || null;
}

function countProseWords(text: string): number {
  const cleaned = text
    .replace(/doi[:\s]*10\.\d{4,}[^\s]*/gi, "")
    .replace(/\(\d{4}\)[^.]*\./g, "")
    .replace(/title\s*:[^\n]*/gi, "")
    .replace(/authors?\s*:[^\n]*/gi, "")
    .replace(/journal\s*:[^\n]*/gi, "")
    .replace(/date\s*:[^\n]*/gi, "")
    .replace(/source\s*:[^\n]*/gi, "");

  return cleaned.split(/\s+/).filter((w) => w.length > 2 && /[a-zA-Z]/.test(w)).length;
}

function looksLikeMetadataOnly(text: string): boolean {
  return (
    (/title\s*:/i.test(text) || /authors?\s*:/i.test(text)) &&
    (/doi[:\s]*10\.\d{4,}/i.test(text) ||
      /\d{4}\)\.\s*doi/i.test(text) ||
      /Current Opinion|Elsevier|Springer|IEEE|Nature|Materials Science/i.test(text))
  );
}

export function isCitationLine(text: string): boolean {
  const t = text.trim();
  if (t.length > 300) return false;
  return (
    /doi[:\s]*10\.\d{4,}/i.test(t) &&
    (/\(\d{4}\)/.test(t) || /vol\.|volume|pp\.|pages/i.test(t) || /Current Opinion|Elsevier/i.test(t))
  );
}
