import { NextResponse } from "next/server";
import { buildGeneratePrompt } from "@/lib/sandbox/prompts";
import { grokChatJSON } from "@/lib/sandbox/grok";
import { COMPONENTS, BOARD_COMPONENTS } from "@/lib/sandbox/components";
import { validateBuild } from "@/lib/sandbox/validate";
import { findMissingControlLogic, findCoreFeaturesMissingActuators, findActuatorNodesMissingFromHardware } from "@/lib/sandbox/actuators";
import { enforceDriverWiring, correctPinsInCode, validatePins, checkPinMismatch, checkDriverPresence, fixPowerWiring, removeUnusedConstants, checkPlaceholderPins } from "@/lib/sandbox/pins";
import type { GenerateResponse, ValidationIssue } from "@/lib/sandbox/types";

function detectLanguage(board: string): string {
  const lower = board.toLowerCase();
  if (lower.includes("rpi") && !lower.includes("pico")) return "Python (RPi.GPIO)";
  if (lower.includes("pico")) return "MicroPython";
  return "Arduino C++";
}

export async function POST(req: Request) {
  try {
    const { idea, boardId, sensorIds, sensorDisplayNames, analysis, architectureNodes }: {
      idea: string; boardId: string; sensorIds: string[]; sensorDisplayNames?: string[];
      analysis?: { core_features?: string[] } | null;
      architectureNodes?: { id: string; label: string }[];
    } = await req.json();

    if (!idea || !boardId || !sensorIds || sensorIds.length === 0) {
      return NextResponse.json({ error: "Idea, board, and at least one sensor are required" }, { status: 400 });
    }

    // Run electrical validation
    const issues: ValidationIssue[] = validateBuild(boardId, sensorIds);

    // Validate hardware selection against analysis and architecture nodes
    if (analysis?.core_features?.length) {
      const missingFromFeatures = findCoreFeaturesMissingActuators(analysis.core_features, sensorIds);
      for (const m of missingFromFeatures) {
        issues.push({
          severity: "warning",
          message: `Your project's core feature "${m.feature}" implies a ${m.suggestedComponentId.replace(/-/g, " ")}, but it's not in your hardware selection. Only sensors will be used — no actuator control will be generated.`,
        });
      }
    }
    if (architectureNodes?.length) {
      const missingFromNodes = findActuatorNodesMissingFromHardware(architectureNodes, sensorIds);
      for (const m of missingFromNodes) {
        issues.push({
          severity: "warning",
          message: `Your architecture diagram includes "${m.label}" (detected as ${m.suggestedComponentId.replace(/-/g, " ")}), but it's not in your hardware selection. Add it to enable automated control, or it will be left out of the generated code.`,
        });
      }
    }

    const errors = issues.filter((i) => i.severity === "error");

    // Resolve names from IDs for the prompt
    const boardComp = BOARD_COMPONENTS.find((c) => c.id === boardId);
    if (!boardComp) return NextResponse.json({ error: "Invalid board selection" }, { status: 400 });
    const boardName = boardComp.name;

    // Use explicit display names if provided, otherwise fall back to catalog lookup
    const sensorNames = sensorDisplayNames && sensorDisplayNames.length === sensorIds.length
      ? sensorDisplayNames
      : sensorIds
          .map((id) => COMPONENTS.find((c) => c.id === id)?.name ?? id);

    const language = detectLanguage(boardName);
    const prompt = buildGeneratePrompt(idea, boardName, sensorNames, language);
    const data = await grokChatJSON<GenerateResponse>([
      { role: "user", content: prompt },
    ]);

    // Enforce driver module and correct pin numbers in generated code
    if (data.wiring) {
      data.wiring = enforceDriverWiring(data.wiring);
      // Fix power wiring: prevent VCC/GND mapped to numbered GPIO pins
      data.wiring = fixPowerWiring(data.wiring);
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
        // Hard validation: placeholder pin values (PIN, TODO, etc.) block generation
        const placeholderErrors = checkPlaceholderPins(data.code);
        if (placeholderErrors.length > 0) {
          return NextResponse.json({
            error: placeholderErrors.join("; "),
            blocked: true,
          }, { status: 422 });
        }
        // Remove any declared constants that are never used in setup()/loop()
        data.code = removeUnusedConstants(data.code);
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
