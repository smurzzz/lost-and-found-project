# ClaimIt Agent Instructions

## Before making changes

Read these documents in order:

1. `docs/project-overview.md`
2. `docs/proposal-notes.md`
3. `docs/architecture.md`
4. `docs/code-standards.md`
5. `docs/library-docs.md`
6. `docs/phase-plan.md`
7. `docs/progress-tracker.md`
8. `docs/testing.md`
9. `docs/demo-guide.md`

Then inspect the current project files and determine the active phase. If a user prompt conflicts with the proposal, ask for clarification when the conflict changes scope or security. If it is a low-risk UI adjustment, follow the prompt and record the change.

## Phase gate

**Do not implement backend, database, authentication, QR persistence, camera scanning, or push notification services while Phase 1 UI is still in Review.** The user explicitly requested that UI comes before backend or database work.

## Work method

Create or update the progress tracker before substantial work. Prefer existing project libraries. Use NativeWind and shared components for UI. Keep mock data local during the UI phase. Run `pnpm check` and `pnpm test -- --run` after changes. For visual changes, verify a mobile preview. Update the relevant documentation when architecture, dependencies, standards, or phase status changes.

## Scope boundaries

Do not add AI image matching, SMS, social features, scoring, ranking, gamification, emergency contacts, unattended pickup, manual email/password login, or analytics charts unless the product scope is explicitly revised and documented.

## Security rule

The client UI must never be treated as the authority for release. In production, a staff role, a valid QR scan, a valid claim, and an audit event must be validated server-side before an item becomes RELEASED.

## Delivery rule

Before delivery, verify changed files exist, tests pass, the progress tracker is updated, and the response states whether the change is UI-only or production-integrated. Provide exact file links when the user requests source code.
