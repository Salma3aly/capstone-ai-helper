import { NextRequest, NextResponse } from "next/server";
import { xaiChatJSON } from "@/lib/sandbox/xai";
import { buildComponentsPrompt } from "@/lib/sandbox/prompts";
import type { ComponentRecommendation } from "@/lib/sandbox/types";

export async function POST(req: NextRequest) {
  try {
    const { idea, analysis } = await req.json();
    if (!idea || !analysis) {
      return NextResponse.json({ error: "Idea and analysis are required" }, { status: 400 });
    }

    const analysisStr = JSON.stringify(analysis, null, 2);

    const components = await xaiChatJSON<ComponentRecommendation>(
      [
        { role: "system", content: "You are a senior software architect. Always return valid JSON." },
        { role: "user", content: buildComponentsPrompt(idea, analysisStr) },
      ],
      2048
    );

    return NextResponse.json({ components });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to recommend components";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
