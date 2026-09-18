# ClaimIt Testing Strategy

## Testing principle

Testing follows the same UI-first order as implementation. The first phase verifies that every screen and interaction is usable with local state. Later phases add service, security, persistence, and device tests without changing the approved interaction contract unnecessarily.

## Phase 1 UI tests

The current prototype must pass TypeScript checking and the screen inventory test. Review every required route at a mobile viewport. Verify that buttons have working navigation or a visible feedback state. Confirm that forms render all required fields and that student and staff navigation remain separate.

```bash
pnpm check
pnpm test -- --run
```

## Component tests

Test status pills, buttons, inputs, item cards, navigation, empty states, pending states, success states, and destructive-action confirmation. Verify that text remains readable and touch targets remain usable at small supported widths.

## Workflow tests

The student workflow test should cover login, report submission, match selection, claim submission, and confirmation. The staff workflow test should cover staff entry, QR tag preview, scan confirmation, release success, and audit visibility. At the UI-only stage, these tests use deterministic mock state.

## Backend tests after Phase 1

Test authentication and role authorization. Test item creation and QR payload generation. Test matching with exact category matches, partial descriptions, no matches, and duplicate candidates. Test release rejection when the QR tag is invalid, the claimant is missing, the actor is not staff, or the item is already released.

## Database tests

Test unique item identifiers, claim relationships, audit event ordering, immutable audit records, notification ownership, and safe deletion or retention rules. Use isolated test data and never use production records.

## Device and integration tests

Test Android camera permission flows, QR scanning in low light, invalid QR codes, push notification permission denial, offline or slow network behavior, safe areas, keyboard handling, and EAS-built APK installation.

## Acceptance criteria

A phase is complete only when its functional tests pass, its failure states are demonstrated, its documentation is updated, and the corresponding entry in `progress-tracker.md` contains evidence. A screenshot alone is not sufficient evidence for backend or security behavior.
