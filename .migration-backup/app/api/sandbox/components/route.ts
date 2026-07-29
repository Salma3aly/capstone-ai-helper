import { NextRequest, NextResponse } from "next/server";
import { xaiChatJSON } from "@/lib/sandbox/xai";
import { buildComponentsPrompt } from "@/lib/sandbox/prompts";
import type { ComponentRecommendation } from "@/lib/sandbox/types";

const BLANK_RE = /^(—|n\/?a|none|null|undefined)$/i;
const HW_ONLY_RE = /standalone|microcontroller|arduino|no web |no ui|embedded|raspberry\s*pi|esp32|esp8266|pico|hardware\b/i;

function isBlankOrPlaceholder(v: string): boolean {
  if (!v) return true;
  const val = v.trim().toLowerCase();
  return (
    val === "" ||
    val === "to be determined" ||
    val === "tbd" ||
    val === "—" ||
    val === "-" ||
    BLANK_RE.test(val)
  );
}

function validateStack(
  stack: ComponentRecommendation["suggested_stack"],
  idea: string,
  analysisStr: string
): void {
  const context = (idea + " " + analysisStr).toLowerCase();

  // Clean up any slash-separated lists first
  const fields = ["frontend", "backend", "database"] as const;
  for (const key of fields) {
    let val = stack[key]?.trim() || "";
    if (val.includes("/")) {
      stack[key] = val.split("/")[0].trim();
    }
  }

  // Check if it is a hardware-only project
  const isHwOnly =
    HW_ONLY_RE.test(context) ||
    (isBlankOrPlaceholder(stack.frontend) &&
      isBlankOrPlaceholder(stack.backend) &&
      isBlankOrPlaceholder(stack.database));

  if (isHwOnly) {
    stack.frontend = "Not applicable — standalone microcontroller project";
    stack.backend = "Not applicable — standalone microcontroller project";
    stack.database = "Not applicable — standalone microcontroller project";
    return;
  }

  // If not hardware-only, replace any remaining blank/placeholder fields with concrete fallbacks
  const fallbacks = {
    frontend: "Next.js (React)",
    backend: "Next.js API Routes (Node.js)",
    database: "SQLite",
  };

  for (const key of fields) {
    let val = stack[key]?.trim() || "";
    if (isBlankOrPlaceholder(val)) {
      stack[key] = fallbacks[key];
    }
  }
}

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

    if (components.suggested_stack) {
      validateStack(components.suggested_stack, idea, analysisStr);
    }

    return NextResponse.json({ components });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to recommend components";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
