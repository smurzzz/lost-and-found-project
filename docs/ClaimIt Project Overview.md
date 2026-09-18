# ClaimIt Project Overview

## Project identity

**ClaimIt** is a mobile-first Android lost-and-found application for schools. Its defining control is QR-code-verified release: a found item cannot be marked as released until an authenticated staff member scans the item tag and confirms the handover.

## Problem

School lost-and-found processes often depend on verbal descriptions and staff memory. They may not preserve proof of ownership, claimant identity, handover time, or custody history. Students also lack a convenient way to check whether a reported item has been found.

## Product goal

ClaimIt provides a verifiable workflow from item discovery to return. It gives staff structured tools for logging and releasing items, while giving students a clear way to report, search, claim, and track lost property.

## Roles

Students report lost items, browse found items, review possible matches, submit claims, receive notifications, and view their profile. Staff log found items, generate QR tags, review pending claims, scan QR tags, confirm releases, and inspect chronological audit history. Administrators need audit visibility for oversight and reporting.

## Core status flow

`FOUND → MATCHED → CLAIM REQUESTED → RELEASED`

The UI prototype currently demonstrates this flow with local mock data. Backend enforcement will be added later so that the release rule is enforced at the API and database layers, not only in the interface.

## Explicit exclusions

ClaimIt does not include AI image matching, social features, chat or SMS messaging, gamification, ranking, scoring, emergency contacts, unattended pickup, or manual email/password login.

## Current implementation state

The current project is a UI-only Expo and React Native prototype styled with NativeWind. It contains the complete student and staff screen set, shared components, local state transitions, and responsive mobile presentation. It does not yet connect authentication, database persistence, push services, camera scanning, or a production API.
