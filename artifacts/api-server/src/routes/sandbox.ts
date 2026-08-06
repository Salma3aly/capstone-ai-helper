import { Router } from "express";
import { xaiChatJSON, xaiChatStream, getModel } from "../lib/sandbox/xai.js";
import { buildAnalyzePrompt, buildComponentsPrompt, buildWiringPrompt, buildCodePrompt, buildGeneratePrompt } from "../lib/sandbox/prompts.js";
import { COMPONENTS, BOARD_COMPONENTS } from "../lib/sandbox/components.js";
import { validateBuild } from "../lib/sandbox/validate.js";
import { findMissingControlLogic, findCoreFeaturesMissingActuators, findActuatorNodesMissingFromHardware } from "../lib/sandbox/actuators.js";
import { enforceDriverWiring, correctPinsInCode, validatePins, checkPinMismatch, checkDriverPresence, fixPowerWiring, removeUnusedConstants, checkPlaceholderPins, assignDefaultWiringPins } from "../lib/sandbox/pins.js";
import { readStore, writeStore } from "../lib/storage/db.js";
import { verifyToken } from "./auth.js";
import type { SandboxProject, GenerateResponse, ValidationIssue } from "../lib/sandbox/types.js";

const router = Router();

function getUser(req: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

// ─── AI Endpoints ─────────────────────────────────────────────────────────

router.post("/sandbox/analyze", async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea) return res.status(400).json({ error: "Idea is required" });
    const analysis = await xaiChatJSON(
      [{ role: "system", content: "You are a senior software architect. Always return valid JSON." }, { role: "user", content: buildAnalyzePrompt(idea) }],
      2048
    );
    return res.json({ analysis });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" }); }
});

router.post("/sandbox/components", async (req, res) => {
  try {
    const { idea, analysis } = req.body;
    if (!idea || !analysis) return res.status(400).json({ error: "idea and analysis required" });
    const analysisStr = typeof analysis === "string" ? analysis : JSON.stringify(analysis);
    const components = await xaiChatJSON(
      [{ role: "system", content: "You are a hardware engineer. Always return valid JSON." }, { role: "user", content: buildComponentsPrompt(idea, analysisStr) }],
      3000
    );
    return res.json({ components });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" }); }
});

router.post("/sandbox/wiring", async (req, res) => {
  try {
    const { idea, components } = req.body;
    if (!idea || !components) return res.status(400).json({ error: "idea and components required" });
    const componentsStr = typeof components === "string" ? components : JSON.stringify(components);
    const wiring = await xaiChatJSON(
      [{ role: "system", content: "You are a hardware engineer. Always return valid JSON." }, { role: "user", content: buildWiringPrompt(idea, componentsStr) }],
      3000
    );
    return res.json({ wiring });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" }); }
});

router.post("/sandbox/generate-code", async (req, res): Promise<void> => {
  try {
    const { idea, wiring } = req.body;
    if (!idea) { res.status(400).json({ error: "idea required" }); return; }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    const wiringStr = wiring ? (typeof wiring === "string" ? wiring : JSON.stringify(wiring)) : "";
    const stream = xaiChatStream(
      [{ role: "system", content: "You are an expert programmer. Generate complete, working code." }, { role: "user", content: buildCodePrompt(idea, wiringStr) }],
      4096
    );
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) { res.status(500).json({ error: e instanceof Error ? e.message : "Failed" }); return; }
    res.end();
  }
});

function detectLanguage(board: string): string {
  const lower = board.toLowerCase();
  if (lower.includes("rpi") && !lower.includes("pico")) return "Python (RPi.GPIO)";
  if (lower.includes("pico")) return "MicroPython";
  return "Arduino C++";
}

router.post("/sandbox/generate", async (req, res) => {
  try {
    const { idea, boardId, sensorIds, sensorDisplayNames, analysis, architectureNodes }: {
      idea: string; boardId: string; sensorIds: string[]; sensorDisplayNames?: string[];
      analysis?: { core_features?: string[] } | null;
      architectureNodes?: { id: string; label: string }[];
    } = req.body;

    if (!idea || !boardId || !sensorIds || sensorIds.length === 0) {
      return res.status(400).json({ error: "Idea, board, and at least one sensor are required" });
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
    if (!boardComp) return res.status(400).json({ error: "Invalid board selection" });
    const boardName = boardComp.name;

    // Use explicit display names if provided, otherwise fall back to catalog lookup
    const sensorNames = sensorDisplayNames && sensorDisplayNames.length === sensorIds.length
      ? sensorDisplayNames
      : sensorIds
          .map((id) => COMPONENTS.find((c) => c.id === id)?.name ?? id);

    const language = detectLanguage(boardName);
    const prompt = buildGeneratePrompt(idea, boardName, sensorNames, language);
    const data = await xaiChatJSON<GenerateResponse>([
      { role: "user", content: prompt },
    ], 4096);

    // Enforce driver module and correct pin numbers in generated code

    // Enforce driver module and correct pin numbers in generated code
    if (data.wiring) {
      data.wiring = enforceDriverWiring(data.wiring);
      // Fix power wiring: prevent VCC/GND mapped to numbered GPIO pins
      data.wiring = fixPowerWiring(data.wiring);
      // Replace placeholder pin references (PIN, TODO, X, constant names) with real pin numbers
      data.wiring = assignDefaultWiringPins(data.wiring);
      // Driver presence self-check — hard block if any actuator lacks a driver
      const driverErrors = checkDriverPresence(data.wiring);
      if (driverErrors.length > 0) {
        return res.status(422).json({
          error: driverErrors.join(" "),
          blocked: true,
        });
      }
      if (data.code) {
        data.code = correctPinsInCode(data.wiring, data.code);
        // Hard validation: pin mismatch blocks generation
        const pinErrors = checkPinMismatch(data.wiring, data.code);
        if (pinErrors.length > 0) {
          return res.status(422).json({
            error: `Pin mismatch detected after auto-correction: ${pinErrors.join("; ")}. Please regenerate.`,
            blocked: true,
          });
        }
        // Hard validation: placeholder pin values (PIN, TODO, etc.) block generation
        const placeholderErrors = checkPlaceholderPins(data.code);
        if (placeholderErrors.length > 0) {
          return res.status(422).json({
            error: placeholderErrors.join("; "),
            blocked: true,
          });
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

    return res.json({
      ...data,
      validation: issues,
      blocked: errors.length > 0,
    });
  } catch (e) {
    console.error("Generate API Error:", e);
    const keyCount = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "").split(",").filter(Boolean).length;
    const msg = e instanceof Error && e.message.includes("429 TPD")
      ? `The AI service has reached its daily token limit (${keyCount} key(s) configured). Please try again tomorrow or add more API keys.`
      : e instanceof Error && e.message.includes("429")
        ? "AI service is busy. Please wait a moment and try again."
        : e instanceof Error
          ? e.message
          : "Could not generate output. Please try again.";
    return res.status(500).json({ error: msg });
  }
});

router.post("/sandbox/recommend", async (req, res) => {
  try {
    const body = req.body;
    const result = await xaiChatJSON(
      [{ role: "system", content: "You are a hardware engineer. Return valid JSON." }, { role: "user", content: `Recommend hardware components for this project. Return JSON with recommendations. Request: ${JSON.stringify(body)}` }],
      2048
    );
    return res.json(result);
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" }); }
});

// ─── Projects CRUD ────────────────────────────────────────────────────────

interface StoredSandbox extends SandboxProject { userId: string; }

router.get("/sandbox/projects", async (req, res) => {
  const user = getUser(req);
  try {
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    if (user) {
      const userProjects = projects.filter((p) => p.userId === user.id).sort((a, b) => b.updatedAt - a.updatedAt);
      return res.json({ projects: userProjects });
    }
    return res.json({ projects: [] });
  } catch { return res.json({ projects: [] }); }
});

router.get("/sandbox/projects/:id", async (req, res) => {
  try {
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    return res.json({ project });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/sandbox/projects", async (req, res) => {
  const user = getUser(req);
  try {
    const body = req.body;
    const now = Date.now();
    const project: StoredSandbox = {
      id: now.toString(), userId: user?.id || "anonymous",
      title: body.title || "Untitled Project", rawIdea: body.rawIdea || "",
      stage: "idea", analysis: null, components: null, wiring: null, code: null,
      createdAt: now, updatedAt: now,
    };
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    projects.push(project);
    await writeStore("sandbox_projects", projects);
    return res.json({ project });
  } catch { return res.status(500).json({ error: "Failed to create project" }); }
});

router.put("/sandbox/projects", async (req, res) => {
  try {
    const { id, ...data } = req.body;
    if (!id) return res.status(400).json({ error: "Project ID required" });
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Project not found" });
    projects[idx] = { ...projects[idx], ...data, updatedAt: Date.now() };
    await writeStore("sandbox_projects", projects);
    return res.json({ project: projects[idx] });
  } catch { return res.status(500).json({ error: "Failed to update project" }); }
});

router.delete("/sandbox/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    const filtered = projects.filter((p) => p.id !== id);
    await writeStore("sandbox_projects", filtered);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: "Failed to delete project" }); }
});

router.delete("/sandbox/projects", async (req, res) => {
  try {
    const id = (req.query.id as string) || req.body.id;
    if (!id) return res.status(400).json({ error: "Project ID required" });
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    const filtered = projects.filter((p) => p.id !== id);
    await writeStore("sandbox_projects", filtered);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: "Failed to delete project" }); }
});

export default router;
