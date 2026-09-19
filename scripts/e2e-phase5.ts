/**
 * Phase 5 E2E smoke: QR scan-to-release workflow with staff authorization,
 * QR validation, claimant recording, timestamps, and append-only audit.
 * Exercises rejected release attempts against the live API + Neon.
 * Requires the server started with ALLOW_DEV_LOGIN=true.
 * Cleans up its own rows. Run: corepack pnpm exec tsx scripts/e2e-phase5.ts
 */
import "dotenv/config";

import { eq, inArray, like, or } from "drizzle-orm";

import {
  auditEvents,
  claims,
  foundItems as items,
  notifications,
  users,
} from "../server/db/schema";
import { createDb } from "../server/db/client";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const STAFF = { name: "E2E5 Staff", role: "staff" as const };
const STUDENT = { name: "E2E5 Student", role: "student" as const };
const STAFF2 = { name: "E2E5 Staff Two", role: "staff" as const };

let staffToken = "";
let studentToken = "";
let staff2Token = "";

async function trpc<T>(
  path: string,
  body: unknown | null,
  token = staffToken,
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
  if (json.error) {
    const err = new Error(json.error.json.message) as Error & { name: string };
    err.name = "TRPCClientError";
    throw err;
  }
  return (json.result?.data?.json ?? (json as unknown)) as T;
}

async function main() {
  const results: string[] = [];
  const check = (label: string, ok: boolean, extra = "") => {
    results.push(`${ok ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
    if (!ok) process.exitCode = 1;
  };

  staffToken = `dev.${STAFF.name.replace(/\s+/g, "_")}.staff`;
  studentToken = `dev.${STUDENT.name.replace(/\s+/g, "_")}.student`;
  staff2Token = `dev.${STAFF2.name.replace(/\s+/g, "_")}.staff`;
  await trpc("auth.devLogin", { json: STAFF });
  await trpc("auth.devLogin", { json: STUDENT }, studentToken);
  await trpc("auth.devLogin", { json: STAFF2 }, staff2Token);

  // Setup: staff logs an item; student submits a claim.
  const item = await trpc<{ id: string; qrCode: string; status: string }>(
    "items.log",
    {
      json: {
        name: "Phase5 Release Tablet",
        category: "Electronics",
        location: "E2E5 Desk",
        foundDate: new Date().toISOString(),
        description: "Silver tablet with a cracked corner",
      },
    },
  );

  let releaseRejectedNoScan = "";
  try {
    await trpc("items.release", { json: { itemId: item.id } });
  } catch (e) {
    releaseRejectedNoScan = (e as Error).message;
  }
  check(
    "REJECT: release without any scan",
    /scan/i.test(releaseRejectedNoScan),
    releaseRejectedNoScan.slice(0, 60),
  );

  let invalidQrRejected = "";
  try {
    await trpc(
      "items.scan",
      { json: { qrCode: "MALFORMED-PAYLOAD" } },
      staffToken,
    );
  } catch (e) {
    invalidQrRejected = (e as Error).message;
  }
  check(
    "REJECT: malformed QR payload rejected at input",
    /QR|payload/i.test(invalidQrRejected),
    invalidQrRejected.slice(0, 60),
  );

  let studentScanRejected = "";
  try {
    await trpc(
      "items.scan",
      { json: { qrCode: item.qrCode } },
      studentToken,
    );
  } catch (e) {
    studentScanRejected = (e as Error).message;
  }
  check(
    "REJECT: student cannot call scan (staff-only)",
    studentScanRejected.length > 0,
    studentScanRejected.slice(0, 60),
  );

  let studentReleaseRejected = "";
  try {
    await trpc(
      "items.release",
      { json: { itemId: item.id } },
      studentToken,
    );
  } catch (e) {
    studentReleaseRejected = (e as Error).message;
  }
  check(
    "REJECT: student cannot call release (staff-only)",
    studentReleaseRejected.length > 0,
    studentReleaseRejected.slice(0, 60),
  );

  let unknownQr = "";
  try {
    await trpc(
      "items.scan",
      { json: { qrCode: "CLM-0000-0000-0000000000000000" } },
      staffToken,
    );
  } catch (e) {
    unknownQr = (e as Error).message;
  }
  check(
    "REJECT: well-formed payload for unknown item",
    /unknown/i.test(unknownQr),
    unknownQr.slice(0, 60),
  );

  // Pending-claim rule: release is blocked while no claim exists, even with
  // a fresh scan. Scan first (fresh), then attempt release BEFORE claiming.
  await trpc("items.scan", { json: { qrCode: item.qrCode } }, staffToken);
  let releaseRejectedNoClaim = "";
  try {
    await trpc("items.release", { json: { itemId: item.id } });
  } catch (e) {
    releaseRejectedNoClaim = (e as Error).message;
  }
  check(
    "REJECT: release with fresh scan but no pending claim",
    /pending claim/i.test(releaseRejectedNoClaim),
    releaseRejectedNoClaim.slice(0, 60),
  );

  // Student claims; another staff member scans (any staff may verify).
  const claim = await trpc<{ id: string }>(
    "claims.submit",
    {
      json: {
        foundItemId: item.id,
        verificationAnswer: "Cracked corner on the bottom left",
      },
    },
    studentToken,
  );
  check("claim submitted", Boolean(claim.id));

  const scanned = await trpc<{ item: { id: string; status: string } }>(
    "items.scan",
    { json: { qrCode: item.qrCode } },
    staff2Token,
  );
  check(
    "scan returns item + pending claimant",
    scanned.item.id === item.id && scanned.item.status === "CLAIM_REQUESTED",
  );

  // Happy path: release after a fresh scan.
  const released = await trpc<{ id: string; status: string }>(
    "items.release",
    { json: { itemId: item.id } },
    staff2Token,
  );
  check("release succeeds after fresh scan", released.status === "RELEASED");

  // Idempotence/terminality: releasing again must fail.
  let reRelease = "";
  try {
    await trpc("items.release", { json: { itemId: item.id } });
  } catch (e) {
    reRelease = (e as Error).message;
  }
  check(
    "REJECT: re-release of a released item",
    /already released/i.test(reRelease),
    reRelease.slice(0, 60),
  );

  // Verify timestamps + append-only audit trail via direct DB read.
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing for verification");
  const { db, client } = createDb(url);

  const row = (
    await db.select().from(items).where(eq(items.id, item.id)).limit(1)
  )[0];
  check(
    "releasedAt timestamp recorded",
    row?.releasedAt instanceof Date,
    row?.releasedAt?.toISOString() ?? "missing",
  );
  check(
    "lastScannedBy recorded the scanning staff",
    row?.lastScannedBy !== null,
  );

  const audit = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.foundItemId, item.id));
  const actions = audit.map((a) => a.action);
  check(
    "audit chain FOUND -> CLAIM_REQUESTED -> RELEASED",
    actions.includes("FOUND") &&
      actions.includes("CLAIM_REQUESTED") &&
      actions.includes("RELEASED"),
    actions.join(","),
  );
  const releasedEvent = audit.find((a) => a.action === "RELEASED");
  check(
    "RELEASED audit records claimant identity",
    Boolean(releasedEvent?.detail?.includes("E2E5 Student")),
    releasedEvent?.detail?.slice(0, 70) ?? "missing",
  );
  const foundCount = audit.filter((a) => a.action === "FOUND").length;
  const releasedCount = audit.filter((a) => a.action === "RELEASED").length;
  check(
    "audit is append-only (no duplicate FOUND/RELEASED)",
    foundCount === 1 && releasedCount === 1,
  );

  console.log(results.join("\n"));

  // Cleanup (children first).
  const itemIds = [item.id];
  await db.delete(notifications).where(inArray(notifications.foundItemId, itemIds));
  await db.delete(auditEvents).where(inArray(auditEvents.foundItemId, itemIds));
  await db.delete(claims).where(inArray(claims.foundItemId, itemIds));
  await db.delete(items).where(inArray(items.id, itemIds));

  const userIds = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(or(like(users.clerkId, "dev_e2e5%"), like(users.clerkId, "dev_E2E5%")))
  ).map((r) => r.id);
  if (userIds.length) {
    await db.delete(notifications).where(inArray(notifications.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  await client.end();
  console.log("cleanup: phase 5 test rows removed");
  if (process.exitCode === 1) process.exit(1);
}

main().catch((e) => {
  console.error("Phase 5 E2E failed:", e.message);
  process.exit(1);
});
