import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const router = Router();

const DB_PATH = path.join(process.cwd(), "data", "users.json");
const JWT_SECRET = process.env.JWT_SECRET || "capstone-dev-secret";

export interface User {
  id: string; name: string; email: string; password: string;
  userType?: string; grade?: string; phone?: string;
  organization?: string; avatar?: string; createdAt: string;
}

function readDb(): User[] {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch { return []; }
}

function writeDb(users: User[]): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

export function signToken(user: Omit<User, "password">): string {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { id: string; email: string; name: string } | null {
  try { return jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string }; }
  catch { return null; }
}

router.post("/auth/register", async (req, res) => {
  const { name, email, password, userType, grade, phone, organization } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: "Name, email, and password are required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const users = readDb();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: "Email already registered" });
  const hashed = await bcrypt.hash(password, 10);
  const user: User = { id: `u_${Date.now()}`, name, email: email.toLowerCase(), password: hashed, userType, grade, phone, organization, createdAt: new Date().toISOString() };
  users.push(user);
  writeDb(users);
  const { password: _, ...safe } = user;
  return res.json({ token: signToken(safe), user: safe });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const users = readDb();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });
  const { password: _, ...safe } = user;
  return res.json({ token: signToken(safe), user: safe });
});

router.get("/auth/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const decoded = verifyToken(auth.slice(7));
  if (!decoded) return res.status(401).json({ error: "Invalid token" });
  const users = readDb();
  const user = users.find((u) => u.id === decoded.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { password: _, ...safe } = user;
  return res.json({ user: safe });
});

router.put("/auth/update-profile", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const decoded = verifyToken(auth.slice(7));
  if (!decoded) return res.status(401).json({ error: "Invalid token" });
  const users = readDb();
  const idx = users.findIndex((u) => u.id === decoded.id);
  if (idx === -1) return res.status(404).json({ error: "User not found" });
  const { name, grade, phone, organization, avatar, currentPassword, newPassword } = req.body;
  if (currentPassword && newPassword) {
    const valid = await bcrypt.compare(currentPassword, users[idx].password);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
    users[idx].password = await bcrypt.hash(newPassword, 10);
  }
  if (name) users[idx].name = name;
  if (grade !== undefined) users[idx].grade = grade;
  if (phone !== undefined) users[idx].phone = phone;
  if (organization !== undefined) users[idx].organization = organization;
  if (avatar !== undefined) users[idx].avatar = avatar;
  writeDb(users);
  const { password: _, ...safe } = users[idx];
  return res.json({ user: safe, token: signToken(safe) });
});

export default router;
