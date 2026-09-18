# ClaimIt Demo Guide

## Demo purpose

This guide demonstrates the complete UI prototype before any backend or database integration. It should show that the student and staff workflows are understandable, consistent, and ready to connect to services later.

## Start the project

```bash
cd claimit-mobile
pnpm install
pnpm start
```

Open the Expo development build or web preview. The prototype uses local mock data, so no credentials or database setup are required.

## Student demonstration

1. Open the login screen and explain that the product uses SSO rather than manual email and password fields.
2. Select **Continue with SSO** to open Student Home.
3. Show the search field, category chips, found-item cards, status badges, and My Lost Reports.
4. Select **+ Report Lost Item** and review the category, description, date, location, and optional photo fields.
5. Select **Submit Report** to open Possible Matches.
6. Select **This is mine** on a match to open Verify Your Claim.
7. Enter or review a distinctive detail, then select **Submit Claim**.
8. Show the emerald Claim Submitted state and explain that release still requires staff QR verification.
9. Open Profile and demonstrate the minimal student account layout.

## Staff demonstration

1. Return to login and select **Preview Staff Workspace**.
2. Show the Staff Dashboard summary cards, Found Items tab, Pending Claims tab, QR indicators, and status badges.
3. Select **Log Found Item** and review the staff entry fields.
4. Select **Log Found Item** to open QR Tag Ready.
5. Explain the item ID, QR code, Print Tag action, and Done action.
6. Open Scan QR Tag and show the camera-style viewfinder, item details, claimant, verification answer, pending badge, and Confirm Release action.
7. Select **Confirm Release** and show the Item Released state.
8. Open Audit Log and explain the chronological FOUND, MATCHED, CLAIM REQUESTED, and RELEASED history.
9. Open Staff Profile and show account settings plus the recent audit preview.

## Key explanation

The prototype proves the intended interface and interaction contract. It does not claim to verify real users, persist real items, scan a real camera QR code, send push notifications, or enforce release rules. Those capabilities begin in later phases after UI approval.

## Demo quality checklist

Use a mobile viewport. Keep the device orientation portrait. Explain the reason for each status color. Do not describe local mock transitions as production security. Point out that the future API, database, and audit layer must enforce the QR release rule.
