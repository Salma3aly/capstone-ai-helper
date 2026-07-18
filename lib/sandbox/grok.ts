export const GROQ_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_TIMEOUT_MS = 60000;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Multi-key management ──────────────────────────────────────────────────
// Reads GROQ_API_KEYS (comma-separated) or GROQ_API_KEY from env on every
// call, so adding keys to .env.local takes effect immediately (no restart).
// Keys rotate round-robin; exhausted keys (TPD) are skipped.

export function getKeyRing(): string[] {
  const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
  if (!raw) throw new Error("GROQ_API_KEY or GROQ_API_KEYS env var is required");
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

const KEY_STATE = {
  exhausted: new Set<number>(),
  index: 0,
  lastReset: Date.now(),
  lastKeyCount: 0,
};

const RESET_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function getKey(): string {
  const ring = getKeyRing();

  // If the key count changed (new keys added), reset exhausted state
  if (ring.length !== KEY_STATE.lastKeyCount) {
    KEY_STATE.exhausted.clear();
    KEY_STATE.index = 0;
    KEY_STATE.lastKeyCount = ring.length;
    console.warn(`Groq key ring changed (${ring.length} keys), resetting rotation`);
  }

  const now = Date.now();
  if (now - KEY_STATE.lastReset > RESET_INTERVAL_MS) {
    KEY_STATE.exhausted.clear();
    KEY_STATE.lastReset = now;
    console.warn("Cleared exhausted Groq API key cache (hourly reset)");
  }

  const available = ring.filter((_, i) => !KEY_STATE.exhausted.has(i));
  if (available.length === 0) {
    KEY_STATE.exhausted.clear();
    console.warn("All Groq API keys exhausted, resetting for next attempt");
  }

  // Round-robin through keys, skipping exhausted ones
  for (let attempt = 0; attempt < ring.length; attempt++) {
    KEY_STATE.index = (KEY_STATE.index + 1) % ring.length;
    if (!KEY_STATE.exhausted.has(KEY_STATE.index)) {
      return ring[KEY_STATE.index];
    }
  }

  // Fallback — all exhausted, try the current one anyway
  KEY_STATE.index = (KEY_STATE.index + 1) % ring.length;
  return ring[KEY_STATE.index];
}

export function markKeyExhausted() {
  KEY_STATE.exhausted.add(KEY_STATE.index);
  const ring = getKeyRing();
  const remaining = ring.filter((_, i) => !KEY_STATE.exhausted.has(i)).length;
  console.warn(`Groq API key ${KEY_STATE.index + 1}/${ring.length} exhausted (TPD), ${remaining} keys remaining`);
}

/** Parse 429 body to determine if it's TPD (hard daily cap) or RPM (can retry) */
export function parse429Error(body: string): { type: "tpd" | "rpm" | "unknown"; used?: number; limit?: number } {
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.error?.message || "";
    if (msg.includes("tokens per day") || msg.includes("TPD")) {
      const usedMatch = msg.match(/Used\s*(\d+)/i);
      const limitMatch = msg.match(/Limit\s*(\d+)/i);
      return {
        type: "tpd",
        used: usedMatch ? parseInt(usedMatch[1], 10) : undefined,
        limit: limitMatch ? parseInt(limitMatch[1], 10) : undefined,
      };
    }
    if (msg.includes("requests per minute") || msg.includes("RPM")) {
      return { type: "rpm" };
    }
    return { type: "unknown" };
  } catch {
    return { type: "unknown" };
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 5): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const key = getKey();
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${key}`);
    const res = await fetchWithTimeout(url, { ...options, headers });

    if (res.status !== 429) return res;

    const body = await res.text();
    const info = parse429Error(body);

    // TPD — mark key exhausted and try another if available
    if (info.type === "tpd") {
      markKeyExhausted();
      const ring = getKeyRing();
      const remaining = ring.filter((_, i) => !KEY_STATE.exhausted.has(i)).length;
      if (remaining > 0) {
        console.warn(`Rotating to next Groq API key (${remaining} left)`);
        continue;
      }
      const usage = info.used != null && info.limit != null ? ` (${info.used}/${info.limit} tokens used today)` : "";
      throw new Error(`429 TPD${usage} — all API keys exhausted. Try again tomorrow.`);
    }

    // RPM limit — retry with backoff
    if (attempt === retries - 1) {
      throw new Error(`429 RPM — rate limited after ${retries} retries. Body: ${body}`);
    }

    const wait = Math.min(2000 * Math.pow(2, attempt), 30000);
    console.warn(`Groq rate limited (RPM 429), retry ${attempt + 1}/${retries} after ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error("Unreachable");
}

/**
 * Calls Grok (xAI) chat completions (non-streaming) and returns the response text.
 */
export async function grokChat(messages: ChatMessage[], model = "llama-3.3-70b-versatile", maxTokens = 2048): Promise<string> {
  const res = await fetchWithRetry(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Grok API error (${res.status}) for model ${model}, max_tokens=${maxTokens}:`, err);
    throw new Error(`Grok API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || "";
  const finishReason = choice?.finish_reason;
  if (!content) return "";
  if (finishReason === "length") {
    throw new Error(`Groq response was truncated (finish_reason=length). Got ${content.length} chars. Try a shorter prompt or increase max_tokens. Content: ${content.slice(0, 300)}`);
  }
  return content;
}

/**
 * Calls Grok (xAI) chat completions (streaming) and returns a ReadableStream
 * of text chunks suitable for the Next.js Response.
 */
export function grokChatStream(
  messages: ChatMessage[],
  model = "llama-3.3-70b-versatile",
  maxTokens = 2048
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ring = getKeyRing();
        let lastError: string | null = null;

        for (let attempt = 0; attempt < ring.length; attempt++) {
          const key = getKey();
          const res = await fetchWithTimeout(`${GROQ_BASE}/chat/completions`, {
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
          }, 120000);

          // Handle 429 — mark exhausted and try next key
          if (res.status === 429) {
            const errBody = await res.text();
            const info = parse429Error(errBody);
            if (info.type === "tpd") markKeyExhausted();
            console.warn(`Groq key ${KEY_STATE.index} hit 429, rotating to next key (attempt ${attempt + 1}/${ring.length})`);
            lastError = errBody;
            continue;
          }

          if (!res.ok) {
            controller.error(new Error(`Grok API error (${res.status}): ${await res.text()}`));
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) {
            controller.error(new Error("No response body from Grok"));
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

          controller.close();
          return;
        }

        // All keys exhausted
        const usage = lastError
          ? (() => { try { const p = JSON.parse(lastError); const m = p?.error?.message || ""; const u = m.match(/Used\s*(\d+)/i); const l = m.match(/Limit\s*(\d+)/i); return u && l ? ` (${u[1]}/${l[1]} tokens used today)` : ""; } catch { return ""; } })()
          : "";
        controller.error(new Error(`429 TPD${usage} — all Groq API keys exhausted. Try again later.`));
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

/**
 * Escapes literal newlines inside JSON string values while preserving
 * structural newlines. Models often output actual newlines inside the
 * "code" string instead of \n, which makes JSON.parse fail.
 */
function repairJSON(raw: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of raw) {
    if (esc) { out += ch; esc = false; continue; }
    if (ch === "\\") { out += ch; esc = true; continue; }
    if (ch === '"' && !esc) { inStr = !inStr; out += ch; continue; }
    if (inStr && (ch === "\n" || ch === "\r")) { out += "\\n"; continue; }
    out += ch;
  }
  return out;
}

/**
 * Calls Grok and parses the response as JSON.
 * Strips markdown code fences if present.
 * Attempts JSON repair on parse failure.
 */
export async function grokChatJSON<T>(messages: ChatMessage[], model = "llama-3.3-70b-versatile", maxTokens = 2048): Promise<T> {
  const text = await grokChat(messages, model, maxTokens);
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/\s*```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const repaired = repairJSON(cleaned);
    try {
      return JSON.parse(repaired) as T;
    } catch {
      throw new Error(`Failed to parse AI response as JSON. Raw response (first 500 chars): ${cleaned.slice(0, 500)}`);
    }
  }
}
