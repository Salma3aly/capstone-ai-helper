import { NextRequest, NextResponse } from "next/server";
import { xaiChatJSON } from "@/lib/sandbox/xai";
import { buildWiringPrompt } from "@/lib/sandbox/prompts";
import type { WiringDiagram } from "@/lib/sandbox/types";

export async function POST(req: NextRequest) {
  try {
    const { idea, components } = await req.json();
    if (!idea || !components) {
      return NextResponse.json({ error: "Idea and components are required" }, { status: 400 });
    }

    const componentsStr = JSON.stringify(components, null, 2);

    const wiring = await xaiChatJSON<WiringDiagram>(
      [
        { role: "system", content: "You are a senior software architect. Always return valid JSON." },
        { role: "user", content: buildWiringPrompt(idea, componentsStr) },
      ],
      2048
    );

    return NextResponse.json({ wiring });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate wiring";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
