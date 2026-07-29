/** Trim paper text to fit Groq TPM limits while keeping the most useful content. */
export const MAX_SUMMARIZE_INPUT_CHARS = 6000;

export function trimTextForSummarization(text: string, maxChars = MAX_SUMMARIZE_INPUT_CHARS): {
  text: string;
  truncated: boolean;
} {
  const normalized = text.trim();
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false };
  }

  const abstractMatch = normalized.match(
    /(?:^|\n)\s*(?:abstract|summary)\s*:?\s*([\s\S]{200,}?)(?=\n\s*(?:introduction|keywords|1\.|methods|methodology|background)|$)/i
  );

  if (abstractMatch) {
    const prefix = normalized.slice(0, Math.min(800, normalized.length));
    const abstractBlock = abstractMatch[0].trim();
    const combined = `${prefix}\n\n${abstractBlock}`.slice(0, maxChars);
    return { text: combined, truncated: true };
  }

  return { text: normalized.slice(0, maxChars), truncated: true };
}

export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}
