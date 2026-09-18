# ClaimIt Proposal Notes

Source: `IPT2_Proposal_3_ClaimIt.docx`.

ClaimIt is an Android mobile lost-and-found application with a QR-code-verified claiming process. Staff log found items and generate printable QR tags. Students report lost items, browse found items, receive probable-match notifications, and submit claims. A staff member must scan the item's QR tag before release; the system records claimant identity and timestamp. The audit log records the custody history from FOUND through MATCHED, CLAIM REQUESTED, and RELEASED.

The proposal explicitly excludes image-similarity matching, unattended self-service pickup, and SMS notifications. Matching is based on structured descriptions and categories. The target users are students, school staff, and administrators. The proposed technology stack is React Native with Expo and NativeWind, Clerk for role-based authentication, a REST API, Supabase PostgreSQL, QR generation and scanning libraries, Expo Notifications, and EAS Build.

The proposal timeline is eight weeks. This documentation changes the order so that the first implementation phase is the complete UI and interaction prototype before backend or database work begins. Backend and database work starts only after the UI flows are reviewed and approved.
