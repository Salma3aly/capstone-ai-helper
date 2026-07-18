import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/db";
import { connectDB } from "@/lib/db/connect";
import { LegacyProjectModel } from "@/lib/db/models/LegacyProject";
import type { SavedProject } from "@/lib/sandbox/types";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

interface StoredProject extends SavedProject {
  userId: string;
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await connectDB();
    const userProjects = await LegacyProjectModel.find({ userId: user.id })
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({ projects: userProjects });
  } catch {
    return NextResponse.json({ projects: [] });
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    await connectDB();
    const now = Date.now();

    const project = new LegacyProjectModel({
      id: now.toString(),
      userId: user.id,
      idea: body.idea || "",
      board: body.board || "",
      boardId: body.boardId || null,
      sensors: body.sensors || [],
      sensorNames: body.sensorNames || {},
      wiring: body.wiring || [],
      code: body.code || "",
      language: body.language || "",
      createdAt: now,
      updatedAt: now,
      status: body.status || "idea",
    });

    await project.save();

    return NextResponse.json({ project: project.toObject() });
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: "Project ID is required" }, { status: 400 });

    await connectDB();
    const updated = await LegacyProjectModel.findOneAndUpdate(
      { id, userId: user.id },
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
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Project ID is required" }, { status: 400 });

    await connectDB();
    const result = await LegacyProjectModel.deleteOne({ id, userId: user.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
