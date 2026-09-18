# ClaimIt Progress Tracker

## Status legend

`Not started` means no implementation has begun. `In progress` means active work exists but acceptance criteria are incomplete. `Review` means the phase is ready for stakeholder feedback. `Complete` means the acceptance criteria and tests are recorded.

| Phase | Scope | Status | Evidence or next action |
|---|---|---|---|
| 0 | Full-stack foundation setup | Complete | Expo SDK 57 (React Native 0.86.3, React 19.2.3) foundation installed and verified 2026-09-19. Evidence: `pnpm check` clean, `pnpm test -- --run` 3/3 passed, `pnpm lint` 0 problems, `expo install --check` up to date, `expo export --platform android` bundle success, `expo-doctor` 21/21. See Phase 0 evidence below. |
| 1 | UI and interaction prototype | Not started | Phase 0 scaffold contains only a placeholder home route (`app/index.tsx`); all student and staff screens from the previous prototype must be rebuilt in this workspace before review. |
| 2 | Backend and database foundation | Not started | Define schema and API only after Phase 1 approval. |
| 3 | Staff logging and QR tags | Not started | Connect the existing Log Found Item and QR Tag Ready screens. |
| 4 | Student reports and structured matches | Not started | Connect Report Lost Item and Possible Matches. |
| 5 | QR-verified release | Not started | Connect camera scanning and enforce release on the API. |
| 6 | Push notifications | Not started | Connect probable-match notifications through Expo. |
| 7 | Audit and reporting | Not started | Persist and query the audit timeline. |
| 8 | Integration, APK, UAT, and defense | Not started | Run the demo and testing checklists, then build with EAS. |

## Phase 0 evidence (2026-09-19)

Installed on Expo SDK 57 (`expo@57.0.24`, React Native `0.86.3`, React `19.2.3`):

- **Frontend/mobile**: `expo-router`, `react-native-safe-area-context`, `react-native-screens`, `react-native-gesture-handler`, `react-native-reanimated` 4.5 + `react-native-worklets`, `nativewind` 4.2.7 + `tailwindcss` 3.4 (Tailwind 3 config style), `clsx`, `tailwind-merge`, `@expo/vector-icons`, `expo-image`, `expo-font`, `expo-status-bar`, `expo-system-ui`, `@react-native-async-storage/async-storage`.
- **Data/validation**: `@tanstack/react-query`, `axios`, `zod`, plus tRPC packages below. The authoritative API boundary (tRPC vs axios) is still an open decision for Phase 2.
- **Backend**: `express` 5, `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `superjson`, `tsx`, `esbuild`, `dotenv`, `cookie`, `jose`. No server code exists yet.
- **Database**: `drizzle-orm`, `drizzle-kit`, `postgres`, `mysql2` (template legacy; standardize on PostgreSQL/Supabase), `@supabase/supabase-js`. Schema and migrations are deferred until the UI contract is approved.
- **Authentication**: `@clerk/expo`, `@clerk/backend`. Keys are not connected; no auth screens are implemented.
- **QR/device**: `qrcode`, `@types/qrcode`, `expo-camera`, `expo-notifications`. All inactive until their phases.
- **Quality**: `typescript` ~6.0.3 (Expo-validated), `vitest`, `eslint` 9 + `eslint-config-expo` + `eslint-config-prettier`, `prettier` + `prettier-plugin-tailwindcss`.

Verification evidence: `pnpm check` (tsc strict, no errors), `pnpm test -- --run` (3/3 passed in `tests/foundation.test.ts`), `pnpm lint` (0 problems), `pnpm dlx expo-doctor` (21/21 checks passed), `pnpm exec expo install --check` (dependencies up to date), `pnpm exec expo export --platform android` (Metro + NativeWind production bundle succeeded). Placeholder brand assets in `assets/` must be replaced with real ClaimIt artwork before release.

Environment configuration: copy `.env.example` to `.env` when Phase 2 begins; no secrets are committed.

## Current UI acceptance checklist

- [x] Student login and onboarding UI.
- [x] Student Home and found item browsing UI.
- [x] Lost report form UI.
- [x] Possible matches UI.
- [x] Claim verification and submitted state UI.
- [x] Staff dashboard with found and pending claim tabs.
- [x] Staff found item form UI.
- [x] QR Tag Ready UI.
- [x] Scan QR Tag and release confirmation UI.
- [x] Item Released state UI.
- [x] Audit Log UI.
- [x] Student and Staff Profile UI.
- [x] Student and Staff bottom navigation.
- [x] TypeScript check and UI inventory test.
- [ ] Stakeholder approval of the UI contract.

## Update procedure

After each meaningful change, update the phase status, add evidence, record unresolved issues, and state the next action. Do not mark a phase complete based only on a screenshot; include the relevant test or review evidence.
