import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

function loadRamComponents() {
  const paths = [
    path.join(process.cwd(), "src/lib/sandbox/ram_components_data.json"),
    path.join(process.cwd(), "src/lib/sandbox/ram_components.json"),
    path.join(process.cwd(), "data/ram_components.json"),
  ];
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
