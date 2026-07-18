import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/db";
import { connectDB } from "@/lib/db/connect";
import { SandboxProjectModel } from "@/lib/db/models/SandboxProject";
import type { SandboxProject } from "@/lib/sandbox/types";

interface StoredSandbox extends SandboxProject {
  userId: string;
}

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

export async function GET(req: NextRequest) {
  const user = getUser(req);

  try {
    await connectDB();
    if (user) {
      const userProjects = await SandboxProjectModel.find({ userId: user.id })
        .sort({ updatedAt: -1 })
        .lean();
      return NextResponse.json({ projects: userProjects });
    }
    return NextResponse.json({ projects: [] });
  } catch {
    return NextResponse.json({ projects: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);

  try {
    const body = await req.json();
    await connectDB();
    const now = Date.now();

    const project = new SandboxProjectModel({
      id: now.toString(),
      userId: user?.id || "anonymous",
      title: body.title || "Untitled Project",
      rawIdea: body.rawIdea || "",
      stage: "idea",
      analysis: null,
      components: null,
      wiring: null,
      code: null,
      createdAt: now,
      updatedAt: now,
    });

    await project.save();

    return NextResponse.json({ project: project.toObject() });
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: "Project ID is required" }, { status: 400 });

    await connectDB();
    const updated = await SandboxProjectModel.findOneAndUpdate(
      { id },
      { $set: { ...data, updatedAt: Date.now() } },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ project: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Project ID is required" }, { status: 400 });

    await connectDB();
    const result = await SandboxProjectModel.deleteOne({ id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
