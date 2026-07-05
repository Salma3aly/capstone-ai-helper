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

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
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

    const project: StoredSandbox = {
      id: now.toString(),
      userId: user.id,
      title: body.title || "Untitled Project",
      rawIdea: body.rawIdea || "",
      stage: "idea",
      analysis: null,
      components: null,
      wiring: null,
      code: null,
      createdAt: now,
      updatedAt: now,
    };

    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    projects.push(project);
    await writeStore("sandbox_projects", projects);

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

    const projects = await readStore<StoredSandbox[]>("sandbox_projects");
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (projects[idx].userId !== user.id) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    projects[idx] = { ...projects[idx], ...data, updatedAt: Date.now() };
    await writeStore("sandbox_projects", projects);
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
