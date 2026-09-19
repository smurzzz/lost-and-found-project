# ClaimIt Progress Tracker

## Status legend

`Not started` means no implementation has begun. `In progress` means active work exists but acceptance criteria are incomplete. `Review` means the phase is ready for stakeholder feedback. `Complete` means the acceptance criteria and tests are recorded.

| Phase | Scope | Status | Evidence or next action |
|---|---|---|---|
| 0 | Full-stack foundation setup | Complete | Expo SDK 57 (React Native 0.86.3, React 19.2.3) foundation installed and verified 2026-09-19. Evidence: `pnpm check` clean, `pnpm test -- --run` 3/3 passed, `pnpm lint` 0 problems, `expo install --check` up to date, `expo export --platform android` bundle success, `expo-doctor` 21/21. See Phase 0 evidence below. |
| 1 | UI and interaction prototype | Review | All 11 screens ported from the approved UI code into `app/(tabs)/index.tsx` on Expo SDK 57, then **redesigned to the approved 9-screen HTML mockups** (new palette, SVG icon set, pin/heart brand marks, QR artwork, scan reticle, audit timeline). Every screen verified live at a mobile viewport (student and staff, incl. release confirmation state). Evidence: `pnpm check`, `pnpm test -- --run` (5/5), `pnpm lint`, Android + web Metro bundles, `expo install --check` up to date, and an interactive browser review. See the frozen UI contract below. |
| 2 | Backend and database foundation | Review | Schema, migration, auth, and typed tRPC API implemented on Neon PostgreSQL; workflow rules unit-tested (12/12). UI unchanged; screens connect in Phases 3–6. See Phase 2 evidence below. |
| 3 | Staff logging and QR tags | Review | Shared validation contract, collision-safe QR payloads, PNG tag rendering + printing, audit FOUND persistence. Live E2E 12/12 incl. duplicate/missing/invalid cases. See Phase 3 evidence below. |
| 4 | Student reports and structured matches | Review | Lost reports persisted; rule-based matching (category + description/name/location coverage + recency, no AI) in `shared/matching.ts`; Possible Matches UI live with scored, explainable matches and an empty state; MATCH_FOUND notifications; claim → MATCHED link. Unit tests 30/30; live E2E 12/12 incl. no-match gates. See Phase 4 evidence below. |
| 5 | QR-verified release | Review | Camera scan → verify claimant → confirm release, all enforced server-side: strict QR payload validation, staff-only scan/release, 10-minute scan freshness, `releasedAt` + `lastScannedBy` timestamps, claimant identity in the append-only RELEASED audit event. Live E2E 15/15 incl. 6 rejected-release attempts. See Phase 5 evidence below. |
| 6 | Push notifications | Review | Expo push for MATCH_FOUND/CLAIM_DECISION: `push_tokens` registry, responsible permission flow (granted/denied/unavailable state machine), best-effort dispatcher with dead-token disabling, tap-to-deep-link into Possible Matches, no SMS by design. Live E2E 9/9 incl. live dead-token path. See Phase 6 evidence below. |
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

## Phase 3 evidence (2026-09-19)

- **Shared validation** (`shared/validation.ts`): `logFoundItemSchema` (name 2–120, category enum from the UI chips, location 2–160, ISO date, optional URL photo/description) used authoritatively by tRPC, reused by the Log Found form and tests. `QR_CODE_PATTERN` defines the canonical `CLM-XXXX-XXXX-XXXXXXXXXXXXXXXX` payload format.
- **QR service** (`server/services/qr-service.ts`): opaque, non-sequential payloads via `node:crypto`, collision-safe uniqueness against `found_items.qr_code` (retry on the astronomically unlikely unique-index hit), PNG data URLs and SVG via the `qrcode` package. Payloads carry the identifier only — never item details.
- **Tag service + printing** (`server/services/tag-service.ts`, `lib/tag-html.ts`, `lib/tag-printer.ts`): `items.tag` renders the QR PNG plus item summary; `lib/tag-html.ts` produces byte-identical printable markup for native (`expo-print` ~57.0.2) and web (hidden-iframe print). `items.log` now re-validates and persists the FOUND audit event (exactly once per item, verified).
- **UI wiring (layouts unchanged)**: Log Found fields are stateful with field-level error messages from the shared contract; submit calls `ClaimItService.logFoundItem` and shows the returned QR identity; QR Tag Ready renders the real QR PNG when the API is reachable and falls back to the approved mock artwork in prototype mode; Print Tag invokes the platform print pipeline.
- **Tests**: unit suite extended to 19/19 (validation accept/reject matrix incl. short names, long locations, unknown category, malformed date/URL; QR payload format checks). Live E2E (`scripts/e2e-phase3.ts`) passed 12/12 against API + Neon: valid log → canonical QR → FOUND status → missing/invalid/unknown-category/bad-URL rejections → duplicate logs receive distinct QR payloads → tag renders PNG and carries the payload → unknown-item tag fails cleanly → audit FOUND persisted once. Test rows cleaned up.

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

- ~~The matches empty state ("No possible matches yet") is not implemented because mock data always renders two matches; add it when real matching lands in Phase 4.~~ **Resolved in Phase 4**: the empty state ships with real matching (offers Report Lost Item when no report exists yet).
- "Not mine" has no destination by design; confirm with stakeholders whether it should dismiss the match.
- Notification Settings and Help & Support rows are placeholders without destinations.

## Phase 4 evidence (2026-09-19)

- **Structured matching engine** (`shared/matching.ts`, shared by server and tests): category equality and found-after-loss are hard gates; scoring is 30 pts category + up to 30 name coverage + up to 15 description/location coverage + up to 15 location similarity + up to 10 recency. Stop-word filtered, explainable reasons only — **no image similarity, no AI** (proposal exclusion).
- **Descriptions persisted**: `found_items.description` column added and pushed to Neon; Log Found form already collected it, matching now consumes it.
- **Report contract**: `reportLostItemSchema` (shared/validation.ts) validates `reports.create` server-side and the Report Lost Item form client-side (min 10-char description, category enum, valid date, 160-char location).
- **API**: `reports.create/mine/matches` — `mine` now carries a live `matchCount` per report; `matches` returns scored candidates with reasons; MATCH_FOUND notifications fire on report creation when items already match.
- **UI (layouts unchanged)**: Report Lost Item is stateful with inline validation and a category sheet; Possible Matches renders real scored matches (`Possible Match · NN%` pill, reason line) with an empty state; Claim Verification pre-fills the distinctive-detail answer from the item description and links the claim to the originating report; the Home "My Lost Reports" card shows the latest report with its live match count.
- **Tests**: unit 30/30 (matcher match/no-match matrix, validation contract, workflow rules); live E2E vs API + Neon 12/12 — match ranked (score 71) with reasons, pre-loss item excluded, wrong-category item excluded, matches sorted strongest-first, `matchCount=2` on `reports.mine`, MATCH_FOUND notifications persisted (2), short description and invalid category rejected, claim links report → status MATCHED. Test rows cleaned up.
- **Gates**: `pnpm check` ✓ · `pnpm lint` 0 problems ✓ · `pnpm test -- --run` 30/30 ✓ · web export ✓.

## Phase 5 evidence (2026-09-19)

- **Server-enforced workflow (the phase's core requirement)**: `items.scan` and `items.release` are staff-only; `items.scan` input is validated against the canonical QR payload contract (`CLM-XXXX-XXXX-XXXXXXXXXXXXXXXX`) at the tRPC layer **and** re-checked in the service; release calls `canRelease` from the shared workflow module, so the client can never bypass the rule.
- **Scan freshness**: `canRelease` now takes `minutesSinceScan` — scans older than `SCAN_FRESHNESS_MINUTES` (10) are rejected with "rescan" guidance, enforcing that the scan happens at handover. Terminal-state check runs first so re-releasing reports "Item is already released" rather than a misleading claim error.
- **Claimant recording**: the pending-claim query joins `users` so the RELEASED audit detail reads "Item released to claimant <name> (claim verified by staff scan)"; `lastScannedBy` records *which* staff scanned; `releasedAt` is an explicit release timestamp (both columns pushed to Neon).
- **UI (layout unchanged)**: the Scan screen now runs the real flow — tap-to-start `expo-camera` `CameraView` (QR-only) with the reticle overlay, a manual payload entry fallback (web / denied camera permission), inline scan errors, and the bottom sheet populated from the live scan result (item, claimant, verification answer). Confirm Release calls the API and surfaces server rejection reasons verbatim in an alert banner.
- **Tests**: unit 36/36 (freshness rule: fresh/stale/no-scan/no-claim/released/back-compat); live E2E vs API + Neon **15/15** — rejected releases: no scan, malformed QR payload, student-caller scan, student-caller release, unknown-item payload, fresh scan without pending claim; happy path: claim → second staff member scans → release succeeds → `releasedAt` + `lastScannedBy` persisted → audit chain `FOUND → CLAIM_REQUESTED → RELEASED` with claimant identity and no duplicate FOUND/RELEASED events. Test rows cleaned up.
- **Gates**: `pnpm check` ✓ · `pnpm lint` 0 problems ✓ · `pnpm test -- --run` 36/36 ✓ · web export ✓.

## Phase 6 evidence (2026-09-19)

- **Token registry**: `push_tokens` table (unique Expo token per device, platform/device metadata, `enabled` flag) pushed to Neon; `notifications.registerPushToken` validates the `ExponentPushToken[...]` format server-side and upserts (re-registration updates, never duplicates); `notifications.disablePushToken` implements opt-out.
- **Dispatcher** (`server/services/push-service.ts`): best-effort delivery through `expo-server-sdk` fired whenever a MATCH_FOUND or CLAIM_DECISION notification row is created — a push outage can never fail the triggering mutation. Chunks batches per Expo rate limits; `DeviceNotRegistered` receipts disable the dead token. **No SMS channels exist anywhere** (proposal exclusion), verified by schema inspection in E2E.
- **Responsible permission flow** (`lib/push-service.ts`): the OS prompt happens once, only after sign-in (never at cold start), behind a pure state machine — `granted` / `denied` / `unavailable` (web, emulator, token fetch failure) — unit-tested directly. Android channel `claimit-default` created before delivery.
- **Notification state + deep link**: the Possible Matches screen now carries a "Recent Activity" strip (unread dot, mark-read on tap, live counts) fed by the same notifications API; tapping a MATCH_FOUND push routes the app shell to Matches through `lib/push-events.ts`; the push payload carries `{kind, foundItemId, deepLink}`.
- **Tests**: unit 41/41 (permission classification, tap payload extraction, all prior suites); live E2E vs API + Neon **9/9** — valid token registered, malformed token rejected at the boundary, re-registration does not duplicate, MATCH_FOUND + CLAIM_DECISION fan-out persisted, no-SMS schema check, opt-out disables; the **dead-token path was exercised live** (Expo reported the fake device unregistered → token auto-disabled). Test rows cleaned up.
- **Gates**: `pnpm check` ✓ · `pnpm lint` 0 problems ✓ · `pnpm test -- --run` 41/41 ✓ · web export ✓.

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
