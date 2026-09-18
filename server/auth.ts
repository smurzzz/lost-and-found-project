/**
 * Authentication and role resolution (Phase 2).
 *
 * Production: Clerk JWTs from @clerk/expo are verified with @clerk/backend.
 * Development: when CLERK_SECRET_KEY is not configured, the server accepts
 * dev tokens (`dev.<name>.<role>`) or x-claimit-dev-* headers so the API
 * can be exercised before Clerk keys exist. This fallback is disabled the
 * moment a secret key is present.
 *
 * Role policy: the database `users.role` column is authoritative for
 * authorization; Clerk metadata is treated as a provisioning hint only.
 */
import { eq } from "drizzle-orm";

import type { AppRole } from "../shared/workflow";
import { getDb } from "./db/client";
import { users } from "./db/schema";

export type AuthUser = {
  id: string;
  clerkId: string;
  name: string;
  email: string | null;
  role: AppRole;
  avatarUrl: string | null;
};

const DEV_PREFIX = "dev.";

export function isClerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

/**
 * Explicit dev-login escape hatch: because CLERK_SECRET_KEY is set, tokens
 * are verified strictly UNLESS ALLOW_DEV_LOGIN=true (local testing only —
 * never enable in production). See docs/ClaimIt Progress Tracker.md.
 */
export function isDevLoginEnabled(): boolean {
  return process.env.ALLOW_DEV_LOGIN === "true";
}

/** Extract a bearer token from an Authorization header value. */
export function bearerToken(header: string | undefined | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * Dev-only identity resolution. Accepts `dev.<name>.<role>` bearer tokens
 * or x-claimit-dev-* headers. Auto-provisions the user row on first use.
 */
export async function resolveDevUser(
  token: string | null,
  headers: HeadersLike,
): Promise<AuthUser | null> {
  const name = headers["x-claimit-dev-name"];
  const role = headers["x-claimit-dev-role"];
  let devName = name;
  let devRole: AppRole = role === "staff" ? "staff" : "student";

  if (!devName && token && token.startsWith(DEV_PREFIX)) {
    const rest = token.slice(DEV_PREFIX.length);
    const lastDot = rest.lastIndexOf(".");
    if (lastDot > 0) {
      devName = rest.slice(0, lastDot);
      devRole = rest.slice(lastDot + 1) === "staff" ? "staff" : "student";
    } else if (rest) {
      devName = rest;
    }
  }

  if (!devName) return null;
  // Dev tokens encode spaces as underscores; restore them for display.
  return upsertDevUser(devName.replace(/_/g, " "), devRole);
}

export type HeadersLike = Record<string, string | undefined> & {
  get?: (key: string) => string | null;
};

/**
 * Resolve the authenticated user for a request.
 * Throws Error with a `.status` property on failure.
 */
export async function authenticate(
  authorization: string | undefined | null,
  headers: HeadersLike,
): Promise<AuthUser> {
  const token = bearerToken(authorization);

  // Production path: verify the Clerk session token.
  if (
    isClerkConfigured() &&
    token &&
    !token.startsWith(DEV_PREFIX) &&
    !(isDevLoginEnabled() && token.startsWith(DEV_PREFIX))
  ) {
    return verifyClerkToken(token);
  }

  // Development paths: no Clerk keys, or ALLOW_DEV_LOGIN=true override.
  if (!isClerkConfigured() || (isDevLoginEnabled() && token?.startsWith(DEV_PREFIX))) {
    const devUser = await resolveDevUser(token, headers);
    if (devUser) return devUser;
  }

  const error = new Error("Unauthorized") as Error & { status: number };
  error.status = 401;
  throw error;
}

async function verifyClerkToken(token: string): Promise<AuthUser> {
  const { createClerkClient, verifyToken } = await import("@clerk/backend");
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  let payload;
  try {
    payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
  } catch {
    const error = new Error("Invalid session token") as Error & { status: number };
    error.status = 401;
    throw error;
  }

  const clerkId = payload.sub;
  if (!clerkId) {
    const error = new Error("Invalid session token") as Error & { status: number };
    error.status = 401;
    throw error;
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (existing[0]) return toAuthUser(existing[0]);

  // First sign-in: provision the row. Fetch profile details when possible.
  let name = `User ${clerkId.slice(0, 6)}`;
  let email: string | null = null;
  let avatarUrl: string | null = null;
  try {
    const cu = await clerk.users.getUser(clerkId);
    name = [cu.firstName, cu.lastName].filter(Boolean).join(" ") || cu.username || name;
    email = cu.primaryEmailAddress?.emailAddress ?? null;
    avatarUrl = cu.imageUrl ?? null;
  } catch {
    // Profile fetch is best-effort; auth still succeeds on a valid token.
  }

  const inserted = await db
    .insert(users)
    .values({ clerkId, name, email, avatarUrl })
    .returning();
  return toAuthUser(inserted[0]);
}

/** Dev helper: get-or-create a user by display name. */
export async function upsertDevUser(name: string, role: AppRole): Promise<AuthUser> {
  const db = getDb();
  const clerkId = `dev_${name.toLowerCase().replace(/\s+/g, "_")}`;
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (existing[0]) return toAuthUser(existing[0]);
  const inserted = await db
    .insert(users)
    .values({ clerkId, name, role })
    .returning();
  return toAuthUser(inserted[0]);
}

export function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    clerkId: row.clerkId,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatarUrl,
  };
}
