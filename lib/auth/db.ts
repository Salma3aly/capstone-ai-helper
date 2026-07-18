import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db/connect";
import { User, IUser } from "@/lib/db/models/User";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export type { IUser as User };

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  userType?: string;
  grade?: string;
  phone?: string;
  organization?: string;
  avatar?: string;
  createdAt: string;
}

function toSafe(user: IUser): SafeUser {
  const { password, ...safe } = user;
  return safe;
}

export async function findUserByEmail(email: string): Promise<IUser | null> {
  await connectDB();
  return User.findOne({ email }).lean();
}

export async function findUserById(id: string): Promise<IUser | null> {
  await connectDB();
  return User.findOne({ id }).lean();
}

export async function createUser(
  name: string, email: string, password: string,
  extra?: { userType?: string; grade?: string; phone?: string; organization?: string }
): Promise<IUser> {
  await connectDB();
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({
    id: Date.now().toString(),
    name,
    email,
    password: hashed,
    userType: extra?.userType,
    grade: extra?.grade,
    phone: extra?.phone,
    organization: extra?.organization,
    createdAt: new Date().toISOString(),
  });
  await user.save();
  return user.toObject();
}

export async function updateUser(id: string, updates: Partial<Omit<IUser, "id" | "password" | "createdAt">>): Promise<SafeUser | null> {
  await connectDB();
  const user = await User.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true }
  ).lean();
  if (!user) return null;
  return toSafe(user);
}

export function signToken(user: IUser): string {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, getJwtSecret(), {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): SafeUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SafeUser;
  } catch {
    return null;
  }
}

export async function readDb(): Promise<IUser[]> {
  await connectDB();
  return User.find().lean();
}
