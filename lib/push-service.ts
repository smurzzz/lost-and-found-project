/**
 * Push notification registration (Phase 6).
 *
 * Requests notification permission responsibly (only after the student is
 * signed in, never at cold start), registers the device's Expo push token
 * with the ClaimIt API, and exposes a pure state machine covering the
 * three testable outcomes: granted, denied, and unavailable (Expo Go /
 * web / no push support). No SMS channels exist anywhere in this flow.
 *
 * Expo Go note: remote push was removed from Expo Go in SDK 53 and
 * importing expo-notifications there THROWS AT IMPORT TIME. Every use of
 * the module is therefore lazy (dynamic import behind environment
 * checks), so the app runs normally in Expo Go and simply degrades to
 * state "unavailable". Use a development build for real pushes.
 */
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import { getClaimItClient } from "./claimit-client";

type NotificationsModule = typeof import("expo-notifications");

export type PushPermissionState =
  | "granted"
  | "denied"
  | "unavailable"
  | "unknown";

export type PushRegistrationResult = {
  state: PushPermissionState;
  /** Present only when state === "granted" and registration succeeded. */
  token?: string;
  reason?: string;
};

/** True when the app runs inside the Expo Go client. */
export function isExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/** True when push tokens cannot exist in this environment. */
export function isPushUnavailable(): boolean {
  return Platform.OS === "web" || isExpoGo();
}

/**
 * Lazily load expo-notifications. Returns null in Expo Go / web or when
 * the native module is unavailable — never throws, so the app shell is
 * never blocked by the notifications stack.
 */
async function loadNotifications(): Promise<NotificationsModule | null> {
  if (isPushUnavailable()) return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

/** Pure classification of an expo-notifications permission response. */
export function classifyPermission(
  status: { granted: boolean } | null | undefined,
): PushPermissionState {
  if (!status) return "unavailable";
  if (status.granted) return "granted";
  return "denied";
}

/**
 * Ask the OS for notification permission, then fetch and register the
 * Expo push token. Never throws; the state machine result is the contract.
 */
export async function requestPushRegistration(
  apiToken: string,
): Promise<PushRegistrationResult> {
  // Environment check first: Expo Go and web cannot register tokens.
  if (isPushUnavailable()) {
    return {
      state: "unavailable",
      reason:
        "Remote push requires a development build (not supported in Expo Go)",
    };
  }

  const NotificationsModule = await loadNotifications();
  if (!NotificationsModule) {
    return { state: "unavailable", reason: "expo-notifications unavailable" };
  }

  let permission: Awaited<
    ReturnType<NotificationsModule["getPermissionsAsync"]>
  >;
  try {
    permission = await NotificationsModule.getPermissionsAsync();
    if (!permission.granted) {
      // The single responsible prompt: only after explicit user context.
      permission = await NotificationsModule.requestPermissionsAsync();
    }
  } catch {
    return { state: "unavailable", reason: "Permission check failed" };
  }

  const state = classifyPermission(permission);
  if (state !== "granted") {
    return { state, reason: "Notification permission not granted" };
  }

  try {
    const token = (await NotificationsModule.getExpoPushTokenAsync()).data;
    if (!token || !/^ExponentPushToken\[.+\]$/.test(token)) {
      return { state: "unavailable", reason: "Token unavailable from Expo" };
    }

    const client = getClaimItClient(apiToken);
    await client.notifications.registerPushToken.mutate({
      expoPushToken: token,
      platform: Platform.OS,
      deviceName: String(Platform.Version ?? "unknown"),
    });
    return { state: "granted", token };
  } catch (error) {
    return {
      state: "unavailable",
      reason:
        error instanceof Error ? error.message : "Token registration failed",
    };
  }
}

/** Disable the token server-side when the user opts out. */
export async function optOutPush(apiToken: string, token: string): Promise<void> {
  try {
    const client = getClaimItClient(apiToken);
    await client.notifications.disablePushToken.mutate({ expoPushToken: token });
  } catch {
    // Best-effort; the token is disabled server-side on next send anyway.
  }
}

export type NotificationTap = {
  kind: string | null;
  deepLink: string | null;
  foundItemId: string | null;
};

/** Extract the ClaimIt deep-link payload from a received notification. */
export function extractTapPayload(
  response: import("expo-notifications").NotificationResponse | null | undefined,
): NotificationTap {
  const data = (response?.notification?.request?.content?.data ?? {}) as {
    kind?: string;
    deepLink?: string;
    foundItemId?: string | null;
  };
  return {
    kind: data.kind ?? null,
    deepLink: data.deepLink ?? null,
    foundItemId: data.foundItemId ?? null,
  };
}

type EventSubscription = { remove: () => void };

let tapHandlerAttached = false;

/**
 * Attach the tap listener exactly once. Returns an unsubscribe function.
 * The UI passes its navigation callback (go("matches") in this app shell).
 * No-op in Expo Go / web — where the listener stack cannot exist.
 */
export function attachNotificationTapHandler(
  onTap: (tap: NotificationTap) => void,
): () => void {
  if (tapHandlerAttached || isPushUnavailable()) return () => undefined;
  tapHandlerAttached = true;

  let subscription: EventSubscription | null = null;
  void loadNotifications().then((module) => {
    if (!module || !tapHandlerAttached) return;
    subscription = module.addNotificationResponseReceivedListener((response) => {
      onTap(extractTapPayload(response));
    });
  });

  return () => {
    tapHandlerAttached = false;
    subscription?.remove();
    subscription = null;
  };
}
