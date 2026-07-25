import { NextResponse } from "next/server";
import { buildGeneratePrompt } from "@/lib/sandbox/prompts";
import { grokChatJSON } from "@/lib/sandbox/grok";
import { COMPONENTS, BOARD_COMPONENTS } from "@/lib/sandbox/components";
import { validateBuild } from "@/lib/sandbox/validate";
import { findMissingControlLogic } from "@/lib/sandbox/actuators";
import { enforceDriverWiring, correctPinsInCode, validatePins, checkPinMismatch, checkDriverPresence } from "@/lib/sandbox/pins";
import type { GenerateResponse, ValidationIssue } from "@/lib/sandbox/types";

function detectLanguage(board: string): string {
  const lower = board.toLowerCase();
  if (lower.includes("rpi") && !lower.includes("pico")) return "Python (RPi.GPIO)";
  if (lower.includes("pico")) return "MicroPython";
  return "Arduino C++";
}

export async function POST(req: Request) {
  try {
    const { idea, boardId, sensorIds, sensorDisplayNames }: { idea: string; boardId: string; sensorIds: string[]; sensorDisplayNames?: string[] } =
      await req.json();

    if (!idea || !boardId || !sensorIds || sensorIds.length === 0) {
      return NextResponse.json({ error: "Idea, board, and at least one sensor are required" }, { status: 400 });
    }

    // Resolve names from IDs for the prompt
    const boardComp = BOARD_COMPONENTS.find((c) => c.id === boardId);
    if (!boardComp) return NextResponse.json({ error: "Invalid board selection" }, { status: 400 });
    const boardName = boardComp.name;

    // Use explicit display names if provided, otherwise fall back to catalog lookup
    const sensorNames = sensorDisplayNames && sensorDisplayNames.length === sensorIds.length
      ? sensorDisplayNames
      : sensorIds
          .map((id) => COMPONENTS.find((c) => c.id === id)?.name ?? id);

    // Run electrical validation
    const issues = validateBuild(boardId, sensorIds);
    const errors = issues.filter((i) => i.severity === "error");

    const language = detectLanguage(boardName);
    const prompt = buildGeneratePrompt(idea, boardName, sensorNames, language);
    const data = await grokChatJSON<GenerateResponse>([
      { role: "user", content: prompt },
    ]);

    // Enforce driver module and correct pin numbers in generated code
    if (data.wiring) {
      data.wiring = enforceDriverWiring(data.wiring);
      // Driver presence self-check — hard block if any actuator lacks a driver
      const driverErrors = checkDriverPresence(data.wiring);
      if (driverErrors.length > 0) {
        return NextResponse.json({
          error: driverErrors.join(" "),
          blocked: true,
        }, { status: 422 });
      }
      if (data.code) {
        data.code = correctPinsInCode(data.wiring, data.code);
        // Hard validation: pin mismatch blocks generation
        const pinErrors = checkPinMismatch(data.wiring, data.code);
        if (pinErrors.length > 0) {
          return NextResponse.json({
            error: `Pin mismatch detected after auto-correction: ${pinErrors.join("; ")}. Please regenerate.`,
            blocked: true,
          }, { status: 422 });
        }
        // Soft warnings for remaining mismatches
        const pinWarnings = validatePins(data.wiring, data.code);
        pinWarnings.forEach(msg => {
          issues.push({
            severity: "warning",
            message: msg
          });
        });
      }
    }

    // Self-check: verify generated code has control logic for every actuator in wiring
    const missingControl = data.wiring && data.code
      ? findMissingControlLogic(data.code, data.wiring)
      : [];
    if (missingControl.length > 0) {
      issues.push({
        severity: "warning",
        message: `Generated code lacks control logic for: ${missingControl.join(", ")}. It reads sensors but does not drive these outputs.`,
        componentId: missingControl[0],
      });
    }

    return NextResponse.json({
      ...data,
      validation: issues,
      blocked: errors.length > 0,
    });
  } catch (error) {
    console.error("Generate API Error:", error);
    const keyCount = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "").split(",").filter(Boolean).length;
    const msg = error instanceof Error && error.message.includes("429 TPD")
      ? `The AI service has reached its daily token limit (${keyCount} key(s) configured). Please try again tomorrow or add more API keys.`
      : error instanceof Error && error.message.includes("429")
        ? "AI service is busy. Please wait a moment and try again."
        : error instanceof Error
          ? error.message
          : "Could not generate output. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
