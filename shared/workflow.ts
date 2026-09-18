/**
 * ClaimIt workflow vocabulary and rules.
 *
 * This module is the single source of truth for the custody status flow:
 *   FOUND -> MATCHED -> CLAIM REQUESTED -> RELEASED
 * It is shared verbatim between the server (authoritative) and the client
 * (display + action gating). The server must enforce every transition.
 */

export const ITEM_STATUSES = [
  "FOUND",
  "MATCHED",
  "CLAIM_REQUESTED",
  "RELEASED",
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Valid custody transitions. RELEASED is terminal. */
export const STATUS_TRANSITIONS: Record<ItemStatus, readonly ItemStatus[]> = {
  FOUND: ["MATCHED", "CLAIM_REQUESTED", "RELEASED"],
  MATCHED: ["CLAIM_REQUESTED", "RELEASED"],
  CLAIM_REQUESTED: ["RELEASED"],
  RELEASED: [],
};

export function isValidTransition(from: ItemStatus, to: ItemStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/**
 * The core product rule (from the proposal): an item may only be released
 * after a valid staff scan event. The server enforces this — the client
 * only displays available actions.
 */
export function canRelease(input: {
  status: ItemStatus;
  staffScanVerified: boolean;
  hasPendingClaim: boolean;
}): { allowed: boolean; reason?: string } {
  if (input.staffScanVerified !== true) {
    return { allowed: false, reason: "Release requires a verified staff QR scan" };
  }
  if (!input.hasPendingClaim) {
    return { allowed: false, reason: "Release requires a pending claim" };
  }
  if (input.status === "RELEASED") {
    return { allowed: false, reason: "Item is already released" };
  }
  if (!isValidTransition(input.status, "RELEASED")) {
    return { allowed: false, reason: `Cannot release from status ${input.status}` };
  }
  return { allowed: true };
}

/** Notification kinds shown to students (Phase 6 wires real delivery). */
export const NOTIFICATION_KINDS = ["MATCH_FOUND", "CLAIM_DECISION", "SYSTEM"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type AppRole = "student" | "staff";

/** Statuses shown as "amber" pills in the UI (see StatusPill tones). */
export const AMBER_STATUSES: readonly ItemStatus[] = ["MATCHED", "CLAIM_REQUESTED"];
