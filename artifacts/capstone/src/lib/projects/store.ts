'use client';
import type { SavedProject, SandboxProject } from '@/lib/sandbox/types';
import { BOARD_COMPONENTS } from '@/lib/sandbox/components';

const STORAGE_KEY = 'capstone-projects';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('capstone_token');
}

async function api(path: string, options?: RequestInit): Promise<Response | null> {
  const token = getToken();
  if (!token) return null;
  try {
    return fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options?.headers },
    });
  } catch { return null; }
}

function loadLocal(): SavedProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(projects: SavedProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function detectLanguage(boardName: string): string {
  const lower = boardName.toLowerCase();
  if (lower.includes('rpi') && !lower.includes('pico')) return 'Python (RPi.GPIO)';
  if (lower.includes('pico')) return 'MicroPython';
  return 'Arduino C++';
}

// Map a server sandbox project into the legacy "My Projects" display shape.
function toSavedProject(p: SandboxProject): SavedProject {
  const boardComp = p.hardwareBoard ? BOARD_COMPONENTS.find((c) => c.id === p.hardwareBoard) : undefined;
  const boardName = boardComp?.name || p.hardwareBoard || '';
  return {
    id: p.id,
    idea: p.title || p.rawIdea,
    board: boardName,
    boardId: p.hardwareBoard || null,
    sensors: (p.hardwareSensors || []).map((id) => p.sensorNames?.[id] || id),
    sensorNames: p.sensorNames || {},
    wiring: p.hardwareWiring || [],
    code: p.code?.files?.map((f) => f.content).join('\n\n') || '',
    language: boardName ? detectLanguage(boardName) : '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    status: p.stage === 'code' ? 'generated' : (p.stage === 'idea' ? 'idea' : 'components'),
  };
}

let serverLoaded = false;

export async function getProjectsAsync(): Promise<SavedProject[]> {
  const res = await api('/sandbox/projects');
  if (res && res.ok) {
    const data = await res.json();
    if (data.projects) {
      const mapped = (data.projects as SandboxProject[]).map(toSavedProject);
      const local = loadLocal();
      const byId = new Map(local.map((p) => [p.id, p]));
      mapped.forEach((p) => byId.set(p.id, p));
      const merged = Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      saveLocal(merged);
      serverLoaded = true;
      return merged;
    }
  }
  return loadLocal().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProjects(): SavedProject[] {
  return loadLocal().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): SavedProject | undefined {
  return loadLocal().find((p) => p.id === id);
}

export async function createProjectAsync(data: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedProject> {
  const now = Date.now();
  const project: SavedProject = { ...data, id: now.toString(), createdAt: now, updatedAt: now };
  const all = loadLocal();
  all.push(project);
  saveLocal(all);
  api('/sandbox/projects', { method: 'POST', body: JSON.stringify(project) });
  return project;
}

export function createProject(data: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): SavedProject {
  const now = Date.now();
  const project: SavedProject = { ...data, id: now.toString(), createdAt: now, updatedAt: now };
  const all = loadLocal();
  all.push(project);
  saveLocal(all);
  api('/sandbox/projects', { method: 'POST', body: JSON.stringify(project) });
  return project;
}

export async function updateProjectAsync(id: string, data: Partial<SavedProject>): Promise<SavedProject | undefined> {
  const all = loadLocal();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...data, updatedAt: Date.now() };
  saveLocal(all);
  api('/sandbox/projects', { method: 'PUT', body: JSON.stringify({ id, ...data }) });
  return all[idx];
}

export function updateProject(id: string, data: Partial<SavedProject>): SavedProject | undefined {
  const all = loadLocal();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...data, updatedAt: Date.now() };
  saveLocal(all);
  api('/sandbox/projects', { method: 'PUT', body: JSON.stringify({ id, ...data }) });
  return all[idx];
}

export async function deleteProjectAsync(id: string) {
  const all = loadLocal().filter((p) => p.id !== id);
  saveLocal(all);
  api(`/sandbox/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function deleteProject(id: string) {
  const all = loadLocal().filter((p) => p.id !== id);
  saveLocal(all);
  api(`/sandbox/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getProjectsByStatus(status: SavedProject['status']): SavedProject[] {
  return loadLocal().filter((p) => p.status === status).sort((a, b) => b.updatedAt - a.updatedAt);
}
