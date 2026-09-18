/**
 * Phase 3 E2E smoke: staff item logging, validation, QR tags, audit FOUND.
 * Exercises duplicate, missing, and invalid data paths against the live
 * API + Neon. Requires the server started with ALLOW_DEV_LOGIN=true.
 * Cleans up its own rows. Run: corepack pnpm exec tsx scripts/e2e-phase3.ts
 */
import "dotenv/config";

import { eq, inArray, like } from "drizzle-orm";

import { isValidQrPayload } from "../shared/validation";
import {
  auditEvents,
  foundItems as items,
  notifications,
  users,
} from "../server/db/schema";
import { createDb } from "../server/db/client";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const STAFF = { name: "E2E3 Staff", role: "staff" as const };

let staffToken = "";

async function trpc<T>(path: string, body: unknown | null): Promise<T> {
  const res = await fetch(`${BASE}/trpc/${path}`, {
    method: body === null ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(staffToken ? { authorization: `Bearer ${staffToken}` } : {}),
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
  await trpc("auth.devLogin", { json: STAFF });

  const baseItem = {
    name: "Phase3 Test Umbrella",
    category: "Other" as const,
    location: "Phase3 Location",
    foundDate: new Date().toISOString(),
  };

  // 1. Valid log succeeds and returns a canonical opaque QR payload.
  const item = await trpc<{ id: string; qrCode: string; status: string }>(
    "items.log",
    { json: baseItem },
  );
  check("valid log succeeds", Boolean(item.id));
  check("QR payload matches canonical format", isValidQrPayload(item.qrCode), item.qrCode);
  check("item starts FOUND", item.status === "FOUND");

  // 2. Missing data is rejected with field-level validation errors.
  let missingRejected = false;
  try {
    await trpc("items.log", { json: { foundDate: new Date().toISOString() } });
  } catch (e) {
    missingRejected = /category|name|location/i.test((e as Error).message);
  }
  check("missing fields rejected", missingRejected);

  // 3. Invalid data (bad category, empty name, malformed URL) is rejected.
  let invalidRejected = false;
  try {
    await trpc("items.log", {
      json: { ...baseItem, category: "Vehicles", name: "" },
    });
  } catch {
    invalidRejected = true;
  }
  check("invalid fields rejected", invalidRejected);

  let badUrlRejected = false;
  try {
    await trpc("items.log", { json: { ...baseItem, imageUrl: "not-a-url" } });
  } catch {
    badUrlRejected = true;
  }
  check("invalid imageUrl rejected", badUrlRejected);

  // 4. Duplicate submissions both succeed with DISTINCT QR payloads
  //    (uniqueness is per-item identity, not a blocked duplicate form).
  const dupe = await trpc<{ id: string; qrCode: string }>(
    "items.log",
    { json: baseItem },
  );
  check("duplicate log accepted", Boolean(dupe.id));
  check("duplicate log gets unique QR", dupe.qrCode !== item.qrCode);

  // 5. Tag rendering returns a PNG data URL for the item.
  const tag = await trpc<{ qrDataUrl: string; item: { qrCode: string } }>(
    `items.tag?input=${encodeURIComponent(JSON.stringify({ json: { itemId: item.id } }))}`,
    null,
  );
  check(
    "tag renders QR data URL",
    tag.qrDataUrl.startsWith("data:image/png;base64,"),
  );
  check("tag carries the item QR payload", tag.item.qrCode === item.qrCode);

  // 6. Tag render for an unknown item fails cleanly.
  let unknownRejected = false;
  try {
    await trpc(
      `items.tag?input=${encodeURIComponent(JSON.stringify({ json: { itemId: "00000000-0000-4000-8000-000000000000" } }))}`,
      null,
    );
  } catch {
    unknownRejected = true;
  }
  check("unknown item tag rejected", unknownRejected);

  // 7. FOUND audit event persisted exactly once for the item.
  const audit = await trpc<{ action: string }[]>(
    `audit.forItem?input=${encodeURIComponent(JSON.stringify({ json: { itemId: item.id } }))}`,
    null,
  );
  const foundEvents = audit.filter((a) => a.action === "FOUND");
  check("audit FOUND persisted", foundEvents.length === 1);

  console.log(results.join("\n"));

  // Cleanup: remove all Phase 3 test rows (children first).
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing for cleanup");
  const { db, client } = createDb(url);
  const testItemIds = (
    await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.location, "Phase3 Location"))
  ).map((r) => r.id);
  if (testItemIds.length) {
    await db.delete(notifications).where(inArray(notifications.foundItemId, testItemIds));
    await db.delete(auditEvents).where(inArray(auditEvents.foundItemId, testItemIds));
    await db.delete(items).where(inArray(items.id, testItemIds));
  }
  const testUserIds = (
    await db.select({ id: users.id }).from(users).where(like(users.clerkId, "dev_e2e3%"))
  ).map((r) => r.id);
  if (testUserIds.length) {
    await db.delete(notifications).where(inArray(notifications.userId, testUserIds));
    await db.delete(users).where(inArray(users.id, testUserIds));
  }
  await client.end();
  console.log("cleanup: phase 3 test rows removed");
  if (process.exitCode === 1) process.exit(1);
}

main().catch((e) => {
  console.error("Phase 3 E2E failed:", e.message);
  process.exit(1);
});
