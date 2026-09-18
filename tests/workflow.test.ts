import { describe, expect, it } from "vitest";

import {
  canRelease,
  isValidTransition,
  STATUS_TRANSITIONS,
} from "../shared/workflow";

describe("ClaimIt custody workflow", () => {
  it("allows FOUND to progress through the full custody chain", () => {
    expect(isValidTransition("FOUND", "MATCHED")).toBe(true);
    expect(isValidTransition("FOUND", "CLAIM_REQUESTED")).toBe(true);
    expect(isValidTransition("MATCHED", "CLAIM_REQUESTED")).toBe(true);
    expect(isValidTransition("CLAIM_REQUESTED", "RELEASED")).toBe(true);
  });

  it("forbids invalid transitions and terminal release", () => {
    expect(isValidTransition("RELEASED", "FOUND")).toBe(false);
    expect(isValidTransition("RELEASED", "CLAIM_REQUESTED")).toBe(false);
    expect(STATUS_TRANSITIONS.RELEASED).toHaveLength(0);
  });

  it("releases only with staff scan + pending claim", () => {
    expect(
      canRelease({
        status: "CLAIM_REQUESTED",
        staffScanVerified: true,
        hasPendingClaim: true,
      }),
    ).toEqual({ allowed: true });

    expect(
      canRelease({
        status: "CLAIM_REQUESTED",
        staffScanVerified: false,
        hasPendingClaim: true,
      }).allowed,
    ).toBe(false);

    expect(
      canRelease({
        status: "CLAIM_REQUESTED",
        staffScanVerified: true,
        hasPendingClaim: false,
      }).allowed,
    ).toBe(false);

    expect(
      canRelease({
        status: "RELEASED",
        staffScanVerified: true,
        hasPendingClaim: true,
      }).allowed,
    ).toBe(false);
  });
});
