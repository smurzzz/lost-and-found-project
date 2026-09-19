/**
 * Expo push dispatcher (Phase 6).
 *
 * Sends probable-match and claim-decision pushes through expo-server-sdk.
 * Delivery is best-effort: a push outage must never fail the API mutation
 * that triggered it. Handles Expo rate limits and per-token errors by
 * disabling dead tokens. No SMS channels — Expo push only, by design.
 */
import { Expo, type ExpoPushMessage } from "expo-server-sdk";

import type { NotificationKind } from "../../shared/workflow";
import { disablePushToken, listEnabledTokensForUser } from "./push-token-service";

const expo = new Expo();

export type PushSendResult = {
  attempted: number;
  delivered: number;
  disabledTokens: number;
};

function buildMessage(input: {
  kind: NotificationKind;
  title: string;
  body: string;
  foundItemId?: string | null;
}): Omit<ExpoPushMessage, "to"> {
  return {
    title: input.title,
    body: input.body,
    // Deep-link payload: the app routes probable matches to the matches
    // screen and claim decisions to the item context.
    data: {
      kind: input.kind,
      foundItemId: input.foundItemId ?? null,
      deepLink: input.kind === "MATCH_FOUND" ? "matches" : "home",
    },
    // Match the app's brand; iOS plays no sound by default (calm product).
    sound: "default",
    priority: "normal",
    channelId: "claimit-default",
  };
}

/**
 * Send a push for a persisted notification to every enabled token the user
 * has registered. Never throws — errors are logged and reflected in the
 * returned counts so callers can stay transactional.
 */
export async function sendPushForNotification(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  foundItemId?: string | null;
}): Promise<PushSendResult> {
  const result: PushSendResult = { attempted: 0, delivered: 0, disabledTokens: 0 };
  try {
    const tokens = await listEnabledTokensForUser(input.userId);
    if (tokens.length === 0) return result;

    const messageBase = buildMessage(input);
    const chunks = expo.chunkPushNotifications(
      tokens.map((to) => ({ ...messageBase, to }) as ExpoPushMessage),
    );

    for (const chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < receipts.length; i++) {
        result.attempted++;
        const receipt = receipts[i];
        if (receipt.status === "ok") {
          result.delivered++;
          continue;
        }
        // DeviceError means the token is dead (uninstalled, etc.) — disable.
        const detail = receipt.details?.error;
        if (detail === "DeviceNotRegistered") {
          await disablePushToken({
            userId: input.userId,
            expoPushToken: tokens[i],
          });
          result.disabledTokens++;
        }
      }
    }
    return result;
  } catch (error) {
    console.error("[push] delivery failed (non-fatal):", error);
    return result;
  }
}


