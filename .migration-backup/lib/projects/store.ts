'use client';
import type { SavedProject } from '@/lib/sandbox/types';

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

let serverLoaded = false;

export async function getProjectsAsync(): Promise<SavedProject[]> {
  const res = await api('/projects');
  if (res && res.ok) {
    const data = await res.json();
    if (data.projects) {
      saveLocal(data.projects);
      serverLoaded = true;
      return data.projects;
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
  api('/projects', { method: 'POST', body: JSON.stringify(project) });
  return project;
}

export function createProject(data: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): SavedProject {
  const now = Date.now();
  const project: SavedProject = { ...data, id: now.toString(), createdAt: now, updatedAt: now };
  const all = loadLocal();
  all.push(project);
  saveLocal(all);
  api('/projects', { method: 'POST', body: JSON.stringify(project) });
  return project;
}

export async function updateProjectAsync(id: string, data: Partial<SavedProject>): Promise<SavedProject | undefined> {
  const all = loadLocal();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...data, updatedAt: Date.now() };
  saveLocal(all);
  api('/projects', { method: 'PUT', body: JSON.stringify({ id, ...data }) });
  return all[idx];
}

export function updateProject(id: string, data: Partial<SavedProject>): SavedProject | undefined {
  const all = loadLocal();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...data, updatedAt: Date.now() };
  saveLocal(all);
  api('/projects', { method: 'PUT', body: JSON.stringify({ id, ...data }) });
  return all[idx];
}

export async function deleteProjectAsync(id: string) {
  const all = loadLocal().filter((p) => p.id !== id);
  saveLocal(all);
  api(`/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function deleteProject(id: string) {
  const all = loadLocal().filter((p) => p.id !== id);
  saveLocal(all);
  api(`/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getProjectsByStatus(status: SavedProject['status']): SavedProject[] {
  return loadLocal().filter((p) => p.status === status).sort((a, b) => b.updatedAt - a.updatedAt);
}
