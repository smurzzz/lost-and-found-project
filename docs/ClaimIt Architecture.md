# ClaimIt Architecture

## Architectural rule

ClaimIt is implemented in phases. **The UI and interaction model are built first. Backend and database work begins only after the UI flows are reviewed, approved, and covered by acceptance criteria.** This prevents early data-model decisions from distorting the user experience.

## Current UI architecture

The prototype runs on Expo SDK 57 (React Native 0.86, React 19.2) with Expo Router as the entry point and a single UI shell in `app/(tabs)/index.tsx`. The shell contains a `ScreenKey` union of 11 screens, local screen state, shared visual components, mock data, role switching, student navigation, and staff navigation. NativeWind 4.2 classes provide styling, and `tailwind.config.js` defines the palette tokens. The frozen screen contract lives in `progress-tracker.md`.

The prototype screens are:

- Login and onboarding
- Student Home
- Report Lost Item
- Possible Matches
- Claim Verification
- Staff Dashboard
- Log Found Item
- QR Tag Ready
- Scan QR Tag and Release
- Audit Log
- Profile

## Target production architecture

The eventual production application should separate the presentation layer from domain and infrastructure concerns.

```text
Expo / React Native / NativeWind
        |
        v
Screen components and navigation
        |
        v
Feature services and typed state
        |
        v
REST API with role and workflow enforcement
        |
        +--> Clerk authentication and role claims
        +--> Supabase PostgreSQL
        +--> QR generation and camera scanning
        +--> Expo push notifications
        +--> Audit event persistence
```

## Domain entities

The planned entities are `User`, `FoundItem`, `LostReport`, `Claim`, `AuditEvent`, and `Notification`. A `FoundItem` owns one QR tag identity. A `Claim` references a student and a found item. An `AuditEvent` is append-only and records actor, action, timestamp, and related item. The final schema must preserve the rule that release requires a valid staff scan event.

## Workflow boundaries

The client may display available actions, but it must not be trusted to enforce release. The API must validate the staff role, QR identity, claim status, and release transition. The database must preserve the audit record even if the client is closed or a request is retried.

## Repository boundaries

`app/` contains route-level screens. `components/` contains reusable presentation components. `features/` should contain feature-specific UI and hooks when the project grows. `lib/` contains shared utilities and API clients. `server/` contains backend procedures and workflow validation after Phase 2. `shared/` contains types and schemas shared by client and server. `docs/` is the project operating manual.
