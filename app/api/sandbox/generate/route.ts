import { NextResponse } from "next/server";
import { buildGeneratePrompt } from "@/lib/sandbox/prompts";
import { grokChatJSON } from "@/lib/sandbox/grok";
import { COMPONENTS, BOARD_COMPONENTS } from "@/lib/sandbox/components";
import { validateBuild } from "@/lib/sandbox/validate";
import type { GenerateResponse, ValidationIssue } from "@/lib/sandbox/types";

function detectLanguage(board: string): string {
  const lower = board.toLowerCase();
  if (lower.includes("rpi") && !lower.includes("pico")) return "Python (RPi.GPIO)";
  if (lower.includes("pico")) return "MicroPython";
  return "Arduino C++";
}

export async function POST(req: Request) {
  try {
    const { idea, boardId, sensorIds }: { idea: string; boardId: string; sensorIds: string[] } =
      await req.json();

    if (!idea || !boardId || !sensorIds || sensorIds.length === 0) {
      return NextResponse.json({ error: "Idea, board, and at least one sensor are required" }, { status: 400 });
    }

    // Resolve names from IDs for the prompt
    const boardComp = BOARD_COMPONENTS.find((c) => c.id === boardId);
    if (!boardComp) return NextResponse.json({ error: "Invalid board selection" }, { status: 400 });
    const boardName = boardComp.name;

    const sensorNames = sensorIds
      .map((id) => COMPONENTS.find((c) => c.id === id)?.name)
      .filter((n): n is string => !!n);

    // Run electrical validation
    const issues = validateBuild(boardId, sensorIds);
    const errors = issues.filter((i) => i.severity === "error");

    const language = detectLanguage(boardName);
    const prompt = buildGeneratePrompt(idea, boardName, sensorNames, language);
    const data = await grokChatJSON<GenerateResponse>([
      { role: "user", content: prompt },
    ]);

    return NextResponse.json({
      ...data,
      validation: issues,
      blocked: errors.length > 0,
    });
  } catch (error) {
    console.error("Generate API Error:", error);
    const msg = error instanceof Error && error.message.includes("429 TPD")
      ? "The AI service has reached its daily token limit. Please try again tomorrow or add more API keys."
      : error instanceof Error && error.message.includes("429")
        ? "AI service is busy. Please wait a moment and try again."
        : "Could not generate output. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
