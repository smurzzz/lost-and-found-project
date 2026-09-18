/**
 * Found item service (Phase 2).
 *
 * Staff log found items; every item receives an opaque QR tag identity.
 * Status transitions follow shared/workflow.ts and are enforced here and
 * in the tRPC layer — the client is never trusted.
 */
import { and, desc, eq, ne } from "drizzle-orm";

import type { ItemStatus } from "../../shared/workflow";
import { logFoundItemSchema, type LogFoundItemInput } from "../../shared/validation";
import { getDb } from "../db/client";
import { claims, foundItems, users } from "../db/schema";
import { recordAuditEvent } from "./audit-service";
import { generateUniqueQrPayload } from "./qr-service";

export type FoundItemDto = {
  id: string;
  qrCode: string;
  name: string;
  category: string;
  location: string;
  foundDate: Date;
  status: ItemStatus;
  imageUrl: string | null;
  qrTagReady: boolean;
};

export function toItemDto(row: typeof foundItems.$inferSelect): FoundItemDto {
  return {
    id: row.id,
    qrCode: row.qrCode,
    name: row.name,
    category: row.category,
    location: row.location,
    foundDate: row.foundDate,
    status: row.status,
    imageUrl: row.imageUrl,
    qrTagReady: row.qrTagReady,
  };
}

// QR payload generation moved to qr-service.ts (collision-safe, validated
// against the shared payload contract).

/**
 * Staff logs a found item. Validates through the shared contract, assigns
 * a collision-safe opaque QR payload, and persists the FOUND audit event.
 * Throws a validation error (`.issues`) on invalid/missing fields.
 */
export async function logFoundItem(
  rawInput: LogFoundItemInput & {
    staffId: string;
    staffName: string;
  },
): Promise<FoundItemDto> {
  // Defense in depth: tRPC already parsed this; re-validate for direct calls.
  const input = logFoundItemSchema.parse(rawInput);
  const db = getDb();
  const qrCode = await generateUniqueQrPayload();
  const inserted = await db
    .insert(foundItems)
    .values({
      name: input.name,
      category: input.category,
      location: input.location,
      foundDate: new Date(input.foundDate),
      imageUrl: input.imageUrl ?? null,
      loggedByStaffId: rawInput.staffId,
      qrCode,
      status: "FOUND",
      qrTagReady: true,
    })
    .returning();
  const item = inserted[0];
  await recordAuditEvent({
    foundItemId: item.id,
    actorId: rawInput.staffId,
    actorName: rawInput.staffName,
    action: "FOUND",
    detail: `Item logged at ${input.location}`,
  });
  return toItemDto(item);
}

export async function getFoundItem(id: string): Promise<FoundItemDto | null> {
  const db = getDb();
  const rows = await db.select().from(foundItems).where(eq(foundItems.id, id)).limit(1);
  return rows[0] ? toItemDto(rows[0]) : null;
}

/** Resolve an item by the QR payload scanned by staff. */
export async function getFoundItemByQr(qrCode: string): Promise<FoundItemDto | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(foundItems)
    .where(eq(foundItems.qrCode, qrCode))
    .limit(1);
  return rows[0] ? toItemDto(rows[0]) : null;
}

export type FoundItemWithClaim = FoundItemDto & {
  pendingClaimId: string | null;
  claimantName: string | null;
  verificationAnswer: string | null;
};

/** Items for the staff dashboard; pending-claim details are joined in. */
export async function listFoundItems(options?: {
  onlyPendingClaims?: boolean;
}): Promise<FoundItemWithClaim[]> {
  const db = getDb();
  const rows = await db
    .select({ item: foundItems, claim: claims, student: users })
    .from(foundItems)
    .leftJoin(
      claims,
      and(eq(claims.foundItemId, foundItems.id), eq(claims.status, "PENDING")),
    )
    .leftJoin(users, eq(users.id, claims.studentId))
    .orderBy(desc(foundItems.createdAt));

  const list = rows.map((r) => ({
    ...toItemDto(r.item),
    pendingClaimId: r.claim?.id ?? null,
    claimantName: r.student?.name ?? null,
    verificationAnswer: r.claim?.verificationAnswer ?? null,
  }));

  if (options?.onlyPendingClaims) {
    return list.filter((entry) => entry.pendingClaimId !== null);
  }
  return list;
}

/** Internal transition helper used by services/tRPC with rule enforcement. */
export async function transitionItemStatus(input: {
  itemId: string;
  to: ItemStatus;
  actorId: string;
  actorName: string;
  detail?: string;
}): Promise<FoundItemDto> {
  const db = getDb();
  const current = await getFoundItem(input.itemId);
  if (!current) throw new Error("Item not found");
  if (current.status === input.to) return current;
  if (current.status === "RELEASED") {
    throw new Error("Item is already released");
  }
  const updated = await db
    .update(foundItems)
    .set({ status: input.to, updatedAt: new Date() })
    .where(and(eq(foundItems.id, input.itemId), ne(foundItems.status, "RELEASED")))
    .returning();
  await recordAuditEvent({
    foundItemId: input.itemId,
    actorId: input.actorId,
    actorName: input.actorName,
    action: statusToAuditAction(input.to),
    detail: input.detail,
  });
  return toItemDto(updated[0]);
}

function statusToAuditAction(status: ItemStatus) {
  switch (status) {
    case "FOUND":
      return "FOUND" as const;
    case "MATCHED":
      return "MATCHED" as const;
    case "CLAIM_REQUESTED":
      return "CLAIM_REQUESTED" as const;
    case "RELEASED":
      return "RELEASED" as const;
  }
}
