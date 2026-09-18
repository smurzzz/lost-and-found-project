/**
 * Notification service (Phase 2).
 *
 * Persists in-app notifications. Push delivery through Expo Notifications
 * is intentionally deferred to Phase 6 per the phase plan.
 */
import { and, desc, eq, isNull } from "drizzle-orm";

import type { NotificationKind } from "../../shared/workflow";
import { getDb } from "../db/client";
import { notifications } from "../db/schema";

export type NotificationDto = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  foundItemId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function toNotificationDto(
  row: typeof notifications.$inferSelect,
): NotificationDto {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    foundItemId: row.foundItemId,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export async function createNotification(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  foundItemId?: string | null;
}): Promise<NotificationDto> {
  const db = getDb();
  const inserted = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      foundItemId: input.foundItemId ?? null,
    })
    .returning();
  return toNotificationDto(inserted[0]);
}

export async function listNotifications(userId: string): Promise<NotificationDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  return rows.map(toNotificationDto);
}

export async function unreadCount(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
