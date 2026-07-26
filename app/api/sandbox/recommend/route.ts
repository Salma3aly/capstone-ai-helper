import { NextResponse } from "next/server";
import { grokChatJSON } from "@/lib/sandbox/grok";
import { COMPONENTS, BOARD_COMPONENTS } from "@/lib/sandbox/components";
import type { RecommendResponse } from "@/lib/sandbox/types";

const CATALOG_FOR_PROMPT = [...BOARD_COMPONENTS, ...COMPONENTS.filter((c) => c.category !== "Board")].map(
  (c) => ({ id: c.id, name: c.name, category: c.category, desc: c.desc })
);

// ─── Actuator detection ──────────────────────────────────────────────────────

const ACTION_KEYWORDS: { keyword: string; actuatorId: string }[] = [
  { keyword: "water", actuatorId: "water-pump" },
  { keyword: "pump", actuatorId: "water-pump" },
  { keyword: "irrigate", actuatorId: "water-pump" },
  { keyword: "sprinkler", actuatorId: "water-pump" },
  { keyword: "motor", actuatorId: "dc-motor" },
  { keyword: "rotate", actuatorId: "dc-motor" },
  { keyword: "spin", actuatorId: "dc-motor" },
  { keyword: "move", actuatorId: "servo-sg90" },
  { keyword: "open", actuatorId: "solenoid-lock" },
  { keyword: "close", actuatorId: "solenoid-lock" },
  { keyword: "lock", actuatorId: "solenoid-lock" },
  { keyword: "unlock", actuatorId: "solenoid-lock" },
  { keyword: "solenoid", actuatorId: "solenoid-lock" },
  { keyword: "valve", actuatorId: "solenoid-lock" },
  { keyword: "alarm", actuatorId: "buzzer" },
  { keyword: "buzzer", actuatorId: "buzzer" },
  { keyword: "beep", actuatorId: "buzzer" },
  { keyword: "sound", actuatorId: "buzzer" },
  { keyword: "heat", actuatorId: "relay" },
  { keyword: "cool", actuatorId: "relay" },
  { keyword: "fan", actuatorId: "dc-motor" },
  { keyword: "light", actuatorId: "led" },
  { keyword: "illuminate", actuatorId: "led" },
  { keyword: "glow", actuatorId: "led" },
  { keyword: "blink", actuatorId: "led" },
  { keyword: "display", actuatorId: "led" },
  { keyword: "show", actuatorId: "led" },
  { keyword: "vibrate", actuatorId: "vibration-motor" },
  { keyword: "shake", actuatorId: "vibration-motor" },
];

function findMissingActuatorsFromFeatures(coreFeatures: string[], sensorIds: string[]): string[] {
  const needed = new Set<string>();
  for (const feat of coreFeatures) {
    const lower = feat.toLowerCase();
    for (const entry of ACTION_KEYWORDS) {
      if (lower.includes(entry.keyword)) {
        if (!sensorIds.includes(entry.actuatorId)) {
          needed.add(entry.actuatorId);
        }
        break; // one actuator per feature is enough
      }
    }
  }
  return Array.from(needed);
}

function findMissingActuatorsFromNodes(nodes: { id: string; label: string; type: string }[], sensorIds: string[]): string[] {
  const needed = new Set<string>();
  for (const node of nodes) {
    const label = node.label.toLowerCase();
    // Map common actuator labels to component IDs
    if (label.includes("pump") || label.includes("water") && (label.includes("pump") || label.includes("pump"))) {
      if (!sensorIds.includes("water-pump")) needed.add("water-pump");
    }
    if (label.includes("motor") || label.includes("stepper")) {
      if (!sensorIds.includes("dc-motor")) needed.add("dc-motor");
    }
    if (label.includes("servo")) {
      if (!sensorIds.includes("servo-sg90")) needed.add("servo-sg90");
    }
    if (label.includes("solenoid") || label.includes("lock") || label.includes("valve")) {
      if (!sensorIds.includes("solenoid-lock")) needed.add("solenoid-lock");
    }
    if (label.includes("relay")) {
      if (!sensorIds.includes("relay")) needed.add("relay");
    }
    if (label.includes("led") || label.includes("light")) {
      if (!sensorIds.includes("led")) needed.add("led");
    }
    if (label.includes("buzzer") || label.includes("speaker") || label.includes("alarm")) {
      if (!sensorIds.includes("buzzer")) needed.add("buzzer");
    }
    if (label.includes("fan")) {
      if (!sensorIds.includes("dc-motor")) needed.add("dc-motor");
    }
  }
  return Array.from(needed);
}

function addRelayIfNeeded(sensorIds: string[]): string[] {
  const result = [...sensorIds];
  if ((result.includes("water-pump") || result.includes("solenoid-lock")) &&
      !result.includes("relay") && !result.includes("mosfet")) {
    result.push("relay");
  }
  return result;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { idea, analysis, components, wiring, title } = await req.json();

    if (!idea || typeof idea !== "string") {
      return NextResponse.json({ error: "Project idea is required" }, { status: 400 });
    }

    // Build rich project context for the AI
    let contextBlock = `Student idea: "${idea}"\n`;
    if (title) contextBlock += `\nProject title: "${title}"\n`;
    if (analysis) {
      contextBlock += `\nAnalysis:\n`;
      contextBlock += `  Problem: ${analysis.problem_statement || "N/A"}\n`;
      contextBlock += `  Target users: ${analysis.target_user || "N/A"}\n`;
      if (analysis.core_features?.length) {
        contextBlock += `  Core features: ${analysis.core_features.join(", ")}\n`;
      }
    }
    if (components) {
      contextBlock += `\nSoftware pages: ${components.pages?.map((p: any) => p.name).join(", ") || "N/A"}\n`;
      contextBlock += `Data models: ${components.data_models?.map((d: any) => d.name).join(", ") || "N/A"}\n`;
      if (components.integrations?.length) {
        contextBlock += `External integrations: ${components.integrations.map((i: any) => i.name).join(", ")}\n`;
      }
    }
    if (wiring?.nodes?.length) {
      const nodeTypes = [...new Set(wiring.nodes.map((n: any) => n.type))];
      contextBlock += `\nArchitecture components: ${wiring.nodes.map((n: any) => n.label).join(", ")}\n`;
      contextBlock += `Node types in use: ${nodeTypes.join(", ")}\n`;
    }

    const prompt = `You are an expert hardware mentor selecting from a FIXED catalog.
You must only return componentIds that exist in this list — never invent names or IDs.

Catalog:
${JSON.stringify(CATALOG_FOR_PROMPT, null, 2)}

Project context:
${contextBlock}
Rules:
- Choose exactly ONE board from the catalog (category "Board")
- Choose sensors AND actuators needed to implement ALL core features. Do NOT omit actuators.
- If the core features include action verbs like: water, pump, irrigate, sprinkler, motor, rotate, spin, move, lock, unlock, solenoid, valve, alarm, buzzer, heat, cool, fan, light, illuminate, blink, display, vibrate — include the matching actuator from the catalog.
- Example: "automated watering" → include "water-pump". "motion detection" → include a motion sensor. "lock/unlock door" → include "solenoid-lock". "temperature control" → include "relay" for heater/cooler.
- Prioritise simplicity and match the student's stated goal
- Prefer ESP32 for IoT/wireless projects, Arduino Uno for standard local sensor projects
- If the project involves displays or real-time output, include an Output & Display module
- If the project mentions environmental monitoring, include an Environmental sensor
- Return ONLY raw JSON. No markdown, no backticks, no explanation.

Return format:
{
  "boardId": "component-id-from-catalog",
  "sensorIds": ["component-id-1", "component-id-2"],
  "why": "One friendly student-facing sentence explaining why these components work for their idea."
}`;

    const data = await grokChatJSON<RecommendResponse>([
      { role: "user", content: prompt },
    ]);

    // Validate returned IDs against catalog
    const allIds = new Set(COMPONENTS.map((c) => c.id));
    const validBoard = allIds.has(data.boardId);
    let validSensorIds = (data.sensorIds || []).filter((id) => allIds.has(id));

    if (!validBoard) {
      console.warn("AI hallucinated boardId", { requested: data.boardId, valid: [...allIds].slice(0, 10) });
      return NextResponse.json({ error: "AI selected an invalid board. Try rephrasing your idea." }, { status: 500 });
    }

    if (validSensorIds.length !== (data.sensorIds || []).length) {
      const hallucinated = (data.sensorIds || []).filter((id) => !allIds.has(id));
      console.warn("AI hallucinated sensorIds", { hallucinated });
    }

    // ── Post-processing: auto-inject missing actuators ────────────────

    // Step 1: Check analysis.core_features for action keywords
    if (analysis?.core_features?.length) {
      const missing = findMissingActuatorsFromFeatures(analysis.core_features, validSensorIds);
      for (const id of missing) {
        if (allIds.has(id) && !validSensorIds.includes(id)) {
          validSensorIds.push(id);
        }
      }
    }

    // Step 2: Check wiring.nodes for actuator-like labels
    if (wiring?.nodes?.length) {
      const missing = findMissingActuatorsFromNodes(wiring.nodes, validSensorIds);
      for (const id of missing) {
        if (allIds.has(id) && !validSensorIds.includes(id)) {
          validSensorIds.push(id);
        }
      }
    }

    // Step 3: Ensure relay/mosfet driver for high-power actuators
    validSensorIds = addRelayIfNeeded(validSensorIds);

    return NextResponse.json({
      boardId: data.boardId,
      sensorIds: validSensorIds,
      why: data.why || "These components are a great fit for your project idea.",
    });
  } catch (error) {
    console.error("Recommend API Error:", error);
    const msg = error instanceof Error && error.message.includes("429 TPD")
      ? `The AI service has reached its daily token limit (${(process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "").split(",").filter(Boolean).length} key(s) configured). Please try again tomorrow or add more API keys.`
      : error instanceof Error && error.message.includes("429")
        ? "AI service is busy. Please wait a moment and try again."
        : "Could not get recommendations. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
