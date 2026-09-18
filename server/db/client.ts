/**
 * Database client (Phase 2).
 *
 * ClaimIt standardizes on Neon PostgreSQL (see docs amendment 2026-09-19).
 * The `postgres` driver works unchanged against Neon's pooled endpoint.
 * The pooled DATABASE_URL must be used for the app; migrations via
 * drizzle-kit should use the unpooled endpoint (DATABASE_URL_UNPOOLED).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function createDb(databaseUrl: string) {
  // Neon pooled endpoints can rate-limit per-connection; keep it small.
  const client = postgres(databaseUrl, { max: 5, idle_timeout: 20 });
  return { db: drizzle(client, { schema }), client };
}

/** Lazily constructed singleton used by the API layer. */
let cached: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
    }
    cached = createDb(url);
  }
  return cached.db;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
