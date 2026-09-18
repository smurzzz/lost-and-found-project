/**
 * End-to-end API smoke test (Phase 2).
 *
 * Exercises the full custody workflow against a running API + live Neon:
 *   staff logs item -> student submits claim -> staff scans QR ->
 *   staff confirms release -> audit trail verifies the chain.
 * Requires the server started with ALLOW_DEV_LOGIN=true. Cleans up its
 * own rows afterwards. Run: corepack pnpm exec tsx scripts/e2e-smoke.ts
 */
import "dotenv/config";

import { eq, inArray } from "drizzle-orm";

import { createDb } from "../server/db/client";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function trpc<T>(
  path: string,
  body: unknown | null,
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE}/trpc/${path}`, {
    method: body === null ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === null ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as {
    result?: { data: { json: T } };
    error?: { json: { message: string } };
  };
  if (json.error) throw new Error(`${path}: ${json.error.json.message}`);
  // tRPC batch envelopes: unwrapping with superjson not needed for plain JSON
  // (no Date instances when we select .json fields) — dates arrive as ISO strings.
  return (json.result?.data?.json ?? (json as unknown)) as T;
}

async function main() {
  const staffToken = "dev.E2E Staff.staff";
  const studentToken = "dev.E2E Student.student";
  const results: string[] = [];
  const check = (label: string, ok: boolean, extra = "") => {
    results.push(`${ok ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!ok) process.exitCode = 1;
  };

  // 1. Staff logs a found item.
  const item = await trpc<{ id: string; qrCode: string; status: string }>(
    "items.log",
    {
      json: {
        name: "E2E Test Item",
        category: "Electronics",
        location: "Smoke Test Location",
        foundDate: new Date().toISOString(),
      },
    },
    staffToken,
  );
  check("items.log creates item", Boolean(item.id && item.qrCode));
  check("new item starts FOUND", item.status === "FOUND");

  // 2. Release must be blocked before any scan.
  let blocked = false;
  try {
    await trpc("items.release", { json: { itemId: item.id } }, staffToken);
  } catch (e) {
    blocked = true;
  }
  check("release blocked without scan", blocked);

  // 3. Student submits a claim.
  const claim = await trpc<{ id: string }>(
    "claims.submit",
    {
      json: {
        foundItemId: item.id,
        verificationAnswer: "Sticker of a rocket on the case",
      },
    },
    studentToken,
  );
  check("claims.submit creates claim", Boolean(claim.id));

  // 4. Staff scans the QR tag; pending claim surfaces.
  const scan = await trpc<{
    item: { id: string; status: string };
    pendingClaim: { id: string; claimantName: string } | null;
  }>("items.scan", { json: { qrCode: item.qrCode } }, staffToken);
  check("items.scan resolves item", scan.item.id === item.id);
  check("scan surfaces pending claim", scan.pendingClaim?.id === claim.id);

  // 5. Confirm release after verified scan.
  const released = await trpc<{ id: string; status: string }>(
    "items.release",
    { json: { itemId: item.id } },
    staffToken,
  );
  check("release succeeds after scan", released.status === "RELEASED");

  // 6. Audit chain records the custody history.
  const audit = await trpc<{ action: string }[]>(
    `audit.forItem?input=${encodeURIComponent(JSON.stringify({ json: { itemId: item.id } }))}`,
    null,
    staffToken,
  );
  const actions = audit.map((a) => a.action);
  check(
    "audit chain complete",
    ["FOUND", "CLAIM_REQUESTED", "RELEASED"].every((a) => actions.includes(a)),
    actions.join(" -> "),
  );

  // 7. Student role cannot log items (staff-only guard).
  let forbidden = false;
  try {
    await trpc(
      "items.log",
      {
        json: {
          name: "Should Fail",
          category: "Other",
          location: "Nowhere",
          foundDate: new Date().toISOString(),
        },
      },
      studentToken,
    );
  } catch {
    forbidden = true;
  }
  check("student blocked from items.log", forbidden);

  console.log(results.join("\n"));
  if (process.exitCode === 1) process.exit(1);

  // Cleanup: children first (notifications -> audit -> claims -> item -> users).
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing for cleanup");
  const { db, client } = createDb(url);
  await db.delete(notifications).where(eq(notifications.foundItemId, item.id));
  await db.delete(auditEvents).where(eq(auditEvents.foundItemId, item.id));
  await db.delete(claims).where(eq(claims.foundItemId, item.id));
  await db.delete(items).where(eq(items.id, item.id));
  await db
    .delete(users)
    .where(
      inArray(users.clerkId, ["dev_e2e_staff", "dev_e2e_student"]),
    );
  await client.end();
  console.log("cleanup: test rows removed");
}

import {
  claims,
  auditEvents,
  notifications,
  foundItems as items,
  users,
} from "../server/db/schema";

main().catch((e) => {
  console.error("E2E smoke failed:", e.message);
  process.exit(1);
});
