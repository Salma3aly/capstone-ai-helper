// ─── Dual-backend provider ──────────────────────────────────────────────
// Uses xAI (api.x.ai) when XAI_API_KEY is set; falls back to Groq via
// grok.ts (round-robin key rotation with 429 retry). No code duplication.

import { grokChat, grokChatStream, grokChatJSON, getKeyRing, GROQ_BASE, ChatMessage } from "./grok";

const XAI_BASE = "https://api.x.ai/v1";

function hasXaiKey(): boolean {
  return !!process.env.XAI_API_KEY;
}

export function getModel(): string {
  const override = process.env.XAI_MODEL;
  if (override) return override;
  return hasXaiKey() ? "grok-4-3" : "llama-3.3-70b-versatile";
}

// ── Non-streaming ──

export async function xaiChat(
  messages: ChatMessage[],
  maxTokens = 4096,
): Promise<string> {
  if (!hasXaiKey()) {
    // Delegate to grok.ts which handles key rotation + 429 retry
    return grokChat(messages, getModel(), maxTokens);
  }

  const model = getModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let res;
  try {
    res = await fetch(`${XAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, stream: false }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.text();
    console.error(`xAI API error (${res.status}) for model ${model}:`, err);
    throw new Error(`xAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  return content;
}

// ── Streaming ──

export function xaiChatStream(
  messages: ChatMessage[],
  maxTokens = 8192,
): ReadableStream<Uint8Array> {
  if (!hasXaiKey()) {
    // Delegate to grok.ts which handles key rotation + 429 retry
    return grokChatStream(messages, getModel(), maxTokens);
  }

  const encoder = new TextEncoder();
  let cancelled = false;

  return new ReadableStream({
    async start(controller) {
      try {
        const model = getModel();
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 120000);
        let res;
        try {
          res = await fetch(`${XAI_BASE}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.XAI_API_KEY}`,
            },
            body: JSON.stringify({ model, messages, max_tokens: maxTokens, stream: true }),
            signal: ac.signal,
          });
        } finally {
          clearTimeout(t);
        }

        if (!res.ok) {
          controller.error(new Error(`xAI API error (${res.status}): ${await res.text()}`));
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) { controller.error(new Error("No response body")); return; }

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
        controller.close();
      } catch (err) {
        if (!cancelled) controller.error(err);
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() { cancelled = true; },
  });
}

// ── JSON helper ──

export async function xaiChatJSON<T>(
  messages: ChatMessage[],
  maxTokens = 4096,
): Promise<T> {
  if (!hasXaiKey()) {
    // Delegate to grok.ts which handles key rotation + 429 retry
    return grokChatJSON<T>(messages, getModel(), maxTokens);
  }

  const text = await xaiChat(messages, maxTokens);
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/\s*```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt JSON repair for literal newlines inside strings
    let out = ""; let inStr = false; let esc = false;
    for (const ch of cleaned) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"' && !esc) { inStr = !inStr; out += ch; continue; }
      if (inStr && (ch === "\n" || ch === "\r")) { out += "\\n"; continue; }
      out += ch;
    }
    try {
      return JSON.parse(out) as T;
    } catch {
      throw new Error(`Failed to parse xAI response as JSON. Raw response (first 500 chars): ${cleaned.slice(0, 500)}`);
    }
  }
}
