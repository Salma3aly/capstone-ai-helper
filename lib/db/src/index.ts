import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getPool(): pg.Pool {
  if (poolInstance) return poolInstance;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
  return poolInstance;
}

export function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = drizzle(getPool(), { schema });
  return dbInstance;
}

export * from "./schema";
export * from "./hub-store";
export * from "./user-store";
export * from "./types";