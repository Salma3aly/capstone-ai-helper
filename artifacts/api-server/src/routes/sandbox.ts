import { Router } from "express";
import { xaiChatJSON, xaiChatStream, getModel } from "../lib/sandbox/xai.js";
import { buildAnalyzePrompt, buildComponentsPrompt, buildWiringPrompt, buildCodePrompt } from "../lib/sandbox/prompts.js";
import { readStore, writeStore } from "../lib/storage/db.js";
import { verifyToken } from "./auth.js";
import type { SandboxProject } from "../lib/sandbox/types.js";

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

router.post("/sandbox/generate-code", async (req, res) => {
  try {
    const { idea, wiring } = req.body;
    if (!idea) return res.status(400).json({ error: "idea required" });

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
    if (!res.headersSent) return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
    res.end();
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
