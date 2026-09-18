# ClaimIt

ClaimIt is a mobile-first Android lost-and-found application for schools, built around QR-code-verified release: a found item cannot be marked released until an authenticated staff member scans the item tag and confirms the handover.

## Current status: Phase 0 — foundation

The project currently contains **Phase 0 foundation dependencies only**. Installing these packages does not mean the backend, database, or authentication flows are implemented. Phase 1 (UI prototype) is the first product-development phase.

See `docs/ClaimIt Phase Plan.md` for the full plan and `docs/ClaimIt Progress Tracker.md` for status.

## Toolchain

| Command | Purpose |
| --- | --- |
| `pnpm start` | Start the Expo dev server |
| `pnpm android` | Start and open on an Android device/emulator |
| `pnpm check` | TypeScript check (`tsc --noEmit`) |
| `pnpm test -- --run` | Run vitest once |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier write |

> On this machine `pnpm` is available through Corepack: `corepack pnpm <command>`.

## Stack

- Expo SDK 57 (React Native 0.86, React 19.2) with expo-router
- NativeWind 4.2 (Tailwind CSS 3) styling, ClaimIt token palette in `tailwind.config.js`
- Typed API foundation: tRPC 11 + TanStack Query + zod (not yet wired)
- Backend foundation: Express 5 + tsx/esbuild (not yet implemented)
- Database foundation: Drizzle ORM/Kit + postgres driver + Supabase client (schema deferred)
- Auth foundation: Clerk (`@clerk/expo`, `@clerk/backend`) — keys not connected
- QR/device foundation: `qrcode`, `expo-camera`, `expo-notifications` — inactive until their phases
