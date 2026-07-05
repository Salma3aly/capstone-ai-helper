// ─── Dual-backend provider ──────────────────────────────────────────────
// Uses xAI (api.x.ai) when XAI_API_KEY is set; falls back to Groq
// (api.groq.com) when only GROQ_API_KEY is available.

const XAI_BASE = "https://api.x.ai/v1";
const GROQ_BASE = "https://api.groq.com/openai/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const XAI_KEY = process.env.XAI_API_KEY || "";
const GROQ_KEYS = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "").split(",").map((k) => k.trim()).filter(Boolean);

function pickProvider(): { base: string; key: string } {
  if (XAI_KEY) return { base: XAI_BASE, key: XAI_KEY };
  if (GROQ_KEYS.length > 0) return { base: GROQ_BASE, key: GROQ_KEYS[0] };
  throw new Error("No API key configured — set XAI_API_KEY or GROQ_API_KEY");
}

export function getModel(): string {
  // Use llama-3.3-70b on Groq, grok-4-3 on xAI
  if (XAI_KEY) return process.env.XAI_MODEL || "grok-4-3";
  return process.env.XAI_MODEL || "llama-3.3-70b-versatile";
}

async function apiFetch(
  path: string,
  body: Record<string, unknown>,
  stream = false
): Promise<Response> {
  const { base, key } = pickProvider();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ ...body, stream }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error (${res.status}) from ${base}: ${err.slice(0, 300)}`);
  }
  return res;
}

export async function xaiChat(
  messages: ChatMessage[],
  maxTokens = 2048
): Promise<string> {
  const res = await apiFetch("/chat/completions", {
    model: getModel(),
    messages,
    max_tokens: maxTokens,
  });
  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || "";
  if (choice?.finish_reason === "length") {
    throw new Error(
      `AI response truncated (finish_reason=length). Got ${content.length} chars. Try increasing max_tokens.`
    );
  }
  return content;
}

export async function xaiChatJSON<T>(
  messages: ChatMessage[],
  maxTokens = 2048
): Promise<T> {
  const text = await xaiChat(messages, maxTokens);
  const cleaned = text
    .replace(/```(?:json)?\s*/g, "")
    .replace(/\s*```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse AI response as JSON. Raw response (first 500 chars): ${cleaned.slice(0, 500)}`
    );
  }
}

export function xaiChatStream(
  messages: ChatMessage[],
  maxTokens = 4096
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await apiFetch("/chat/completions", {
          model: getModel(),
          messages,
          max_tokens: maxTokens,
        }, true);

        const reader = res.body?.getReader();
        if (!reader) {
          controller.error(new Error("No response body from AI API"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const payload = trimmed.slice(6);
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      } catch (err) {
        if (!cancelled) controller.error(err);
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return stream;
}
