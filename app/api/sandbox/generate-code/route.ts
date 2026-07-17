import { NextRequest } from "next/server";
import { xaiChatStream } from "@/lib/sandbox/xai";
import { buildCodePrompt } from "@/lib/sandbox/prompts";

export async function POST(req: NextRequest) {
  try {
    const { idea, analysis, components, wiring } = await req.json();
    if (!idea || !wiring) {
      return new Response(JSON.stringify({ error: "Idea and wiring are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = xaiChatStream([
      {
        role: "system",
        content: "You are a senior full-stack developer generating working code. Return ONLY valid JSON. Follow all rules exactly.",
      },
      {
        role: "user",
        content: buildCodePrompt(
          idea,
          analysis ? JSON.stringify(analysis) : "{}",
          components ? JSON.stringify(components) : "{}",
          JSON.stringify(wiring)
        ),
      },
    ], 8192);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate code";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
