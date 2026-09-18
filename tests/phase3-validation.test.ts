import { describe, expect, it } from "vitest";

import {
  formatIssues,
  isValidQrPayload,
  logFoundItemSchema,
} from "../shared/validation";

describe("logFoundItemSchema (Phase 3)", () => {
  const valid = {
    name: "Navy Backpack",
    category: "Bags" as const,
    location: "Library · 2nd floor",
    foundDate: new Date().toISOString(),
  };

  it("accepts a valid payload", () => {
    const parsed = logFoundItemSchema.parse(valid);
    expect(parsed.name).toBe("Navy Backpack");
  });

  it("rejects missing fields with field-level messages", () => {
    const result = logFoundItemSchema.safeParse({ foundDate: valid.foundDate });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = formatIssues(result.error);
      expect(issues.name).toBeTruthy();
      expect(issues.category).toBeTruthy();
      expect(issues.location).toBeTruthy();
    }
  });

  it("rejects an unknown category", () => {
    const result = logFoundItemSchema.safeParse({
      ...valid,
      category: "Vehicles",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short names and overly long locations", () => {
    expect(
      logFoundItemSchema.safeParse({ ...valid, name: "X" }).success,
    ).toBe(false);
    expect(
      logFoundItemSchema.safeParse({ ...valid, location: "L".repeat(161) })
        .success,
    ).toBe(false);
  });

  it("rejects invalid dates and bad photo URLs", () => {
    expect(
      logFoundItemSchema.safeParse({ ...valid, foundDate: "not-a-date" })
        .success,
    ).toBe(false);
    expect(
      logFoundItemSchema.safeParse({ ...valid, imageUrl: "not-a-url" })
        .success,
    ).toBe(false);
  });
});

describe("QR payload contract (Phase 3)", () => {
  it("accepts payloads in the canonical CLM format", () => {
    expect(isValidQrPayload("CLM-A1B2-C3D4-0123456789ABCDEF")).toBe(true);
  });

  it("rejects malformed payloads", () => {
    expect(isValidQrPayload("CLM-2048-AX7")).toBe(false);
    expect(isValidQrPayload("CLM-A1B2-C3D4-0123456789ABCDE")).toBe(false);
    expect(isValidQrPayload("")).toBe(false);
    expect(isValidQrPayload("https://claimit.example/t/123")).toBe(false);
  });
});
