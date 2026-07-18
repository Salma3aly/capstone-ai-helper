import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { SandboxProjectModel } from "@/lib/db/models/SandboxProject";
import type { SandboxProject } from "@/lib/sandbox/types";

interface StoredSandbox extends SandboxProject {
  userId: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await connectDB();
    const project = await SandboxProjectModel.findOne({ id }).lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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
