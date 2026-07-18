import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/db";
import { readStore, writeStore } from "@/lib/storage/db";
import type { ResearchPaper } from "@/lib/research/types";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

interface StoredPaper extends ResearchPaper {
  userId: string;
}

function deriveTitle(text: string): string {
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  if (titleMatch) return titleMatch[1].trim().slice(0, 120);
  const firstLine = text.split("\n").find((l) => l.trim().length > 10);
  return (firstLine || "Untitled Research Paper").trim().slice(0, 120);
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const papers = await readStore<StoredPaper[]>("research_papers");
    const userPapers = papers
      .filter((p) => p.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({ papers: userPapers });
  } catch {
    return NextResponse.json({ papers: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();

    const paper: StoredPaper = {
      id: body.id || crypto.randomUUID?.() || `paper_${Date.now()}`,
      userId: user.id,
      title: body.title || deriveTitle(body.originalText || ""),
      originalText: body.originalText || "",
      summary: body.summary || {},
      projectContext: body.projectContext || "",
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const papers = await readStore<StoredPaper[]>("research_papers");
    // Replace existing or append
    const idx = papers.findIndex((p) => p.id === paper.id && p.userId === user.id);
    if (idx >= 0) {
      papers[idx] = paper;
    } else {
      papers.unshift(paper);
    }
    await writeStore("research_papers", papers);

    return NextResponse.json({ paper });
  } catch {
    return NextResponse.json({ error: "Failed to save research paper" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Paper ID is required" }, { status: 400 });

    const papers = await readStore<StoredPaper[]>("research_papers");
    const paper = papers.find((p) => p.id === id);
    if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    if (paper.userId !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const filtered = papers.filter((p) => p.id !== id);
    await writeStore("research_papers", filtered);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete research paper" }, { status: 500 });
  }
}
