// ─── Dual-backend provider ──────────────────────────────────────────────
// Uses xAI (api.x.ai) when XAI_API_KEY is set; falls back to Groq
// (api.groq.com) when only GROQ_API_KEY is available.
// Reads env vars on every call so changes take effect without restart.

const XAI_BASE = "https://api.x.ai/v1";
const GROQ_BASE = "https://api.groq.com/openai/v1";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function pickProvider(): { base: string; key: string } {
  const xaiKey = process.env.XAI_API_KEY || "";
  if (xaiKey) return { base: XAI_BASE, key: xaiKey };

  const groqRaw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
  const groqKeys = groqRaw.split(",").map((k) => k.trim()).filter(Boolean);
  if (groqKeys.length > 0) return { base: GROQ_BASE, key: groqKeys[0] };

  throw new Error("No API key configured — set XAI_API_KEY or GROQ_API_KEY");
}

export function getModel(): string {
  const xaiKey = process.env.XAI_API_KEY || "";
  if (xaiKey) return process.env.XAI_MODEL || "grok-4-3";
  return process.env.XAI_MODEL || "llama-3.3-70b-versatile";
}

async function apiFetch(
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const { base, key } = pickProvider();
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
}

export async function xaiChat(
  messages: ChatMessage[],
  maxTokens = 4096,
): Promise<string> {
  const model = getModel();
  const res = await apiFetch("/chat/completions", {
    model,
    messages,
    max_tokens: maxTokens,
    stream: false,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`xAI/Groq API error (${res.status}) for model ${model}:`, err);
    throw new Error(`xAI/Groq API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || "";
  if (!content) return "";
  return content;
}

export function xaiChatStream(
  messages: ChatMessage[],
  maxTokens = 8192,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { base, key } = pickProvider();
        const model = getModel();
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            stream: true,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          controller.error(new Error(`xAI/Groq API error (${res.status}): ${err}`));
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          controller.error(new Error("No response body"));
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
            if (payload === "[DONE]") { controller.close(); return; }
            try {
              const parsed = JSON.parse(payload);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) controller.enqueue(encoder.encode(content));
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        if (!cancelled) controller.error(err);
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() { cancelled = true; },
  });

  return stream;
}

export async function xaiChatJSON<T>(
  messages: ChatMessage[],
  maxTokens = 4096,
): Promise<T> {
  const text = await xaiChat(messages, maxTokens);
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/\s*```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse AI response as JSON. Raw response (first 500 chars): ${cleaned.slice(0, 500)}`);
  }
}
