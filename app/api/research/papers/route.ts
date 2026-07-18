import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/db";
import { connectDB } from "@/lib/db/connect";
import { ResearchPaperModel } from "@/lib/db/models/ResearchPaper";
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
    await connectDB();
    const userPapers = await ResearchPaperModel.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();
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
    await connectDB();

    const id = body.id || `paper_${Date.now()}`;
    const paperData = {
      id,
      userId: user.id,
      title: body.title || deriveTitle(body.originalText || ""),
      originalText: body.originalText || "",
      summary: body.summary || {},
      projectContext: body.projectContext || "",
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const paper = await ResearchPaperModel.findOneAndUpdate(
      { id, userId: user.id },
      { $set: paperData },
      { upsert: true, new: true }
    ).lean();

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

    await connectDB();
    const result = await ResearchPaperModel.deleteOne({ id, userId: user.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete research paper" }, { status: 500 });
  }
}
