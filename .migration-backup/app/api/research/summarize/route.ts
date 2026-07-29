import { NextResponse } from "next/server";
import { grokChatJSON } from "@/lib/sandbox/grok";
import { getUserFromRequest } from "@/lib/research/auth";
import { checkRateLimit, getClientKey } from "@/lib/research/rate-limit";
import { MAX_RESEARCH_CHARS } from "@/lib/research/types";
import { trimTextForSummarization, estimateTokens } from "@/lib/research/summarize-input";
import { assessImportQuality } from "@/lib/research/text-quality";

const REQUIRED_FIELDS = [
  "overview",
  "objective",
  "methodology",
  "findings",
  "capstoneJustification",
] as const;

/** ~5k output + ~2k input stays under Groq on_demand 12k TPM. */
const MAX_COMPLETION_TOKENS = 5000;

function debugLog(location: string, message: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  fetch("http://127.0.0.1:7430/ingest/35e7a5bc-92bf-4f9d-98ae-f97d5b186231", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "43cd19" },
    body: JSON.stringify({
      sessionId: "43cd19",
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId: data.hypothesisId,
    }),
  }).catch(() => {});
}

function parseGroqError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("413") || raw.includes("Request too large")) {
    return "The paper text is too long for the AI service. Try pasting only the abstract and summarize again.";
  }
  if (raw.includes("429 TPD")) {
    return "The AI service has reached its daily token limit. Please try again tomorrow or add more API keys.";
  }
  if (raw.includes("rate_limit") || raw.includes("429")) {
    return "AI service is busy. Please wait a minute and try again.";
  }
  return raw.includes("Grok API error") ? "Could not summarize this paper. Try a shorter abstract." : raw;
}

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    const clientKey = getClientKey(req, user?.id);
    const rate = checkRateLimit(`summarize:${clientKey}`, 10, 60 * 60 * 1000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: `Rate limit reached. Try again in ${rate.retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    const { text, projectContext, simpleLanguage } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Research paper text or abstract is required" }, { status: 400 });
    }

    if (text.length > MAX_RESEARCH_CHARS) {
      return NextResponse.json({ error: `Text must be under ${MAX_RESEARCH_CHARS} characters` }, { status: 400 });
    }

    const assessment = assessImportQuality(text);
    debugLog("summarize:quality", "Import quality check", {
      hypothesisId: "H-QUALITY",
      quality: assessment.quality,
      wordCount: assessment.wordCount,
    });

    if (assessment.quality !== "full") {
      return NextResponse.json(
        {
          error: assessment.reason || "Not enough paper content to summarize.",
          code: "INSUFFICIENT_CONTENT",
          quality: assessment.quality,
        },
        { status: 400 }
      );
    }

    const { text: apiText, truncated } = trimTextForSummarization(text);
    const escaped = apiText
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");

    const projectLine =
      projectContext && typeof projectContext === "string" && projectContext.trim()
        ? `Student capstone project: "${projectContext.trim().slice(0, 200).replace(/"/g, "'")}"`
        : "";

    const styleNote = simpleLanguage
      ? "Use simple, engaging language accessible to all learners. Define technical terms in plain English."

      : "Use clear, accessible language suitable for a broad audience.";
    const prompt = `You are a scientific writing mentor helping students and makers understand research papers.

Read the research text and return ONLY valid JSON (no markdown fences).

${styleNote} ${projectLine}

Write detailed, engaging explanations (3 paragraphs per section, 3-5 sentences each) so the reader truly understands the paper.

Rules:
- Explain concepts clearly (what, why, how). Define technical terms.
- Only include numbers explicitly stated in the source.
- Do not invent experiments or results.
- Separate paragraphs with \\n\\n inside each JSON string value.
- overview: what problem the paper solves, what they did, and why it matters.

{
  "overview": "3 paragraphs",
  "objective": "3 paragraphs on aim and significance",
  "methodology": "3 paragraphs on methods and materials",
  "findings": "3 paragraphs on results and meaning",
  "capstoneJustification": "2 paragraphs explaining how the findings relate to a real-world project or application"
}

Research text:
"${escaped}"`;

    const estInputTokens = estimateTokens(prompt.length);
    debugLog("summarize:pre-request", "Token budget", {
      hypothesisId: "H-TPM",
      apiChars: apiText.length,
      estInputTokens,
      maxCompletionTokens: MAX_COMPLETION_TOKENS,
      estTotal: estInputTokens + MAX_COMPLETION_TOKENS,
    });

    const data = await grokChatJSON<{
      overview: string;
      objective: string;
      methodology: string;
      findings: string;
      capstoneJustification: string;
    }>([{ role: "user", content: prompt }], "llama-3.3-70b-versatile", MAX_COMPLETION_TOKENS);

    for (const field of REQUIRED_FIELDS) {
      if (!data[field] || typeof data[field] !== "string" || data[field].length < 300) {
        return NextResponse.json(
          { error: `AI response was too short for "${field}". Try again or paste a longer abstract.` },
          { status: 500 }
        );
      }
    }

    debugLog("summarize:success", "Summarize OK", {
      hypothesisId: "H-TPM",
      overviewLen: data.overview.length,
      findingsLen: data.findings.length,
    });

    return NextResponse.json({
      ...data,
      abstractText: data.overview,
      inputTruncated: truncated,
      inputCharsUsed: apiText.length,
    });
  } catch (error) {
    console.error("Summarize API Error:", error);
    debugLog("summarize:error", "Failed", {
      hypothesisId: "H-TPM",
      message: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    });
    return NextResponse.json({ error: parseGroqError(error) }, { status: 500 });
  }
}
