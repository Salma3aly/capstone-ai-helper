import { grokChatStream } from "@/lib/sandbox/grok";

export async function POST(req: Request) {
  try {
    const { messages, projectContext } = await req.json();

    if (!projectContext || typeof projectContext !== "object") {
      return new Response("Project context is required.", { status: 400 });
    }

    const { idea, analysis, components, wiring, code, board, sensors } = projectContext;

    const contextParts: string[] = [];
    if (idea) contextParts.push(`## Project Idea\n${idea}`);
    if (analysis) {
      contextParts.push(`## Analysis\n${typeof analysis === "string" ? analysis : JSON.stringify(analysis, null, 2)}`);
    }
    if (components) {
      contextParts.push(`## Components / Architecture\n${typeof components === "string" ? components : JSON.stringify(components, null, 2)}`);
    }
    if (wiring) {
      contextParts.push(`## Wiring / Data Connections\n${typeof wiring === "string" ? wiring : JSON.stringify(wiring, null, 2)}`);
    }
    if (board) contextParts.push(`## Hardware Board\n${board}`);
    if (sensors?.length) contextParts.push(`## Hardware Sensors / Modules\n${sensors.join(", ")}`);
    if (code) {
      const codeStr = typeof code === "string" ? code : JSON.stringify(code, null, 2);
      contextParts.push(`## Generated Code\n${codeStr.slice(0, 3000)}`);
    }

    const contextBlock = contextParts.join("\n\n");

    const systemPrompt = `You are an AI Tutor helping a student understand their capstone project. You have access to their full project context below.

Project Context:
"""
${contextBlock}
"""

Guidelines:
1. Answer questions about the project idea, architecture, components, wiring, and code.
2. Use simple, encouraging language. Define technical terms when you use them.
3. Explain HOW and WHY things work — not just what they are.
4. If asked about code, explain the logic, point out important patterns, and suggest improvements.
5. If asked about hardware wiring, explain signal flow, power requirements, and pin connections.
6. Do NOT write the student's full project for them — help them understand and make decisions.
7. Keep answers concise (2-4 short paragraphs max).
8. If something is not in the project context, say so rather than making it up.`;

    const history = Array.isArray(messages)
      ? messages
          .filter((m: { role?: string; content?: string }) => m?.content)
          .slice(-10)
          .map((m: { role: string; content: string }) => ({
            role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
            content: m.content,
          }))
      : [];

    const lastUserMsg = history.filter((m) => m.role === "user").pop();

    const grokMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history,
      ...(!lastUserMsg
        ? [
            {
              role: "user" as const,
              content:
                "I've just started working on my capstone project. Can you help me understand what I'm building and explain the key concepts in simple terms?",
            },
          ]
        : []),
    ];

    const responseStream = grokChatStream(grokMessages, "llama-3.3-70b-versatile", 2048);

    return new Response(responseStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Sandbox tutor chat API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return new Response(message, { status: 500 });
  }
}
