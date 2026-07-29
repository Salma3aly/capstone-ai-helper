import { Router } from "express";
import { readStore, writeStore } from "../lib/storage/db.js";
import { verifyToken } from "./auth.js";

const router = Router();

function getUser(req: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

interface SavedProject {
  id: string; userId: string; title: string; description?: string;
  category?: string; tags?: string[]; content?: unknown;
  createdAt: number; updatedAt: number;
}

router.get("/projects", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.json({ projects: [] });
  try {
    const all = await readStore<SavedProject[]>("user_projects");
    const projects = all.filter((p) => p.userId === user.id).sort((a, b) => b.updatedAt - a.updatedAt);
    return res.json({ projects });
  } catch { return res.json({ projects: [] }); }
});

router.post("/projects", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  try {
    const now = Date.now();
    const project: SavedProject = { id: `p_${now}`, userId: user.id, ...req.body, createdAt: now, updatedAt: now };
    const all = await readStore<SavedProject[]>("user_projects");
    all.push(project);
    await writeStore("user_projects", all);
    return res.json({ project });
  } catch { return res.status(500).json({ error: "Failed to create project" }); }
});

router.put("/projects/:id", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  try {
    const all = await readStore<SavedProject[]>("user_projects");
    const idx = all.findIndex((p) => p.id === req.params.id && p.userId === user.id);
    if (idx === -1) return res.status(404).json({ error: "Project not found" });
    all[idx] = { ...all[idx], ...req.body, updatedAt: Date.now() };
    await writeStore("user_projects", all);
    return res.json({ project: all[idx] });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/projects/:id", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  try {
    const all = await readStore<SavedProject[]>("user_projects");
    const filtered = all.filter((p) => !(p.id === req.params.id && p.userId === user.id));
    await writeStore("user_projects", filtered);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
