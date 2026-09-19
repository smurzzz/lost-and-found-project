/**
 * Push token registry (Phase 6).
 *
 * Devices register their Expo push token after the user grants
 * notification permission. Tokens are stored per user; delivery failures
 * flagged by Expo (e.g. uninstalled app) disable the token instead of
 * deleting it so the audit history survives.
 */
import { and, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { pushTokens } from "../db/schema";

export type RegisteredToken = {
  id: string;
  expoPushToken: string;
  enabled: boolean;
};

/** Validate the Expo token shape before storing anything. */
export function isValidExpoPushToken(value: string): boolean {
  return /^(ExponentPushToken|expo-push-token)\[[^\]]+\]$/.test(value);
}

export async function registerPushToken(input: {
  userId: string;
  expoPushToken: string;
  deviceName?: string | null;
  platform?: string | null;
}): Promise<RegisteredToken> {
  const db = getDb();
  const existing = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.expoPushToken, input.expoPushToken))
    .limit(1);

  if (existing[0]) {
    const updated = await db
      .update(pushTokens)
      .set({
        userId: input.userId,
        deviceName: input.deviceName ?? existing[0].deviceName,
        platform: input.platform ?? existing[0].platform,
        enabled: true,
        updatedAt: new Date(),
      })
      .where(eq(pushTokens.id, existing[0].id))
      .returning();
    return { id: updated[0].id, expoPushToken: updated[0].expoPushToken, enabled: updated[0].enabled };
  }

  const inserted = await db
    .insert(pushTokens)
    .values({
      userId: input.userId,
      expoPushToken: input.expoPushToken,
      deviceName: input.deviceName ?? null,
      platform: input.platform ?? null,
    })
    .returning();
  return { id: inserted[0].id, expoPushToken: inserted[0].expoPushToken, enabled: inserted[0].enabled };
}

export async function disablePushToken(input: {
  userId: string;
  expoPushToken: string;
}): Promise<void> {
  const db = getDb();
  await db
    .update(pushTokens)
    .set({ enabled: false, updatedAt: new Date() })
    .where(
      and(
        eq(pushTokens.userId, input.userId),
        eq(pushTokens.expoPushToken, input.expoPushToken),
      ),
    );
}

export async function listEnabledTokensForUser(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ expoPushToken: pushTokens.expoPushToken })
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.enabled, true)));
  return rows.map((r) => r.expoPushToken);
}
