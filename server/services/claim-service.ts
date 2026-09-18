/**
 * Claim service (Phase 2).
 *
 * Implements the product's core rule: an item can only be released after
 * a staff member scans the item's QR tag (scanVerifiedAt set) and confirms.
 * All state changes append audit events.
 */
import { and, desc, eq } from "drizzle-orm";

import { canRelease } from "../../shared/workflow";
import { getDb } from "../db/client";
import { claims, foundItems, users } from "../db/schema";
import {
  getFoundItem,
  toItemDto,
  transitionItemStatus,
  type FoundItemDto,
} from "./found-item-service";
import { markReportMatched } from "./lost-report-service";
import { createNotification } from "./notification-service";

export type ClaimDto = {
  id: string;
  foundItemId: string;
  studentId: string;
  claimantName: string;
  verificationAnswer: string;
  status: (typeof claims.$inferSelect)["status"];
  claimedAt: Date;
};

export function toClaimDto(
  row: typeof claims.$inferSelect,
  claimantName: string,
): ClaimDto {
  return {
    id: row.id,
    foundItemId: row.foundItemId,
    studentId: row.studentId,
    claimantName,
    verificationAnswer: row.verificationAnswer,
    status: row.status,
    claimedAt: row.claimedAt,
  };
}

export async function submitClaim(input: {
  foundItemId: string;
  studentId: string;
  studentName: string;
  verificationAnswer: string;
  lostReportId?: string | null;
}): Promise<ClaimDto> {
  const db = getDb();
  const item = await getFoundItem(input.foundItemId);
  if (!item) throw new Error("Item not found");
  if (item.status === "RELEASED") throw new Error("Item is already released");

  // One pending claim per item.
  const existingPending = await db
    .select()
    .from(claims)
    .where(and(eq(claims.foundItemId, input.foundItemId), eq(claims.status, "PENDING")))
    .limit(1);
  if (existingPending[0]) throw new Error("Item already has a pending claim");

  const inserted = await db
    .insert(claims)
    .values({
      foundItemId: input.foundItemId,
      studentId: input.studentId,
      lostReportId: input.lostReportId ?? null,
      verificationAnswer: input.verificationAnswer,
    })
    .returning();

  await transitionItemStatus({
    itemId: input.foundItemId,
    to: "CLAIM_REQUESTED",
    actorId: input.studentId,
    actorName: input.studentName,
    detail: "Claim submitted with verification answer",
  });

  if (input.lostReportId) {
    await markReportMatched(input.lostReportId);
  }

  // Notify staff users that a claim is waiting (Phase 6 delivers via push).
  const staff = await db.select().from(users).where(eq(users.role, "staff"));
  for (const s of staff) {
    await createNotification({
      userId: s.id,
      kind: "CLAIM_DECISION",
      title: "New claim submitted",
      body: `${input.studentName} submitted a claim for ${item.name}.`,
      foundItemId: item.id,
    });
  }

  return toClaimDto(inserted[0], input.studentName);
}

export type ScanResult = {
  item: FoundItemDto;
  pendingClaim: ClaimDto | null;
};

/**
 * Staff scans an item's QR tag. Records the scan time and returns the
 * item with its pending claim so the app can render the verification
 * sheet (claimant + answer). Scanning alone does NOT release the item.
 */
export async function scanQrTag(input: {
  qrCode: string;
  staffId: string;
  staffName: string;
}): Promise<ScanResult> {
  const db = getDb();
  const rows = await db
    .select()
    .from(foundItems)
    .where(eq(foundItems.qrCode, input.qrCode))
    .limit(1);
  const item = rows[0];
  if (!item) throw new Error("Unknown QR code");

  await db
    .update(foundItems)
    .set({ lastScannedAt: new Date(), updatedAt: new Date() })
    .where(eq(foundItems.id, item.id));

  const pending = await db
    .select({ claim: claims, student: users })
    .from(claims)
    .innerJoin(users, eq(users.id, claims.studentId))
    .where(and(eq(claims.foundItemId, item.id), eq(claims.status, "PENDING")))
    .orderBy(desc(claims.claimedAt))
    .limit(1);

  return {
    item: toItemDto(item),
    pendingClaim: pending[0]
      ? toClaimDto(pending[0].claim, pending[0].student.name)
      : null,
  };
}

/** Confirm release: requires a prior verified scan + pending claim. */
export async function confirmRelease(input: {
  itemId: string;
  staffId: string;
  staffName: string;
}): Promise<FoundItemDto> {
  const db = getDb();
  const item = await getFoundItem(input.itemId);
  if (!item) throw new Error("Item not found");

  const pending = await db
    .select()
    .from(claims)
    .where(and(eq(claims.foundItemId, input.itemId), eq(claims.status, "PENDING")))
    .limit(1);
  const pendingClaim = pending[0] ?? null;

  const itemRow = await db
    .select()
    .from(foundItems)
    .where(eq(foundItems.id, input.itemId))
    .limit(1);
  const scanVerified = Boolean(itemRow[0]?.lastScannedAt);

  const decision = canRelease({
    status: item.status,
    staffScanVerified: scanVerified,
    hasPendingClaim: Boolean(pendingClaim),
  });
  if (!decision.allowed) throw new Error(decision.reason ?? "Release not allowed");

  const updated = await transitionItemStatus({
    itemId: input.itemId,
    to: "RELEASED",
    actorId: input.staffId,
    actorName: input.staffName,
    detail: pendingClaim
      ? `Item released to claimant (claim verified by staff scan)`
      : "Item released after staff scan",
  });

  if (pendingClaim) {
    await db
      .update(claims)
      .set({
        status: "APPROVED",
        decidedAt: new Date(),
        decidedByStaffId: input.staffId,
        updatedAt: new Date(),
      })
      .where(eq(claims.id, pendingClaim.id));
    await createNotification({
      userId: pendingClaim.studentId,
      kind: "CLAIM_DECISION",
      title: "Claim approved",
      body: `Your claim for ${item.name} was approved. The item was released to you.`,
      foundItemId: item.id,
    });
  }

  return updated;
}
