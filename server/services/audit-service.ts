/**
 * Audit event service (Phase 2).
 *
 * The audit trail is append-only: FOUND -> MATCHED -> CLAIM REQUESTED ->
 * RELEASED with actor and timestamp. Rows are never updated or deleted.
 */
import { desc, eq } from "drizzle-orm";

import type { ItemStatus } from "../../shared/workflow";
import { getDb } from "../db/client";
import { auditEvents } from "../db/schema";

export type AuditAction = (typeof auditEvents.$inferSelect)["action"];

export type AuditEventDto = {
  id: string;
  foundItemId: string;
  actorName: string;
  action: AuditAction;
  detail: string | null;
  createdAt: Date;
};

export function toAuditDto(row: typeof auditEvents.$inferSelect): AuditEventDto {
  return {
    id: row.id,
    foundItemId: row.foundItemId,
    actorName: row.actorName,
    action: row.action,
    detail: row.detail,
    createdAt: row.createdAt,
  };
}

export async function recordAuditEvent(input: {
  foundItemId: string;
  actorId: string | null;
  actorName: string;
  action: AuditAction;
  detail?: string;
}): Promise<AuditEventDto> {
  const db = getDb();
  const inserted = await db
    .insert(auditEvents)
    .values({
      foundItemId: input.foundItemId,
      actorId: input.actorId,
      actorName: input.actorName,
      action: input.action,
      detail: input.detail ?? null,
    })
    .returning();
  return toAuditDto(inserted[0]);
}

export async function listAuditForItem(foundItemId: string): Promise<AuditEventDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.foundItemId, foundItemId))
    .orderBy(desc(auditEvents.createdAt));
  return rows.map(toAuditDto);
}

export async function listRecentAudit(limit = 50): Promise<AuditEventDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  return rows.map(toAuditDto);
}

export type { ItemStatus };
