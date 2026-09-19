import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { loadSession } from "@/lib/auth-service";
import {
  attachNotificationTapHandler,
  requestPushRegistration,
} from "@/lib/push-service";
import { setAndroidNotificationChannelAsync } from "@/lib/push-setup";

/**
 * Root layout (Phase 6 wiring).
 *
 * After a session exists, the app asks ONCE for notification permission
 * (never at cold start) and registers the device push token. Tapping a
 * MATCH_FOUND push deep-links to the Possible Matches screen through a
 * module-level route hook. Everything push-related is lazy and guarded:
 * in Expo Go (no remote push since SDK 53) the flow degrades to
 * "unavailable" without ever crashing the app shell.
 */
export default function RootLayout() {
  useEffect(() => {
    let disposed = false;

    const wire = async () => {
      const session = await loadSession();
      if (!session || disposed) return;

      await setAndroidNotificationChannelAsync();
      const result = await requestPushRegistration(session.token);
      if (!disposed && result.state === "granted") {
        console.log("[push] registered", result.token);
      } else if (!disposed && result.state === "denied") {
        console.log("[push] permission denied; in-app notifications still work");
      }
    };
    void wire();

    // Tap-to-deep-link: a push tap publishes the route through the
    // module-level hook consumed by the app shell.
    const unsubscribe = attachNotificationTapHandler((tap) => {
      if (tap.deepLink === "matches") {
        void import("@/lib/push-events").then((m) => m.emitDeepLink("matches"));
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
