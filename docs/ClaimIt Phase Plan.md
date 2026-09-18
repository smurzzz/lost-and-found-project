# ClaimIt Phase Plan

## Guiding order

**Phase 1 is UI.** Do not start backend, database, authentication, QR persistence, or push notification implementation until the Phase 1 UI acceptance criteria are complete. The UI is the contract that the later services must support.

## Phase 0 — Foundation dependencies and why they are installed

Phase 0 installs the technical foundation for the future frontend, backend, database, and authentication layers. These packages are installed now so the project has a stable base before feature implementation begins. **Installing them does not mean the backend, database, or authentication flows are already implemented.** Phase 1 remains the first product-development phase and focuses on completing the UI.

### Frontend and mobile foundation

The project uses `expo`, `react`, `react-native`, `expo-router`, `react-native-safe-area-context`, and `react-native-screens` to run the Android mobile application, manage screens, and handle device-safe layouts. `nativewind`, `tailwindcss`, `clsx`, and `tailwind-merge` provide the ClaimIt styling system and reusable utility classes. `@expo/vector-icons`, `expo-image`, `expo-font`, `expo-status-bar`, and `expo-system-ui` support consistent icons, images, typography, and mobile system-bar presentation. `@react-native-async-storage/async-storage` is available for local prototype preferences and temporary local state persistence.

### Frontend data and validation foundation

`@tanstack/react-query` is installed for future server-state caching and request lifecycle management. `axios` and the existing tRPC packages provide typed API-client options; the project should select one authoritative API boundary before production integration. `zod` provides runtime validation for forms, API inputs, and responses. These packages are installed as foundation tools, but the current UI still uses local mock data.

### Backend foundation

`express` provides the Node HTTP server runtime. `@trpc/server`, `@trpc/client`, and `@trpc/react-query` support a typed client-server API if tRPC remains the selected API boundary. `superjson` supports safe serialization of typed data across that boundary. `tsx` runs TypeScript server code during development, while `esbuild` creates the production server bundle. `dotenv`, `cookie`, and `jose` support environment loading, HTTP cookie handling, and token-related server utilities. They do not create authentication by themselves.

### Database foundation

`drizzle-orm` and `drizzle-kit` are already installed to define typed database tables and generate migrations. `postgres` is installed as the PostgreSQL driver for a future PostgreSQL connection. `mysql2` remains in the scaffold because the generated project template supports database alternatives; ClaimIt should standardize on PostgreSQL if the proposal's Supabase direction is approved. `@supabase/supabase-js` is installed for the planned Supabase project URL, anonymous client access, and server-side integrations. The database schema and migrations are intentionally deferred until the UI contract is approved.

### Authentication foundation

`@clerk/expo` is installed for the future student and staff mobile sign-in experience. `@clerk/backend` is installed for server-side session verification and role authorization. Clerk is preferred over manually implemented email/password authentication because the proposal calls for role-based access and the product scope excludes manual email/password login. The packages are installed, but provider keys and authentication screens are not connected during the UI phase.

### QR and device foundation

`qrcode` and `@types/qrcode` support future QR-tag generation and printable tag preparation. `expo-camera` is installed for the future staff QR scanning flow. `expo-notifications` is already included for the future probable-match push notifications described in the proposal. These capabilities remain inactive until their designated implementation phases.

### Testing and quality foundation

`typescript`, `vitest`, `eslint`, `eslint-config-expo`, and `prettier` provide type checking, automated tests, linting, and formatting. `pnpm check` and `pnpm test -- --run` must pass after dependency changes and before a phase is marked complete.

## Phase 1 — Complete UI and interaction prototype

### Step 1: Confirm requirements
Read `project-overview.md`, `proposal-notes.md`, and this plan. Confirm roles, screens, status vocabulary, exclusions, and the QR-verified release rule.

Prompt: `Read docs/project-overview.md, docs/proposal-notes.md, and docs/phase-plan.md. Summarize the UI acceptance criteria without implementing backend features.`

### Step 2: Build the design system
Implement colors, typography, spacing, cards, buttons, inputs, badges, icons, image treatments, and student/staff navigation. Keep the design light, soft, mobile-first, and accessible.

Prompt: `Implement the ClaimIt NativeWind design system from docs/project-overview.md and docs/code-standards.md. Do not add database or API code.`

### Step 3: Build student screens
Implement login/onboarding, student home, report lost item, possible matches, claim verification, claim submitted state, notifications state, and student profile. Use local mock data and make every button navigable.

Prompt: `Build or refine every student screen in the proposal using local mock data only. Verify that Home, Report, Notifications, Profile, Possible Matches, and Claim Verification are reachable.`

### Step 4: Build staff screens
Implement staff dashboard, found items, pending claims, log found item, QR tag ready, scan QR tag, release confirmation, item released state, audit log, and staff profile.

Prompt: `Build or refine every staff screen in the proposal using local mock data only. Verify that logging, QR tag preview, scanning, release confirmation, audit log, and profile states are reachable.`

### Step 5: Review UI flows
Test student and staff flows at a mobile viewport. Confirm text hierarchy, touch targets, safe areas, empty states, pending states, and success states. Collect review feedback and revise the UI.

Prompt: `Review the complete ClaimIt UI against docs/project-overview.md and docs/proposal-notes.md. Report missing screens or interactions, then fix UI-only issues. Do not connect backend services.`

### Step 6: Freeze UI contract
Record approved screen names, component states, form fields, status transitions, and data required by each screen. Update `progress-tracker.md` and `architecture.md`.

Prompt: `Freeze the approved ClaimIt UI contract. Document screen inputs, outputs, status states, and navigation transitions in docs/progress-tracker.md without adding backend code.`

## Phase 2 — Backend and database foundation

Begin only after Phase 1 approval. Define `User`, `FoundItem`, `LostReport`, `Claim`, `AuditEvent`, and `Notification`. Configure role-based authentication and API boundaries. Keep the UI unchanged while replacing mock data behind typed service interfaces.

Prompt: `Phase 1 is approved. Design the ClaimIt API and database schema from the frozen UI contract. Do not change approved visual layouts unless an API constraint makes a screen impossible.`

## Phase 3 — Staff item logging and QR tags

Implement staff item creation, opaque item identifiers, QR generation, tag preview, and printing support. Validate item fields and persist audit events for FOUND.

Prompt: `Implement staff found-item logging and QR tag generation against the approved ClaimIt UI. Add validation and audit events. Test duplicate, missing, and invalid item data.`

## Phase 4 — Student reports and match suggestions

Persist lost reports and implement structured description/category matching. Do not introduce image similarity or AI matching. Return possible matches to the existing UI.

Prompt: `Implement structured lost-report matching using categories and descriptions only. Connect the existing Possible Matches UI and add tests for matching and no-match cases.`

## Phase 5 — QR-verified release workflow

Implement camera scanning, QR validation, staff authorization, claimant recording, release transition, timestamping, and append-only audit events. The API must reject release without a valid staff scan.

Prompt: `Implement the QR scan-to-release workflow. Enforce staff authorization and a valid item QR scan at the API layer, record claimant identity and timestamp, and test rejected release attempts.`

## Phase 6 — Push notifications

Add Expo push notifications for probable matches. Request permission responsibly, store tokens securely, and provide a notification state that deep-links to Possible Matches. Do not add SMS.

Prompt: `Add Expo push notifications for probable match events. Connect them to the existing notification UI and test permission denied, token unavailable, and successful delivery states.`

## Phase 7 — Audit and administrative reporting

Persist and query the item timeline. Provide filters for unclaimed, pending claim, claimed, and released states. Preserve chronological actor and timestamp details. Do not add charts unless separately approved.

Prompt: `Connect the Audit Log UI to persisted audit events. Add status filters, chronological ordering, and authorization checks. Do not add analytics charts.`

## Phase 8 — Integration, release, and defense preparation

Run end-to-end tests, fix defects, configure EAS Build, create the Android APK, perform user acceptance testing, document setup and limitations, and prepare the final demonstration.

Prompt: `Run the complete ClaimIt integration and acceptance checklist from docs/testing.md and docs/demo-guide.md. Fix defects, build the Android APK, and update docs/progress-tracker.md with evidence.`
