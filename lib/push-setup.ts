/**
 * Notification channel setup (Phase 6).
 *
 * Android 13+ requires a channel before any push renders. The channel is
 * created once per install with the brand color. expo-notifications is
 * loaded lazily so Expo Go (where the module throws at import time since
 * SDK 53) never crashes the app shell. No SMS channel exists.
 */
import { Platform } from "react-native";

import { isPushUnavailable } from "./push-service";

export async function setAndroidNotificationChannelAsync(): Promise<void> {
  if (isPushUnavailable()) return;
  try {
    const Notifications = await import("expo-notifications");
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync("claimit-default", {
      name: "ClaimIt updates",
      description: "Probable match and claim decision notifications",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#10B981",
    });
  } catch {
    // Channel creation is best-effort; pushes still deliver on iOS.
  }
}
