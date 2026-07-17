import { NextResponse } from "next/server";
import { grokChatJSON } from "@/lib/sandbox/grok";
import { COMPONENTS, BOARD_COMPONENTS } from "@/lib/sandbox/components";
import type { RecommendResponse } from "@/lib/sandbox/types";

const CATALOG_FOR_PROMPT = [...BOARD_COMPONENTS, ...COMPONENTS.filter((c) => c.category !== "Board")].map(
  (c) => ({ id: c.id, name: c.name, category: c.category, desc: c.desc })
);

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
- Choose the smallest number of sensors/actuators needed (usually 1-4) from the catalog
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
    const validSensorIds = (data.sensorIds || []).filter((id) => allIds.has(id));

    if (!validBoard) {
      console.warn("AI hallucinated boardId", { requested: data.boardId, valid: [...allIds].slice(0, 10) });
      return NextResponse.json({ error: "AI selected an invalid board. Try rephrasing your idea." }, { status: 500 });
    }

    if (validSensorIds.length !== (data.sensorIds || []).length) {
      const hallucinated = (data.sensorIds || []).filter((id) => !allIds.has(id));
      console.warn("AI hallucinated sensorIds", { hallucinated });
    }

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
