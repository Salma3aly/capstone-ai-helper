import { NextRequest, NextResponse } from "next/server";
import { xaiChatJSON } from "@/lib/sandbox/xai";
import { buildAnalyzePrompt } from "@/lib/sandbox/prompts";
import type { IdeaAnalysis } from "@/lib/sandbox/types";

export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json();
    if (!idea || typeof idea !== "string") {
      return NextResponse.json({ error: "Idea is required" }, { status: 400 });
    }

    const analysis = await xaiChatJSON<IdeaAnalysis>(
      [
        { role: "system", content: "You are a senior software architect. Always return valid JSON." },
        { role: "user", content: buildAnalyzePrompt(idea) },
      ],
      2048
    );

    return NextResponse.json({ analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to analyze idea";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
