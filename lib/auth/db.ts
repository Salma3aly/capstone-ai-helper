import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "capstone-secret-key-change-in-production";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  userType?: string;
  grade?: string;
  phone?: string;
  university?: string;
  organization?: string;
  avatar?: string;
  createdAt: string;
}

export function readDb(): User[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeDb(users: User[]) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

export function findUserByEmail(email: string): User | undefined {
  return readDb().find((u) => u.email === email);
}

export async function createUser(
  name: string, email: string, password: string,
  extra?: { userType?: string; grade?: string; phone?: string; university?: string; organization?: string }
): Promise<User> {
  const users = readDb();
  const hashed = await bcrypt.hash(password, 10);
  const user: User = {
    id: Date.now().toString(),
    name,
    email,
    password: hashed,
    userType: extra?.userType,
    grade: extra?.grade,
    phone: extra?.phone,
    university: extra?.university,
    organization: extra?.organization,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeDb(users);
  return user;
}

export function updateUser(id: string, updates: Partial<Omit<User, "id" | "password" | "createdAt">>): User | null {
  const users = readDb();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  writeDb(users);
  return users[idx];
}

export function signToken(user: Omit<User, "password">): string {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): Omit<User, "password"> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Omit<User, "password">;
  } catch {
    return null;
  }
}
