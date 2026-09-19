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
 *
 * A scan is "valid" when it is recent (within SCAN_FRESHNESS_MINUTES).
 * This prevents releasing on a scan from hours/days earlier at a different
 * desk; staff must scan at the moment of handover.
 */
export const SCAN_FRESHNESS_MINUTES = 10;

export function canRelease(input: {
  status: ItemStatus;
  staffScanVerified: boolean;
  hasPendingClaim: boolean;
  /** Age of the last scan in minutes; omit to skip the freshness check. */
  minutesSinceScan?: number;
}): { allowed: boolean; reason?: string } {
  // Terminal state first: an already-released item must never re-release,
  // and the reason must say so (the pending claim is gone by then).
  if (input.status === "RELEASED") {
    return { allowed: false, reason: "Item is already released" };
  }
  if (input.staffScanVerified !== true) {
    return { allowed: false, reason: "Release requires a verified staff QR scan" };
  }
  if (
    input.minutesSinceScan !== undefined &&
    input.minutesSinceScan > SCAN_FRESHNESS_MINUTES
  ) {
    return {
      allowed: false,
      reason: `Scan is stale — rescan the QR tag (older than ${SCAN_FRESHNESS_MINUTES} minutes)`,
    };
  }
  if (!input.hasPendingClaim) {
    return { allowed: false, reason: "Release requires a pending claim" };
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
