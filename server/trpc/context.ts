/**
 * tRPC context (Phase 2).
 *
 * Every procedure receives the authenticated AuthUser. Authentication is
 * performed once per request here (Clerk JWT in production, dev tokens
 * while Clerk keys are absent — see server/auth.ts).
 */
import { TRPCError } from "@trpc/server";

import { authenticate, type AuthUser } from "../auth";

export type Context = {
  user: AuthUser;
  reqHeaders: Record<string, string | undefined>;
};

export async function createContext(opts: {
  authorization?: string | null;
  headers: Record<string, string | undefined>;
}): Promise<Context> {
  try {
    const user = await authenticate(opts.authorization, opts.headers);
    return { user, reqHeaders: opts.headers };
  } catch (error) {
    // Surface auth failures as proper 401s (never leak stack traces).
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: error instanceof Error ? error.message : "Unauthorized",
    });
  }
}
