/**
 * Phase 6 E2E smoke: push token registry, notification fan-out, deep-link
 * payloads, and the no-SMS guarantee. Exercises granted / denied / token-
 * unavailable paths (unit-level in tests/phase6-push.test.ts) plus the
 * server side against the live API + Neon.
 * Requires the server started with ALLOW_DEV_LOGIN=true.
 * Cleans up its own rows. Run: corepack pnpm exec tsx scripts/e2e-phase6.ts
 */
import "dotenv/config";

import { eq, inArray, like, or } from "drizzle-orm";

import {
  auditEvents,
  claims,
  foundItems as items,
  lostReports,
  notifications,
  pushTokens,
  users,
} from "../server/db/schema";
import { createDb } from "../server/db/client";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const STAFF = { name: "E2E6 Staff", role: "staff" as const };
const STUDENT = { name: "E2E6 Student", role: "student" as const };

let staffToken = "";
let studentToken = "";

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
  await trpc("auth.devLogin", { json: STAFF });
  await trpc("auth.devLogin", { json: STUDENT }, studentToken);

  // 1. Token registration: valid Expo token shape is accepted.
  const TOKEN = "ExponentPushToken[e2e6-test-token-0000000000]";
  const registered = await trpc<{ id: string; expoPushToken: string }>(
    "notifications.registerPushToken",
    {
      json: {
        expoPushToken: TOKEN,
        deviceName: "E2E6 Device",
        platform: "android",
      },
    },
    studentToken,
  );
  check("valid token registered", Boolean(registered.id), TOKEN.slice(0, 28));

  // Re-registration updates rather than duplicates.
  await trpc(
    "notifications.registerPushToken",
    { json: { expoPushToken: TOKEN, platform: "android" } },
    studentToken,
  );

  // 2. Token validation: malformed tokens rejected at the API boundary.
  let malformedRejected = "";
  try {
    await trpc(
      "notifications.registerPushToken",
      { json: { expoPushToken: "not-an-expo-token" } },
      studentToken,
    );
  } catch (e) {
    malformedRejected = (e as Error).message;
  }
  check(
    "REJECT: malformed token format",
    /token/i.test(malformedRejected),
    malformedRejected.slice(0, 50),
  );

  // 3. Fan-out: staff logs a matching item AFTER the student files a report
  //    -> report creation fires MATCH_FOUND to the student's token.
  await trpc(
    "reports.create",
    {
      json: {
        category: "Electronics",
        description:
          "Silver e-reader with a green case and a pencil smudge on screen",
        dateLost: new Date(Date.now() - 86_400_000).toISOString(),
        locationLost: "Engineering Hall",
      },
    },
    studentToken,
  );
  const matchingItem = await trpc<{ id: string }>("items.log", {
    json: {
      name: "E-Reader",
      category: "Electronics",
      location: "Engineering Hall",
      foundDate: new Date().toISOString(),
      description: "Silver e-reader with a green case",
    },
  });

  const studentNotifs = await trpc<{ id: string; kind: string; title: string }[]>(
    "notifications.list",
    null,
    studentToken,
  );
  const matchNotifs = studentNotifs.filter((n) => n.kind === "MATCH_FOUND");
  check(
    "MATCH_FOUND notification persisted for student",
    matchNotifs.length >= 1,
    `count=${matchNotifs.length}`,
  );

  // 4. Push dispatch ran (best-effort) without failing the mutation; the
  //    token row remains enabled because Expo cannot reach a fake token
  //    (network error path is swallowed by design).
  //    Direct DB check for the registry row.
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing for verification");
  const { db, client } = createDb(url);

  const tokenRow = (
    await db.select().from(pushTokens).where(eq(pushTokens.expoPushToken, TOKEN)).limit(1)
  )[0];
  check("token row persisted in registry", Boolean(tokenRow?.id));

  // Re-registration must UPDATE, not duplicate (unique per token).
  const tokenRowCount = (
    await db.select({ id: pushTokens.id }).from(pushTokens).where(eq(pushTokens.expoPushToken, TOKEN))
  ).length;
  check("re-registration does not duplicate the token", tokenRowCount === 1);

  // INFO (non-fatal): with a fake-but-well-formed token, a successful Expo
  // API roundtrip returns DeviceNotRegistered and the dispatcher disables
  // the token (the dead-token path). Sandbox network access varies, so this
  // is observed but not asserted.
  await new Promise((r) => setTimeout(r, 3000));
  const afterSend = (
    await db.select().from(pushTokens).where(eq(pushTokens.expoPushToken, TOKEN)).limit(1)
  )[0];
  results.push(
    `INFO token state after fan-out: enabled=${afterSend?.enabled} (false = dead-token path exercised)`,
  );

  // 5. Claim flow fires CLAIM_DECISION to staff tokens.
  await trpc(
    "claims.submit",
    {
      json: {
        foundItemId: matchingItem.id,
        verificationAnswer: "Pencil smudge on the screen",
      },
    },
    studentToken,
  );
  const staffNotifs = await trpc<{ kind: string }[]>(
    "notifications.list",
    null,
    staffToken,
  );
  check(
    "CLAIM_DECISION notification persisted for staff",
    staffNotifs.some((n) => n.kind === "CLAIM_DECISION"),
  );

  // 6. No-SMS guarantee: the schema and dispatcher only know Expo tokens.
  const raw = (await db.execute(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'push_tokens'",
  )) as unknown as { rows?: { column_name: string }[] } | { column_name: string }[];
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
  const columns = rows.map((r) => r.column_name);
  check(
    "no SMS/channel columns in push_tokens (Expo-only)",
    columns.every((c) => !/sms|phone/i.test(c)),
    columns.sort().join(","),
  );

  // 7. Opt-out: disable procedure flips the token off.
  await trpc(
    "notifications.disablePushToken",
    { json: { expoPushToken: TOKEN } },
    studentToken,
  );
  const afterOptOut = (
    await db.select().from(pushTokens).where(eq(pushTokens.expoPushToken, TOKEN)).limit(1)
  )[0];
  check("opt-out disables the token", afterOptOut?.enabled === false);

  console.log(results.join("\n"));

  // Cleanup (children first). Collect items BOTH from this run and any
  // previously crashed run (items logged by these dev users).
  const userIds = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(or(like(users.clerkId, "dev_e2e6%"), like(users.clerkId, "dev_E2E6%")))
  ).map((r) => r.id);

  const itemIds = new Set<string>([matchingItem.id]);
  if (userIds.length) {
    for (const row of await db
      .select({ id: items.id })
      .from(items)
      .where(inArray(items.loggedByStaffId, userIds))) {
      itemIds.add(row.id);
    }
  }
  const itemIdsArr = [...itemIds];
  if (itemIdsArr.length) {
    await db.delete(notifications).where(inArray(notifications.foundItemId, itemIdsArr));
    await db.delete(auditEvents).where(inArray(auditEvents.foundItemId, itemIdsArr));
    await db.delete(claims).where(inArray(claims.foundItemId, itemIdsArr));
    await db.delete(items).where(inArray(items.id, itemIdsArr));
  }

  if (userIds.length) {
    await db.delete(pushTokens).where(inArray(pushTokens.userId, userIds));
    await db.delete(notifications).where(inArray(notifications.userId, userIds));
    const reportIds = (
      await db.select({ id: lostReports.id }).from(lostReports).where(inArray(lostReports.studentId, userIds))
    ).map((r) => r.id);
    if (reportIds.length) {
      await db.delete(claims).where(inArray(claims.lostReportId, reportIds));
      await db.delete(lostReports).where(inArray(lostReports.id, reportIds));
    }
    await db.delete(users).where(inArray(users.id, userIds));
  }
  await client.end();
  console.log("cleanup: phase 6 test rows removed");
  if (process.exitCode === 1) process.exit(1);
}

main().catch((e) => {
  console.error("Phase 6 E2E failed:", e.message);
  process.exit(1);
});
