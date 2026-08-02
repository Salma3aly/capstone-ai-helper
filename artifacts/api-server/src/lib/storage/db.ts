import fs from "fs";
import path from "path";

type JsonValue = Record<string, unknown> | unknown[];

const locks = new Map<string, Promise<void>>();

function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn) as Promise<T>;
  const voidNext = next.then(() => {}, () => {});
  locks.set(key, voidNext);
  return next;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readJsonFile<T = JsonValue>(filePath: string): T {
  try {
    if (!fs.existsSync(filePath)) return [] as unknown as T;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return [] as unknown as T;
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function readStore<T = unknown[]>(key: string): Promise<T> {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${key}.json`);
  try {
    if (!fs.existsSync(filePath)) return [] as unknown as T;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return [] as unknown as T;
  }
}

export async function writeStore(key: string, data: unknown): Promise<void> {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, `${key}.json`);
  return withLock(key, async () => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  });
}
