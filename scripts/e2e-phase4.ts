/**
 * Phase 4 E2E smoke: lost reports, structured matching, notifications.
 * Exercises match and no-match paths against the live API + Neon.
 * Requires the server started with ALLOW_DEV_LOGIN=true.
 * Cleans up its own rows. Run: corepack pnpm exec tsx scripts/e2e-phase4.ts
 */
import "dotenv/config";

import { eq, inArray, like, or } from "drizzle-orm";

import {
  auditEvents,
  claims,
  foundItems as items,
  lostReports,
  notifications,
  users,
} from "../server/db/schema";
import { createDb } from "../server/db/client";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const STAFF = { name: "E2E4 Staff", role: "staff" as const };
const STUDENT = { name: "E2E4 Student", role: "student" as const };

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

  // 1. Staff logs two items that should match the upcoming report, and one
  //    that must never match (wrong category + predates the loss).
  const matchingItem = await trpc<{ id: string; qrCode: string }>("items.log", {
    json: {
      name: "Navy Backpack",
      category: "Bags",
      location: "Library 2nd floor",
      foundDate: new Date(Date.now() - 86_400_000).toISOString(),
      description:
        "Black backpack with an astronomy patch on the front pocket, broken left strap adjuster",
    },
  });
  const secondMatchingItem = await trpc<{ id: string; qrCode: string }>(
    "items.log",
    {
      json: {
        name: "School Bag",
        category: "Bags",
        location: "Library entrance",
        foundDate: new Date().toISOString(),
        description: "Blue canvas bag with pencil case",
      },
    },
  );
  const nonMatchingItem = await trpc<{ id: string; qrCode: string }>(
    "items.log",
    {
      json: {
        name: "Black Umbrella",
        category: "Bags",
        location: "Library 2nd floor",
        // Predates the loss window below by 10 days.
        foundDate: new Date(Date.now() - 11 * 86_400_000).toISOString(),
        description: "Long black umbrella with wooden handle",
      },
    },
  );
  const wrongCategoryItem = await trpc<{ id: string; qrCode: string }>(
    "items.log",
    {
      json: {
        name: "Navy Backpack",
        category: "Electronics",
        location: "Library 2nd floor",
        foundDate: new Date().toISOString(),
        description:
          "Black backpack with an astronomy patch on the front pocket",
      },
    },
  );
  check("staff logged 4 test items", Boolean(matchingItem.id && secondMatchingItem.id));

  // 2. Student files a report through the shared validation contract.
  let report: { id: string; category: string; status: string };
  try {
    report = await trpc<{ id: string; category: string; status: string }>(
      "reports.create",
      {
        json: {
          category: "Bags",
          description:
            "Lost my black backpack with an astronomy patch on the front pocket and a broken left strap adjuster",
          dateLost: new Date(Date.now() - 3 * 86_400_000).toISOString(),
          locationLost: "Library, Building A",
        },
      },
      studentToken,
    );
  } catch (e) {
    check("report created", false, (e as Error).message);
    throw e;
  }
  check("report created and persisted", Boolean(report.id), report.id);

  // 3. Validation: short description rejected.
  let shortRejected = false;
  try {
    await trpc(
      "reports.create",
      { json: { category: "Bags", description: "bag", dateLost: new Date().toISOString(), locationLost: "Library" } },
      studentToken,
    );
  } catch {
    shortRejected = true;
  }
  check("short description rejected (min 10)", shortRejected);

  let badCategoryRejected = false;
  try {
    await trpc(
      "reports.create",
      {
        json: {
          category: "Vehicles",
          description: "A perfectly valid long description here",
          dateLost: new Date().toISOString(),
          locationLost: "Library",
        },
      },
      studentToken,
    );
  } catch {
    badCategoryRejected = true;
  }
  check("invalid category rejected", badCategoryRejected);

  // 4. reports.mine returns the report with a match count >= 1.
  const mine = await trpc<{ id: string; matchCount: number }[]>(
    "reports.mine",
    null,
    studentToken,
  );
  const mineRow = mine.find((r) => r.id === report.id);
  check(
    "reports.mine returns match count",
    Boolean(mineRow) && typeof mineRow!.matchCount === "number",
    `matchCount=${mineRow?.matchCount}`,
  );

  // 5. Structured matches: the two same-category items found after the loss
  //    with overlapping text rank; the pre-loss item and the wrong-category
  //    item must be absent.
  const matches = await trpc<{ item: { id: string }; score: number; reasons: string[] }[]>(
    `reports.matches?input=${encodeURIComponent(
      JSON.stringify({ json: { reportId: report.id } }),
    )}`,
    null,
    studentToken,
  );
  const matchIds = matches.map((m) => m.item.id);
  check(
    "matching item ranked with reasons",
    matchIds.includes(matchingItem.id),
    `score=${matches.find((m) => m.item.id === matchingItem.id)?.score}`,
  );
  check(
    "matches sorted strongest-first",
    matches.every(
      (m, i) => i === 0 || matches[i - 1].score >= m.score,
    ),
  );
  check(
    "no-match: item predating the loss excluded",
    !matchIds.includes(nonMatchingItem.id),
  );
  check(
    "no-match: wrong-category item excluded",
    !matchIds.includes(wrongCategoryItem.id),
  );
  check(
    "second same-category item also ranked",
    matchIds.includes(secondMatchingItem.id),
  );

  // 6. MATCH_FOUND notifications were created for the student.
  const notifs = await trpc<{ kind: string; title: string }[]>(
    "notifications.list",
    null,
    studentToken,
  );
  const matchNotifs = notifs.filter((n) => n.kind === "MATCH_FOUND");
  check(
    "MATCH_FOUND notifications persisted",
    matchNotifs.length >= 1,
    `count=${matchNotifs.length}`,
  );

  // 7. Full loop: claim from match -> report flips to MATCHED.
  await trpc(
    "claims.submit",
    {
      json: {
        foundItemId: matchingItem.id,
        verificationAnswer: "Astronomy patch on the front pocket",
        lostReportId: report.id,
      },
    },
    studentToken,
  );
  const mineAfter = await trpc<{ id: string; status: string }[]>(
    "reports.mine",
    null,
    studentToken,
  );
  check(
    "claim links report -> status MATCHED",
    mineAfter.find((r) => r.id === report.id)?.status === "MATCHED",
  );

  console.log(results.join("\n"));

  // Cleanup: all rows created by this run (children first).
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing for cleanup");
  const { db, client } = createDb(url);

  const itemIds = [matchingItem.id, secondMatchingItem.id, nonMatchingItem.id, wrongCategoryItem.id];
  await db.delete(notifications).where(inArray(notifications.foundItemId, itemIds));
  await db.delete(auditEvents).where(inArray(auditEvents.foundItemId, itemIds));
  await db.delete(claims).where(inArray(claims.foundItemId, itemIds));
  await db.delete(items).where(inArray(items.id, itemIds));

  const reportIds = (
    await db.select({ id: lostReports.id }).from(lostReports).where(eq(lostReports.category, "Bags"))
  )
    .map((r) => r.id)
    .filter((id) => id === report.id);
  if (reportIds.length) {
    await db.delete(claims).where(inArray(claims.lostReportId, reportIds));
    await db.delete(lostReports).where(inArray(lostReports.id, reportIds));
  }

  const userIds = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(or(like(users.clerkId, "dev_e2e4%"), like(users.clerkId, "dev_E2E4%")))
  )
    .map((r) => r.id);
  if (userIds.length) {
    await db.delete(notifications).where(inArray(notifications.userId, userIds));
    await db.delete(lostReports).where(inArray(lostReports.studentId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  await client.end();
  console.log("cleanup: phase 4 test rows removed");
  if (process.exitCode === 1) process.exit(1);
}

main().catch((e) => {
  console.error("Phase 4 E2E failed:", e.message);
  process.exit(1);
});
