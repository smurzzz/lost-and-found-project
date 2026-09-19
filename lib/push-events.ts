/**
 * Push deep-link event bus (Phase 6).
 *
 * A module-level pub/sub so the root layout's notification tap listener
 * can route the app shell (which owns screen state) without prop drilling
 * or a global navigation ref.
 */

export type DeepLinkRoute = "matches" | "home";

type Listener = (route: DeepLinkRoute) => void;

const listeners = new Set<Listener>();

export function emitDeepLink(route: DeepLinkRoute): void {
  for (const listener of listeners) listener(route);
}

export function subscribeDeepLink(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
