import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { ITEM_STATUSES, NOTIFICATION_KINDS } from "../../shared/workflow";

/**
 * ClaimIt database schema (Phase 2).
 *
 * Entities from the frozen UI contract: User, FoundItem, LostReport,
 * Claim, AuditEvent, Notification. Status enums mirror the canonical
 * vocabulary in shared/workflow.ts so no mapping layer is needed.
 */

export const itemStatusEnum = pgEnum("item_status", ITEM_STATUSES);
export const notificationKindEnum = pgEnum("notification_kind", NOTIFICATION_KINDS);
export const userRoleEnum = pgEnum("user_role", ["student", "staff"]);
export const claimStatusEnum = pgEnum("claim_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "OPEN",
  "MATCHED",
  "CLOSED",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "FOUND",
  "MATCHED",
  "CLAIM_REQUESTED",
  "RELEASED",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: text("clerk_id").notNull().unique(),
    email: text("email"),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull().default("student"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_role_idx").on(table.role)],
);

export const foundItems = pgTable(
  "found_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Opaque QR tag identity printed on the physical tag. */
    qrCode: text("qr_code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    /** Free-form detail used for structured matching (Phase 4). */
    description: text("description"),
    location: text("location").notNull(),
    foundDate: timestamp("found_date", { withTimezone: true }).notNull().defaultNow(),
    status: itemStatusEnum("status").notNull().default("FOUND"),
    imageUrl: text("image_url"),
    /** True once the tag has been generated/printed for this item. */
    qrTagReady: boolean("qr_tag_ready").notNull().default(false),
    loggedByStaffId: uuid("logged_by_staff_id")
      .notNull()
      .references(() => users.id),
    /** Set when a staff scan verifies the tag at release time. */
    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
    /** The staff user who performed the last verified scan (Phase 5). */
    lastScannedBy: uuid("last_scanned_by").references(() => users.id),
    /** When the item was actually released to the claimant (Phase 5). */
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("found_items_status_idx").on(table.status)],
);

export const lostReports = pgTable(
  "lost_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    category: text("category").notNull(),
    description: text("description").notNull(),
    dateLost: timestamp("date_lost", { withTimezone: true }).notNull(),
    locationLost: text("location_lost").notNull(),
    imageUrl: text("image_url"),
    status: reportStatusEnum("status").notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lost_reports_student_idx").on(table.studentId)],
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    foundItemId: uuid("found_item_id")
      .notNull()
      .references(() => foundItems.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    /** Optional link when the claim originates from a lost report match. */
    lostReportId: uuid("lost_report_id").references(() => lostReports.id),
    verificationAnswer: text("verification_answer").notNull(),
    status: claimStatusEnum("status").notNull().default("PENDING"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByStaffId: uuid("decided_by_staff_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("claims_item_idx").on(table.foundItemId),
    index("claims_student_idx").on(table.studentId),
    // One pending claim per item at a time.
    unique("claims_one_pending_per_item")
      .on(table.foundItemId, table.status)
      .nullsNotDistinct(),
  ],
);

/** Append-only custody history. No updates or deletes are permitted. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    foundItemId: uuid("found_item_id")
      .notNull()
      .references(() => foundItems.id),
    actorId: uuid("actor_id").references(() => users.id),
    actorName: text("actor_name").notNull(),
    action: auditActionEnum("action").notNull(),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_item_idx").on(table.foundItemId, table.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    kind: notificationKindEnum("kind").notNull().default("SYSTEM"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    foundItemId: uuid("found_item_id").references(() => foundItems.id),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.createdAt)],
);

/**
 * Expo push tokens (Phase 6). One row per device; upserted on registration.
 * Tokens are opaque Expo identifiers — no SMS channels are supported by
 * design (proposal exclusion).
 */
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** ExponentPushToken[...] string from expo-notifications. */
    expoPushToken: text("expo_push_token").notNull().unique(),
    deviceName: text("device_name"),
    platform: text("platform"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("push_tokens_user_idx").on(table.userId)],
);

/* ------------------------------- relations ------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  lostReports: many(lostReports),
  claims: many(claims),
  notifications: many(notifications),
}));

export const foundItemsRelations = relations(foundItems, ({ one, many }) => ({
  loggedBy: one(users, {
    fields: [foundItems.loggedByStaffId],
    references: [users.id],
  }),
  claims: many(claims),
  auditEvents: many(auditEvents),
}));

export const lostReportsRelations = relations(lostReports, ({ one, many }) => ({
  student: one(users, { fields: [lostReports.studentId], references: [users.id] }),
  claims: many(claims),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  foundItem: one(foundItems, {
    fields: [claims.foundItemId],
    references: [foundItems.id],
  }),
  student: one(users, { fields: [claims.studentId], references: [users.id] }),
  lostReport: one(lostReports, {
    fields: [claims.lostReportId],
    references: [lostReports.id],
  }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  foundItem: one(foundItems, {
    fields: [auditEvents.foundItemId],
    references: [foundItems.id],
  }),
  actor: one(users, { fields: [auditEvents.actorId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  foundItem: one(foundItems, {
    fields: [notifications.foundItemId],
    references: [foundItems.id],
  }),
}));

/* --------------------------------- types --------------------------------- */

export type User = typeof users.$inferSelect;
export type PushToken = typeof pushTokens.$inferSelect;
export type FoundItem = typeof foundItems.$inferSelect;
export type LostReport = typeof lostReports.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
