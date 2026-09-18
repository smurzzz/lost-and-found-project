# ClaimIt Code Standards

## General principle

Write code that is easy to review, test, and replace. Prefer small components and explicit data flow over clever abstractions. Follow the current Expo and NativeWind conventions in the project README.

## TypeScript

Use TypeScript for application code. Define unions for finite values such as roles, screen keys, and status values. Avoid `any`. Keep shared domain types in `shared/` once backend work starts. Use descriptive names and keep functions focused on one responsibility.

## React Native and NativeWind

Use `ScreenContainer` for every screen so status-bar and safe-area behavior stays consistent. Use NativeWind `className` for visual styles. Do not place `className` on `Pressable`; use the `style` callback for pressed-state behavior. Use `FlatList` for lists and provide stable keys. Keep touch targets at least 48 pixels high.

## Components

Extract repeated patterns into components such as buttons, cards, inputs, status pills, headers, and bottom navigation. Components should receive data and callbacks through props rather than reaching into unrelated screen state. Keep accessibility labels on icon-only controls.

## State

The UI-first phase may use local React state and mock data. Do not introduce a backend dependency merely to demonstrate a screen. When production data is introduced, use typed API responses and TanStack Query for server state. Keep form state local to the form unless multiple screens need it.

## Styling and branding

Use the ClaimIt tokens: navy `#172554`, dark navy `#0F172A`, emerald `#10B981`, amber `#F59E0B`, background `#F5F7F8`, surface `#FFFFFF`, muted text `#64748B`, and border `#E2E8F0`. Use Inter or a visually equivalent readable sans-serif. Avoid dense dashboards, heavy borders, excessive uppercase text, and dark full-screen themes.

## Workflow safety

A UI action may navigate optimistically during the prototype phase. In production, release actions must call a server endpoint that validates role, QR tag, claim status, and actor identity. Never treat a client-side status update as proof of release.

## Documentation

Update `progress-tracker.md` after each completed phase. Update `architecture.md` when boundaries change. Every new library must be recorded in `library-docs.md` with its purpose, version, setup, and removal considerations.
