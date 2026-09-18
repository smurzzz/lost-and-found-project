/**
 * Typed API client (Phase 2).
 *
 * createClaimItClient() builds a tRPC client for the given base URL and
 * bearer token. In production the token comes from Clerk (@clerk/expo
 * useAuth().getToken()); in dev mode the server accepts `dev.<name>.<role>`
 * tokens. The ClaimItService facade is the single API boundary the UI
 * consumes — mock data in the prototype screens can be swapped for these
 * calls without changing any approved layout.
 */
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "../server/trpc/routers";

export type ClaimItClient = ReturnType<typeof createClaimItProxy>;

export function createClaimItProxy(baseUrl: string, token?: string | null) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl.replace(/\/$/, "")}/trpc`,
        transformer: superjson,
        headers() {
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

const DEFAULT_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

let cached: ClaimItClient | null = null;
let cachedToken: string | null | undefined;

export function getClaimItClient(token?: string | null): ClaimItClient {
  if (!cached || cachedToken !== token) {
    cached = createClaimItProxy(DEFAULT_BASE_URL, token);
    cachedToken = token;
  }
  return cached;
}

/**
 * Build a dev bearer token (`dev.<name>.<role>`) for local testing.
 * Spaces are encoded as underscores because HTTP headers terminate
 * bearer tokens at whitespace.
 */
export function devToken(name: string, role: "student" | "staff"): string {
  return `dev.${name.replace(/\s+/g, "_")}.${role}`;
}
