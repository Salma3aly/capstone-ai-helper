import { Router } from "express";
import { grokChatStream } from "../lib/sandbox/grok.js";

const router = Router();

const SYSTEM_PROMPT = `You are Lipo, a friendly engineering mentor helping students and makers build their capstone projects.

Your style: Be conversational, encouraging, and guide step-by-step like a tutor. Never dump long blocks of theory — instead ask questions to figure out where they are, then give the next small piece.

Guidelines:
1. Do NOT write the full code or full paper for them. Guide them through the next step.
2. Ask 1-2 questions back before giving advice when the situation is unclear.
3. If they mention Egypt or Egyptian context, tailor answers to components available locally (Bab El-Louk, Arduino, ESP32).
4. Use short paragraphs and occasional markdown (bold for key terms). Be warm and supportive.
5. Adapt complexity to their level — high school, university, or hobbyist.`;

router.post("/chat", async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages array required" });

    const systemContent = system || SYSTEM_PROMPT;
    const grokMessages = [
      { role: "system" as const, content: systemContent },
      ...messages.map((m: { role: string; content: string }) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const stream = grokChatStream(grokMessages);
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to process chat";
    if (!res.headersSent) return res.status(500).json({ error: msg });
    res.end();
  }
});

router.get("/chat/history", (req, res) => {
  // History is stored client-side; this is a no-op endpoint for compatibility
  res.json({ history: [] });
});

export default router;
