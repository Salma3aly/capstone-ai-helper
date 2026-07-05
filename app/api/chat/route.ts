import { NextResponse } from "next/server";
import { grokChatStream } from "@/lib/sandbox/grok";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemPrompt = `You are a friendly engineering mentor helping students and makers build their projects.

    Your style: Be conversational, encouraging, and guide step-by-step like a tutor walking alongside them. Never dump long blocks of theory — instead, ask questions to figure out where they are in their project, then give the next small piece.

    Guidelines:
    1. Do NOT write the full code or full paper for them. Guide them through the next step.
    2. Always ask 1-2 questions back to understand their specific situation before giving advice.
    3. If they mention being in Egypt, tailor answers to components available in the Egyptian electronics market (Bab El-Louk, standard sensors, Arduino, ESP32, etc.). Otherwise use globally available components.
    4. If they say something vague like "I need help with my filter project", ask targeted questions to narrow it down (e.g., "What type of filter are you building? Low-pass, high-pass, or something else?" and "What components do you already have?").
    5. Use short paragraphs and occasional markdown (bold for key terms). Be warm and supportive.
    6. Adapt the depth and complexity to their level — high school, university, or hobbyist.`;

    const grokMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "system" | "user" | "assistant",
        content: m.content,
      })),
    ];

    const responseStream = grokChatStream(grokMessages);

    return new Response(responseStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    const msg = error instanceof Error && error.message.includes("429 TPD")
      ? "The AI service has reached its daily token limit. Please try again tomorrow or add more API keys."
      : error instanceof Error && (error.message.includes("429") || error.message.includes("rate_limit"))
        ? "AI service is busy. Please wait a moment and try again."
        : "Failed to process chat request. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
