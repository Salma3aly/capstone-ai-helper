import fs from "fs";
import path from "path";

type JsonValue = Record<string, unknown> | unknown[];

const locks = new Map<string, Promise<void>>();

function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.then(() => {}, () => {}));
  return next;
}

export function readJsonFile<T = JsonValue>(filePath: string): T {
  try {
    if (!fs.existsSync(filePath)) return (Array.isArray([]) ? [] : {}) as T;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return (Array.isArray([]) ? [] : {}) as T;
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const DATA_DIR = path.join(process.cwd(), "data");

export function dataPath(...segments: string[]): string {
  return path.join(DATA_DIR, ...segments);
}

export async function readStore<T>(name: string): Promise<T> {
  return withLock(name, async () => {
    return readJsonFile<T>(dataPath(`${name}.json`));
  });
}

export async function writeStore(name: string, data: unknown): Promise<void> {
  return withLock(name, async () => {
    writeJsonFile(dataPath(`${name}.json`), data);
  });
}

export async function appendToArray<T>(name: string, item: T): Promise<T[]> {
  return withLock(name, async () => {
    const arr = readJsonFile<T[]>(dataPath(`${name}.json`));
    arr.push(item);
    writeJsonFile(dataPath(`${name}.json`), arr);
    return arr;
  });
}

export async function updateInArray<T extends { id: string }>(
  name: string,
  id: string,
  updater: (item: T) => T
): Promise<T | null> {
  return withLock(name, async () => {
    const arr = readJsonFile<T[]>(dataPath(`${name}.json`));
    const idx = arr.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    arr[idx] = updater(arr[idx]);
    writeJsonFile(dataPath(`${name}.json`), arr);
    return arr[idx];
  });
}

export async function removeFromArray<T extends { id: string }>(
  name: string,
  id: string
): Promise<boolean> {
  return withLock(name, async () => {
    const arr = readJsonFile<T[]>(dataPath(`${name}.json`));
    const filtered = arr.filter((i) => i.id !== id);
    if (filtered.length === arr.length) return false;
    writeJsonFile(dataPath(`${name}.json`), filtered);
    return true;
  });
}
