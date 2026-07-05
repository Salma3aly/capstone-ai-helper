'use client';
import type { ResearchPaper } from "./types";

const STORAGE_KEY = "capstone_research_papers";

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

function readAll(): ResearchPaper[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ResearchPaper[]) : [];
  } catch {
    return [];
  }
}

function writeAll(papers: ResearchPaper[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(papers));
}

function deriveTitle(text: string): string {
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  if (titleMatch) return titleMatch[1].trim().slice(0, 120);
  const firstLine = text.split("\n").find((l) => l.trim().length > 10);
  return (firstLine || "Untitled Research Paper").trim().slice(0, 120);
}

export async function getAllResearchPapersAsync(): Promise<ResearchPaper[]> {
  const res = await api("/research/papers");
  if (res && res.ok) {
    const data = await res.json();
    if (data.papers) {
      writeAll(data.papers);
      return data.papers;
    }
  }
  return getAllResearchPapers();
}

export function getAllResearchPapers(): ResearchPaper[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getResearchPaper(id: string): ResearchPaper | null {
  return readAll().find((p) => p.id === id) ?? null;
}

export async function saveResearchPaperAsync(
  data: Omit<ResearchPaper, "id" | "createdAt" | "title"> & { title?: string }
): Promise<ResearchPaper> {
  const paper: ResearchPaper = {
    id: crypto.randomUUID(),
    title: data.title || deriveTitle(data.originalText),
    originalText: data.originalText,
    summary: data.summary,
    projectContext: data.projectContext,
    createdAt: new Date().toISOString(),
  };
  const papers = readAll();
  papers.unshift(paper);
  writeAll(papers);
  api("/research/papers", { method: "POST", body: JSON.stringify(paper) });
  return paper;
}

export function saveResearchPaper(
  data: Omit<ResearchPaper, "id" | "createdAt" | "title"> & { title?: string }
): ResearchPaper {
  const paper: ResearchPaper = {
    id: crypto.randomUUID(),
    title: data.title || deriveTitle(data.originalText),
    originalText: data.originalText,
    summary: data.summary,
    projectContext: data.projectContext,
    createdAt: new Date().toISOString(),
  };
  const papers = readAll();
  papers.unshift(paper);
  writeAll(papers);
  api("/research/papers", { method: "POST", body: JSON.stringify(paper) });
  return paper;
}

export async function deleteResearchPaperAsync(id: string): Promise<void> {
  writeAll(readAll().filter((p) => p.id !== id));
  api(`/research/papers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function deleteResearchPaper(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
  api(`/research/papers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export type { ResearchPaper };
