/**
 * Authentication service (Phase 2).
 *
 * Production sign-in is Google SSO through Clerk (@clerk/expo) — the
 * proposal excludes manual email/password login. Clerk keys are not
 * connected yet, so signIn/signOut currently resolve to the dev-mode
 * session used by the API fallback (dev.<name>.<role> tokens). Swapping
 * to Clerk later only changes this module; the UI is untouched.
 */
import { devToken } from "./claimit-client";

export type Session = {
  name: string;
  role: "student" | "staff";
  token: string;
};

const SESSION_KEY = "claimit.session";

export async function signInWithGoogle(): Promise<Session> {
  // TODO(Phase 2 integration): replace with useSSO().startSSOFlow({ strategy: "oauth_google" })
  // from @clerk/expo once publishable key is configured.
  const session: Session = {
    name: "Alex Morgan",
    role: "student",
    token: devToken("Alex Morgan", "student"),
  };
  await persistSession(session);
  return session;
}

/** Dev/staff entry used by the "Preview Staff Workspace" link. */
export async function signInAsStaffPreview(): Promise<Session> {
  const session: Session = {
    name: "Jordan Lee",
    role: "staff",
    token: devToken("Jordan Lee", "staff"),
  };
  await persistSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  try {
    const AsyncStorage = await import("@react-native-async-storage/async-storage");
    await AsyncStorage.default.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable (e.g. web privacy mode); session is ephemeral anyway.
  }
}

async function persistSession(session: Session): Promise<void> {
  try {
    const AsyncStorage = await import("@react-native-async-storage/async-storage");
    await AsyncStorage.default.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore persistence failures; the in-memory session still works.
  }
}

export async function loadSession(): Promise<Session | null> {
  try {
    const AsyncStorage = await import("@react-native-async-storage/async-storage");
    const raw = await AsyncStorage.default.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
