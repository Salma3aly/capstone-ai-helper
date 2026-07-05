import type { SandboxProject } from "./types";

const STORAGE_KEY = "sandbox_projects";

// ─── Client-side helpers ───────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("capstone_token");
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// ─── API calls ─────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API error");
  }
  return res.json();
}

// ─── Library ───────────────────────────────────────────────────────────

export async function listProjects(): Promise<SandboxProject[]> {
  return apiFetch<{ projects: SandboxProject[] }>("/api/sandbox/projects").then(
    (r) => r.projects
  );
}

export async function getProject(id: string): Promise<SandboxProject> {
  return apiFetch<{ project: SandboxProject }>(`/api/sandbox/projects/${id}`).then(
    (r) => r.project
  );
}

export async function createProject(data: {
  title: string;
  rawIdea: string;
}): Promise<SandboxProject> {
  return apiFetch<{ project: SandboxProject }>("/api/sandbox/projects", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((r) => r.project);
}

export async function updateProject(
  id: string,
  data: Partial<SandboxProject>
): Promise<SandboxProject> {
  return apiFetch<{ project: SandboxProject }>("/api/sandbox/projects", {
    method: "PUT",
    body: JSON.stringify({ id, ...data }),
  }).then((r) => r.project);
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/api/sandbox/projects/${id}`, {
    method: "DELETE",
  });
}

// ─── Local storage fallback ────────────────────────────────────────────

export function getLocalProjects(): SandboxProject[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLocalProject(project: SandboxProject): void {
  if (typeof window === "undefined") return;
  const projects = getLocalProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function removeLocalProject(id: string): void {
  if (typeof window === "undefined") return;
  const projects = getLocalProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
