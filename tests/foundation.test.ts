import { describe, expect, it } from "vitest";

type ClaimItRole = "student" | "staff" | "admin";

type ClaimStatus = "FOUND" | "MATCHED" | "CLAIM REQUESTED" | "RELEASED";

interface FoundItemFixture {
  id: string;
  name: string;
  category: string;
  location: string;
  status: ClaimStatus;
}

const makeFoundItem = (
  id: string,
  overrides: Partial<FoundItemFixture> = {},
): FoundItemFixture => ({
  id,
  name: "Blue water bottle",
  category: "Other",
  location: "Library, Floor 2",
  status: "FOUND",
  ...overrides,
});

describe("ClaimIt foundation", () => {
  it("defines the role vocabulary from the proposal", () => {
    const roles: ClaimItRole[] = ["student", "staff", "admin"];
    expect(roles).toHaveLength(3);
    expect(roles).toContain("staff");
  });

  it("creates typed found-item fixtures with defaults", () => {
    const item = makeFoundItem("item-001");
    expect(item.status).toBe("FOUND");
    expect(item.name).toBe("Blue water bottle");
    expect(item.id).toBe("item-001");
  });

  it("can represent the core status flow as a transition list", () => {
    const flow: ClaimStatus[] = [
      "FOUND",
      "MATCHED",
      "CLAIM REQUESTED",
      "RELEASED",
    ];
    expect(flow[0]).toBe("FOUND");
    expect(flow[flow.length - 1]).toBe("RELEASED");
    expect(flow.indexOf("CLAIM REQUESTED")).toBeGreaterThan(
      flow.indexOf("MATCHED"),
    );
  });
});
