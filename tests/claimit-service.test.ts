import { describe, expect, it } from "vitest";

import { devToken } from "../lib/claimit-client";
import { ClaimItService } from "../lib/claimit-service";

describe("ClaimIt service facade", () => {
  it("builds dev tokens in the server-accepted format", () => {
    // Spaces are encoded as underscores (HTTP headers end at whitespace).
    expect(devToken("Jordan Lee", "staff")).toBe("dev.Jordan_Lee.staff");
    expect(devToken("Alex Morgan", "student")).toBe("dev.Alex_Morgan.student");
  });

  it("falls back to mock data when no API URL is configured", async () => {
    const items = await ClaimItService.listItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("qrCode");
  });

  it("returns the append-only audit chain from fallback", async () => {
    const events = await ClaimItService.recentAudit();
    const actions = events.map((e) => e.action);
    expect(actions).toContain("FOUND");
    expect(actions).toContain("RELEASED");
  });

  it("confirms release in fallback mode", async () => {
    const item = await ClaimItService.confirmRelease("1");
    expect(item.status).toBe("RELEASED");
  });
});
