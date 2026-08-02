import { Router } from "express";
import multer from "multer";
import { grokChatJSON, grokChatStream } from "../lib/sandbox/grok.js";
import { extractTextFromPdf } from "../lib/research/pdf-extract.js";
import { readStore, writeStore } from "../lib/storage/db.js";
import { verifyToken } from "./auth.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();

function getUser(req: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

const SUMMARIZE_PROMPT = (text: string) => `You are an expert research analyst helping a student understand an academic paper for their capstone project.

Analyze this paper and return a JSON object with exactly these fields:
{
  "overview": "2-3 sentence plain-language summary",
  "objective": "What was the main research goal?",
  "methodology": "How did they conduct the research?",
  "findings": "What were the key results?",
  "capstoneJustification": "Why is this paper relevant for a student's capstone project?",
  "keyPoints": ["point1", "point2", "point3"],
  "limitations": "What are the study's limitations?",
  "futureWork": "What future research directions are suggested?"
}

Paper text:
${text.slice(0, 12000)}`;

router.post("/research/summarize", async (req, res) => {
  try {
    const { text, url, topic } = req.body;
    const content = text || topic || "";
    if (!content) return res.status(400).json({ error: "Text or topic required" });
    const summary = await grokChatJSON(
      [{ role: "system", content: "You are a research analyst. Return valid JSON only." }, { role: "user", content: SUMMARIZE_PROMPT(content) }],
      "llama-3.3-70b-versatile",
      5000
    );
    return res.json({ summary });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" }); }
});

router.post("/research/fetch-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL required" });
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return res.status(400).json({ error: `Failed to fetch URL: ${response.status}` });
    const text = await response.text();
    // Strip HTML tags
    const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 20000);
    return res.json({ text: stripped, url });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to fetch URL" }); }
});

router.post("/research/extract-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "PDF file required" });
    const text = extractTextFromPdf(req.file.buffer);
    if (!text || text.trim().length < 50) {
      return res.status(422).json({ error: "Could not extract text from this PDF. It may be image-based (scanned) or encrypted." });
    }
    return res.json({ text: text.slice(0, 20000), source: "pdf" });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to extract PDF" }); }
});

router.post("/research/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });
    // Search Semantic Scholar API
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=title,authors,year,abstract,url,openAccessPdf`;
    const r = await fetch(url, { headers: { "User-Agent": "Capstone-App/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Semantic Scholar error: ${r.status}`);
    const data = await r.json() as { data?: unknown[] };
    return res.json({ papers: data.data || [] });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to search" }); }
});

router.get("/research/papers", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query required" });
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query as string)}&limit=10&fields=title,authors,year,abstract,url,openAccessPdf`;
    const r = await fetch(url, { headers: { "User-Agent": "Capstone-App/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Error: ${r.status}`);
    const data = await r.json() as { data?: unknown[] };
    return res.json({ papers: data.data || [] });
  } catch (e) { return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" }); }
});

router.post("/research/paper-chat", async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages) return res.status(400).json({ error: "Messages required" });
    const systemContent = context
      ? `You are a research assistant helping a student understand this paper for their capstone project. Paper context:\n\n${context.slice(0, 8000)}`
      : "You are a research assistant helping students understand academic papers for their capstone projects.";
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    const stream = grokChatStream([
      { role: "system", content: systemContent },
      ...messages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ]);
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

// ─── Research sessions ─────────────────────────────────────────────────────

router.get("/research", async (req, res) => {
  const user = getUser(req);
  if (!user) return res.json({ sessions: [] });
  try {
    const sessions = await readStore<Array<{ userId: string }[]>>("research_sessions");
    const userSessions = (sessions as unknown as Array<{ userId: string } & Record<string, unknown>>).filter((s) => s.userId === user.id);
    return res.json({ sessions: userSessions });
  } catch { return res.json({ sessions: [] }); }
});

router.post("/research", async (req, res) => {
  const user = getUser(req);
  try {
    const body = req.body;
    const session = { id: `r_${Date.now()}`, userId: user?.id || "anon", ...body, createdAt: Date.now() };
    const sessions = await readStore<unknown[]>("research_sessions");
    sessions.push(session);
    await writeStore("research_sessions", sessions);
    return res.json({ session });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
