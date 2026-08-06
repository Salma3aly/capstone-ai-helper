import { count, eq } from "drizzle-orm";
import type { User } from "./types";
import { getDb } from "./index";
import { users as usersTable } from "./schema";

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = getDb();
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(user: User): Promise<void> {
  const db = getDb();
  await db.insert(usersTable).values(user).onConflictDoNothing();
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "name" | "password" | "grade" | "phone" | "organization" | "avatar">>,
): Promise<User | null> {
  const db = getDb();
  await db.update(usersTable).set(patch).where(eq(usersTable.id, id));
  return findUserById(id);
}

export async function countUsers(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ c: count() }).from(usersTable);
  return rows[0]?.c ?? 0;
}