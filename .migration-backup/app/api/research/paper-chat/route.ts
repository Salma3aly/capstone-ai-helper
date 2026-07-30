import { grokChatStream } from "@/lib/sandbox/grok";
import { getUserFromRequest } from "@/lib/research/auth";
import { checkRateLimit, getClientKey } from "@/lib/research/rate-limit";

export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    const clientKey = getClientKey(req, user?.id);
    const rate = checkRateLimit(`paper-chat:${clientKey}`, 30, 60 * 60 * 1000);
    if (!rate.ok) {
      return new Response(`Rate limit reached. Try again in ${rate.retryAfterSec} seconds.`, {
        status: 429,
      });
    }

    const { messages, paperContext, userMessage } = await req.json();

    if (!paperContext || typeof paperContext !== "string") {
      return new Response("Paper context is required.", { status: 400 });
    }

    const systemPrompt = `You are an AI Paper Tutor helping students and makers understand ONE specific research paper.

Paper text (excerpt):
"""
${paperContext.slice(0, 4000)}
"""

Guidelines:
1. Answer ONLY based on the paper text above. If something is not in the text, say so.
2. Use simple, encouraging language. Define jargon when you use it.
3. Do NOT write the student's capstone report for them — help them understand and apply ideas.
4. Suggest how findings might relate to a capstone project when asked, but remind them to verify facts.
5. Keep answers concise (2-4 short paragraphs max).`;

    const history = Array.isArray(messages)
      ? messages
          .filter((m: { role?: string; content?: string }) => m?.content)
          .slice(-10)
          .map((m: { role: string; content: string }) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
            content: m.content,
          }))
      : [];

    const grokMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history,
      ...(userMessage && typeof userMessage === "string"
        ? [{ role: "user" as const, content: userMessage }]
        : history.length === 0
          ? [
              {
                role: "user" as const,
                content:
                  "I've just analyzed this research paper. Can you help me understand the key concepts in simple terms?",
              },
            ]
          : []),
    ];

    const responseStream = grokChatStream(grokMessages, "llama-3.3-70b-versatile", 2048);

    return new Response(responseStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Paper chat API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return new Response(message, { status: 500 });
  }
}
