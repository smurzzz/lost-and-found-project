import { describe, expect, it } from "vitest";

import { canRelease, SCAN_FRESHNESS_MINUTES } from "../shared/workflow";

const base = {
  status: "CLAIM_REQUESTED" as const,
  staffScanVerified: true,
  hasPendingClaim: true,
};

describe("canRelease freshness rule (Phase 5)", () => {
  it("allows release right after a fresh scan", () => {
    expect(canRelease({ ...base, minutesSinceScan: 1 }).allowed).toBe(true);
    expect(canRelease({ ...base, minutesSinceScan: SCAN_FRESHNESS_MINUTES }).allowed).toBe(
      true,
    );
  });

  it("rejects a stale scan", () => {
    const decision = canRelease({
      ...base,
      minutesSinceScan: SCAN_FRESHNESS_MINUTES + 1,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/stale|rescan/i);
  });

  it("still rejects without any scan", () => {
    expect(
      canRelease({ ...base, staffScanVerified: false, minutesSinceScan: 0 }).allowed,
    ).toBe(false);
  });

  it("still rejects without a pending claim", () => {
    expect(canRelease({ ...base, hasPendingClaim: false }).allowed).toBe(false);
  });

  it("still rejects an already-released item", () => {
    expect(canRelease({ ...base, status: "RELEASED" as const }).allowed).toBe(false);
  });

  it("skips the freshness check when scan age is unknown (back-compat)", () => {
    expect(canRelease(base).allowed).toBe(true);
  });
});
