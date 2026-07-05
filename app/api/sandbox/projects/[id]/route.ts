import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/db";
import { readStore, writeStore } from "@/lib/storage/db";
import type { SandboxProject } from "@/lib/sandbox/types";

interface StoredSandbox extends SandboxProject {
  userId: string;
}

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = getUser(_req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    const project = projects.find((p) => p.id === id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (project.userId !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

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
  const user = getUser(_req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    const project = projects.find((p) => p.id === id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (project.userId !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const filtered = projects.filter((p) => p.id !== id);
    await writeStore("sandbox_projects", filtered);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
