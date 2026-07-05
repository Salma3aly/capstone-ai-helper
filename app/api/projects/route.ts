import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/db";
import { readStore, writeStore } from "@/lib/storage/db";
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
    const projects = await readStore<StoredProject[]>("projects");
    const userProjects = projects
      .filter((p) => p.userId === user.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
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
    const now = Date.now();

    const project: StoredProject = {
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
    };

    const projects = await readStore<StoredProject[]>("projects");
    projects.push(project);
    await writeStore("projects", projects);

    return NextResponse.json({ project });
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

    const projects = await readStore<StoredProject[]>("projects");
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (projects[idx].userId !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    projects[idx] = { ...projects[idx], ...data, updatedAt: Date.now() };
    await writeStore("projects", projects);
    return NextResponse.json({ project: projects[idx] });
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

    const projects = await readStore<StoredProject[]>("projects");
    const project = projects.find((p) => p.id === id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (project.userId !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const filtered = projects.filter((p) => p.id !== id);
    await writeStore("projects", filtered);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
