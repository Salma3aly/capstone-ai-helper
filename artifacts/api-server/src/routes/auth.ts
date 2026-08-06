import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, findUserById, updateUser, type User } from "@workspace/db";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "capstone-dev-secret";

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
  if (await findUserByEmail(email)) return res.status(409).json({ error: "Email already registered" });
  const hashed = await bcrypt.hash(password, 10);
  const user: User = { id: `u_${Date.now()}`, name, email: email.toLowerCase(), password: hashed, userType, grade, phone, organization, createdAt: new Date().toISOString() };
  await createUser(user);
  const { password: _, ...safe } = user;
  return res.json({ token: signToken(safe), user: safe });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });
  const { password: _, ...safe } = user;
  return res.json({ token: signToken(safe), user: safe });
});

router.get("/auth/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const decoded = verifyToken(auth.slice(7));
  if (!decoded) return res.status(401).json({ error: "Invalid token" });
  const user = await findUserById(decoded.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { password: _, ...safe } = user;
  return res.json({ user: safe });
});

router.put("/auth/update-profile", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const decoded = verifyToken(auth.slice(7));
  if (!decoded) return res.status(401).json({ error: "Invalid token" });
  const current = await findUserById(decoded.id);
  if (!current) return res.status(404).json({ error: "User not found" });
  const { name, grade, phone, organization, avatar, currentPassword, newPassword } = req.body;
  let password = current.password;
  if (currentPassword && newPassword) {
    const valid = await bcrypt.compare(currentPassword, current.password);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
    password = await bcrypt.hash(newPassword, 10);
  }
  const updated = await updateUser(decoded.id, {
    ...(name ? { name } : {}),
    password,
    ...(grade !== undefined ? { grade } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(organization !== undefined ? { organization } : {}),
    ...(avatar !== undefined ? { avatar } : {}),
  });
  if (!updated) return res.status(404).json({ error: "User not found" });
  const { password: _, ...safe } = updated;
  return res.json({ user: safe, token: signToken(safe) });
});

export default router;