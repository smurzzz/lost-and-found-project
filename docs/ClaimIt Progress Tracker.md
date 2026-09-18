# ClaimIt Progress Tracker

## Status legend

`Not started` means no implementation has begun. `In progress` means active work exists but acceptance criteria are incomplete. `Review` means the phase is ready for stakeholder feedback. `Complete` means the acceptance criteria and tests are recorded.

| Phase | Scope | Status | Evidence or next action |
|---|---|---|---|
| 0 | Full-stack foundation setup | Complete | Expo SDK 57 (React Native 0.86.3, React 19.2.3) foundation installed and verified 2026-09-19. Evidence: `pnpm check` clean, `pnpm test -- --run` 3/3 passed, `pnpm lint` 0 problems, `expo install --check` up to date, `expo export --platform android` bundle success, `expo-doctor` 21/21. See Phase 0 evidence below. |
| 1 | UI and interaction prototype | Review | All 11 screens ported from the approved UI code into `app/(tabs)/index.tsx` on Expo SDK 57, then **redesigned to the approved 9-screen HTML mockups** (new palette, SVG icon set, pin/heart brand marks, QR artwork, scan reticle, audit timeline). Every screen verified live at a mobile viewport (student and staff, incl. release confirmation state). Evidence: `pnpm check`, `pnpm test -- --run` (5/5), `pnpm lint`, Android + web Metro bundles, `expo install --check` up to date, and an interactive browser review. See the frozen UI contract below. |
| 2 | Backend and database foundation | Review | Schema, migration, auth, and typed tRPC API implemented on Neon PostgreSQL; workflow rules unit-tested (12/12). UI unchanged; screens connect in Phases 3–6. See Phase 2 evidence below. |
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
- **Database**: `drizzle-orm`, `drizzle-kit`, `postgres`. Standardized on **Neon PostgreSQL** (2026-09-19) after the Supabase free-tier active-project limit blocked project creation; `@supabase/supabase-js` was removed from the dependency set. Schema and migrations are deferred until the UI contract is approved.
- **Authentication**: `@clerk/expo`, `@clerk/backend`. Keys are not connected; no auth screens are implemented.
- **QR/device**: `qrcode`, `@types/qrcode`, `expo-camera`, `expo-notifications`. All inactive until their phases.
- **Quality**: `typescript` ~6.0.3 (Expo-validated), `vitest`, `eslint` 9 + `eslint-config-expo` + `eslint-config-prettier`, `prettier` + `prettier-plugin-tailwindcss`.

Verification evidence: `pnpm check` (tsc strict, no errors), `pnpm test -- --run` (3/3 passed in `tests/foundation.test.ts`), `pnpm lint` (0 problems), `pnpm dlx expo-doctor` (21/21 checks passed), `pnpm exec expo install --check` (dependencies up to date), `pnpm exec expo export --platform android` (Metro + NativeWind production bundle succeeded). Placeholder brand assets in `assets/` must be replaced with real ClaimIt artwork before release.

Environment configuration: copy `.env.example` to `.env` when Phase 2 begins; no secrets are committed.

## Phase 2 evidence (2026-09-19)

Implemented on Neon PostgreSQL (schema pushed live; `.env` holds credentials, gitignored):

- **Shared workflow** (`shared/workflow.ts`): canonical `FOUND → MATCHED → CLAIM REQUESTED → RELEASED` vocabulary, transition table, and the `canRelease` gate (staff scan + pending claim required). Shared verbatim by client and server.
- **Database** (`server/db/schema.ts` + `drizzle/0000_*.sql`): `User`, `FoundItem` (opaque QR identity, `lastScannedAt`), `LostReport`, `Claim` (one pending claim per item via partial unique index), `AuditEvent` (append-only), `Notification`. Enums mirror the shared vocabulary.
- **Auth** (`server/auth.ts`): Clerk JWT verification via `@clerk/backend` with DB-backed roles (`users.role` is authoritative). `CLERK_SECRET_KEY` is set, so tokens are verified strictly; `ALLOW_DEV_LOGIN=true` is an explicit local override (`dev.<name>.<role>` tokens). Publishable key note: the Expo client will read `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (the `.env` currently uses the Next.js-style name).
- **API** (`server/trpc/*`, `server/index.ts`): tRPC 11 + superjson over Express 5. Routers: `auth`, `items` (list/pending/byId/log/scan/release), `reports` (create/mine/matches), `claims.submit`, `audit` (recent/forItem), `notifications` (list/unread/markRead). Custody mutations are `staffOnly`; auth failures return clean 401 TRPCErrors; stacks are stripped in production.
- **Services** (`server/services/*`): found-item (QR identity generation, transitions + audit), lost-report (structured, rule-based matching — no AI per exclusions), claim (scan verification + release enforcement + notifications), audit (append-only), notification (in-app; push deferred to Phase 6).
- **Client boundary** (`lib/claimit-client.ts`, `lib/claimit-service.ts`, `lib/auth-service.ts`): typed tRPC facade with mock-data fallback while `EXPO_PUBLIC_API_URL` is unset — approved UI layouts unchanged. `signInWithGoogle()` is the SSO entry (Clerk `oauth_google` swap documented in-module); the login button now reads "Continue with Google".
- **Tooling**: scripts `server`, `server:start`, `db:generate`, `db:migrate`, `db:push`, `db:studio`; `drizzle.config.ts` reads `.env` (unpooled URL preferred for migrations).

Verification evidence: `pnpm check` clean; `pnpm test -- --run` 12/12 (workflow rules, service facade, screen inventory, foundation); `pnpm lint` 0 problems; `pnpm db:push` applied the schema to Neon (roundtrip verified); live E2E smoke (`scripts/e2e-smoke.ts`) passed 9/9 against the running API + Neon — item logged → release blocked without scan → claim submitted → QR scan surfaces claim → release succeeds → audit chain complete → student blocked from staff mutations — with test rows cleaned up. Web bundle exports.

## Frozen UI contract (Phase 1, Step 6)

Frozen 2026-09-19 pending stakeholder approval. Backend work (Phase 2) may begin only after approval of this contract.

### Navigation model

One application shell (`app/(tabs)/index.tsx`) holds a `ScreenKey` union of 11 screens and switches them in place. A role state (`student` | `staff`) selects the bottom navigation set. Screens never deep-link; the prototype is state-driven.

- Student nav: Home (`student-home`), Report (`report-lost`), Notifications (`matches`), Profile (`profile`)
- Staff nav: Home (`staff-home`), Scan (`scan-release`), Audit Log (`audit`), Profile (`profile`)

### Screens, inputs, and transitions

| Screen key | Title | Local state | Actions → transitions | Status states displayed |
|---|---|---|---|---|
| `login` | ClaimIt onboarding | — | Continue with SSO → student home; Preview Staff Workspace → staff home | — |
| `student-home` | Find your lost item | selected category chip | item card → claim-verification; lost-report row → matches; Report Lost Item → report-lost; See all → matches | Unclaimed (gray), Pending (amber), Possible match (amber) |
| `report-lost` | Report a Lost Item | description text | Submit Report → matches; back → student-home | — |
| `matches` | Possible Matches | — | This is mine → claim-verification; Not mine (inert by design) | Possible Match (amber) |
| `claim-verification` | Verify Your Claim | verification answer, submitted flag | Submit Claim → shows Claim Submitted banner; back → matches | Claim Submitted (emerald success) |
| `staff-home` | Staff Dashboard | found/pending tab | pending claim row → scan-release; Log Found Item → log-found | Returned/Pending (emerald/amber), Pending (amber) |
| `log-found` | Log Found Item | — | Log Found Item → qr-tag; back → staff-home | — |
| `qr-tag` | QR Tag Ready | — | Print Tag → alert banner; Done → staff-home | Verified by ClaimIt (emerald) |
| `scan-release` | Scan QR Tag | released flag | Confirm Release → Item Released badge + emerald released state; Cancel → staff-home | Pending claim (amber) → Released (emerald) |
| `audit` | Audit Log | status filter chip | filter chips filter events (visual) | FOUND, MATCHED, CLAIM REQUESTED, RELEASED timeline with actor + timestamp |
| `profile` | Profile | role (prop) | Log Out → alert banner | Student/Staff role badge; staff sees Recent Audit Log |

### Data each screen will need from Phase 2

- **Found item**: `id`, `name`, `category`, `location`, `date`, `status`, `image`
- **Possible match**: found-item fields + originating lost-report reference
- **Claim**: `claimantName`, `verificationAnswer`, `claimDate`, linked item
- **Audit event**: `status` (FOUND → MATCHED → CLAIM REQUESTED → RELEASED), `actor`, `timestamp`, `action`, append-only order
- **Profile**: `name`, `role`, avatar

### Component inventory

`ScreenContainer` (safe areas), `Logo`, `Header` (back + title), `PrimaryButton` (navy/emerald, min 52px), `StatusPill` (gray/amber/emerald), `BottomNav` (role-aware), `ItemCard`, `InputField` (54px single-line, 112px multiline), `InfoRow`, `ProfileRow`, `AlertBanner` (web-safe transient notice replacing `Alert.alert`). Tokens live in `tailwind.config.js`.

### Review findings (deferred, UI-only)

- The matches empty state ("No possible matches yet") is not implemented because mock data always renders two matches; add it when real matching lands in Phase 4.
- "Not mine" has no destination by design; confirm with stakeholders whether it should dismiss the match.
- Notification Settings and Help & Support rows are placeholders without destinations.

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
- [x] Student flow verified at mobile viewport (login → home → report → matches → claim → submitted → profile).
- [x] Staff flow verified at mobile viewport (dashboard tabs → log found → QR tag → scan → confirm release → audit → profile).
- [ ] Stakeholder approval of the UI contract.

## Update procedure

After each meaningful change, update the phase status, add evidence, record unresolved issues, and state the next action. Do not mark a phase complete based only on a screenshot; include the relevant test or review evidence.
