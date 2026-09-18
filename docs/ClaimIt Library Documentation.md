# ClaimIt Library Documentation

This document records why each major library exists and when it should be used.

| Library | Purpose in ClaimIt | Phase | Notes |
|---|---|---|---|
| Expo SDK 57 | Native Android/iOS runtime and build ecosystem | UI (installed Phase 0) | `expo@57.0.24` with React Native 0.86.3 and React 19.2.3. Use Expo modules and EAS-compatible configuration. New Architecture and Android edge-to-edge are always on in SDK 57 (no config keys). |
| React Native | Native mobile UI primitives | UI | Screens use `View`, `Text`, `Image`, `TextInput`, and touch controls. |
| Expo Router | Route and layout management | UI | Keep route groups organized by user role or workflow as the app grows. |
| NativeWind 4.2 | Tailwind-style styling for React Native | UI (installed Phase 0) | Pinned to 4.2.7 (SDK 57 support) with `react-native-css-interop` 0.2.7. Uses the Tailwind 3 config style: `tailwind.config.js` + `nativewind/preset`, `babel.config.js` preset, and `withNativeWind` in `metro.config.js`. ClaimIt tokens live in `tailwind.config.js`. |
| `@expo/vector-icons` | Consistent outlined interface icons | UI | Prefer Material Icons already used by the project. |
| React state | Local prototype state and form interactions | UI | Appropriate while the UI is being reviewed. |
| TypeScript | Static typing | All phases | Required for new source files. |
| Clerk | Student/staff authentication and role access | Backend phase | Add only after login UI and role flows are approved. |
| Neon PostgreSQL | Persistent items, reports, claims, notifications, and audit events | Database phase | Connect via `DATABASE_URL` with the `postgres` driver and Drizzle migrations. Replaced Supabase (2026-09-19) because Supabase's free tier limits active projects; Neon has no such cap. |
| QR generation library | Create printable QR tag payloads | Backend integration phase | Tag payload must contain an opaque item identifier, not sensitive data. |
| Camera scanner library | Scan item QR tags on staff devices | Backend integration phase | Request camera permission and handle invalid or stale tags. |
| Expo Notifications | Push probable-match notifications | Notifications phase | Use push only; the proposal excludes SMS. |
| EAS Build | Build and distribute the Android APK | Release phase | Configure credentials and release channels late in the plan. |

## Adding a library

Before adding a dependency, document its purpose, compatibility with Expo SDK 54, security implications, and whether the feature can be implemented with an existing Expo module. Run the type checker and tests after installation. Remove unused dependencies instead of leaving speculative packages in the project.
