import { describe, expect, it } from "vitest";

import {
  rankMatches,
  scoreMatch,
  significantWords,
  wordOverlap,
} from "../shared/matching";

const report = {
  category: "Bags",
  description:
    "Black backpack with an astronomy patch on the front pocket and a broken left strap adjuster",
  locationLost: "Library, Building A",
  dateLost: new Date("2025-04-24T09:00:00Z"),
};

describe("significantWords (Phase 4)", () => {
  it("tokenizes and drops stop words and short tokens", () => {
    expect(
      significantWords("The black backpack was lost near the Library"),
    ).toEqual(["backpack", "library"]);
  });
});

describe("wordOverlap (Phase 4)", () => {
  it("computes Jaccard overlap", () => {
    const a = significantWords("astronomy patch broken strap");
    const b = significantWords("astronomy patch on the front pocket");
    expect(wordOverlap(a, b)).toBeGreaterThan(0);
    expect(wordOverlap([], b)).toBe(0);
    expect(wordOverlap(a, [])).toBe(0);
  });
});

describe("scoreMatch (Phase 4)", () => {
  const strongItem = {
    name: "Navy Backpack",
    category: "Bags",
    location: "Library, 2nd floor",
    foundDate: new Date("2025-04-26T10:00:00Z"),
    imageUrl: null,
  };

  it("matches a same-category item with overlapping description", () => {
    const candidate = scoreMatch(report, strongItem);
    expect(candidate).not.toBeNull();
    // Name overlap + location similarity + recency + category gate.
    expect(candidate!.score).toBeGreaterThanOrEqual(50);
    expect(candidate!.reasons).toContain("Same category");
    expect(candidate!.reasons).toContain("Item name matches your description");
  });

  it("rejects a different category even with identical text", () => {
    const candidate = scoreMatch(report, {
      ...strongItem,
      name: "astronomy patch broken strap backpack",
      category: "Electronics",
    });
    expect(candidate).toBeNull();
  });

  it("rejects items found BEFORE the loss date", () => {
    const candidate = scoreMatch(report, {
      ...strongItem,
      foundDate: new Date("2025-04-20T10:00:00Z"),
    });
    expect(candidate).toBeNull();
  });

  it("rejects zero-signal items (no word or location overlap)", () => {
    const candidate = scoreMatch(report, {
      name: "Umbrella",
      category: "Bags",
      location: "Sports Hall",
      foundDate: new Date("2025-04-27T10:00:00Z"),
    });
    expect(candidate).toBeNull();
  });

  it("accepts a location-only match with a lower score", () => {
    const candidate = scoreMatch(report, {
      name: "Tote",
      category: "Bags",
      location: "Library entrance",
      foundDate: new Date("2025-04-27T10:00:00Z"),
    });
    expect(candidate).not.toBeNull();
    expect(candidate!.score).toBeLessThan(
      scoreMatch(report, strongItem)!.score,
    );
  });

  it("caps the score at 100", () => {
    const perfect = scoreMatch(report, {
      name: "astronomy patch broken strap adjuster backpack library",
      category: "Bags",
      location: "library building",
      foundDate: new Date("2025-04-24T09:01:00Z"),
    });
    expect(perfect!.score).toBeLessThanOrEqual(100);
  });
});

describe("rankMatches (Phase 4)", () => {
  const items = [
    {
      name: "Navy Backpack",
      category: "Bags",
      location: "Library, 2nd floor",
      foundDate: new Date("2025-04-26T10:00:00Z"),
    },
    {
      name: "iPhone",
      category: "Electronics",
      location: "Library, 2nd floor",
      foundDate: new Date("2025-04-26T10:00:00Z"),
    },
    {
      name: "School Bag",
      category: "Bags",
      location: "Gym",
      foundDate: new Date("2025-04-25T10:00:00Z"),
    },
  ];

  it("returns only viable candidates, strongest first", () => {
    const ranked = rankMatches(report, items);
    expect(ranked.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
    expect(ranked.every((c) => c.item.category === "Bags")).toBe(true);
  });

  it("returns an empty list when nothing matches (no-match case)", () => {
    expect(
      rankMatches(report, [
        {
          name: "iPhone",
          category: "Electronics",
          location: "Library",
          foundDate: new Date("2025-04-26T10:00:00Z"),
        },
      ]),
    ).toEqual([]);
    expect(rankMatches(report, [])).toEqual([]);
  });

  it("respects the limit parameter", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      name: `Bag ${i} astronomy strap`,
      category: "Bags",
      location: "Library",
      foundDate: new Date("2025-04-26T10:00:00Z"),
    }));
    expect(rankMatches(report, many, 5)).toHaveLength(5);
  });
});
