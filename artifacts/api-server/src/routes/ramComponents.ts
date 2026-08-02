import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

const baseDirs = [
  process.cwd(),
  (globalThis as { __dirname?: string }).__dirname ?? process.cwd(),
];

function loadRamComponents() {
  const paths: string[] = [];
  for (const dir of baseDirs) {
    paths.push(
      path.join(dir, "src/lib/sandbox/ram_components_data.json"),
      path.join(dir, "src/lib/sandbox/ram_components.json"),
      path.join(dir, "lib/sandbox/ram_components_data.json"),
      path.join(dir, "lib/sandbox/ram_components.json"),
      path.join(dir, "data/ram_components.json"),
    );
  }
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch {}
    }
  }
  return [];
}

router.get("/ram-components", (req, res) => {
  try {
    const components = loadRamComponents();
    return res.json({ components });
  } catch (e) { return res.status(500).json({ error: "Failed to load components" }); }
});

export default router;
