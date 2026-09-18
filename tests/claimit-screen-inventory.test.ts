import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("ClaimIt UI screen inventory", () => {
  const source = readFileSync(resolve(process.cwd(), "app/(tabs)/index.tsx"), "utf8");

  it("contains every requested screen route", () => {
    const requiredScreens = [
      "login",
      "student-home",
      "report-lost",
      "matches",
      "claim-verification",
      "staff-home",
      "log-found",
      "qr-tag",
      "scan-release",
      "audit",
      "profile",
    ];

    for (const screen of requiredScreens) {
      expect(source).toContain(`\"${screen}\"`);
    }
  });

  it("contains the core ClaimIt verification copy", () => {
    expect(source).toContain("Continue with Google");
    expect(source).toContain("Submit Claim");
    expect(source).toContain("Confirm Release");
    expect(source).toContain("Every found item receives a unique QR tag.");
  });
});
