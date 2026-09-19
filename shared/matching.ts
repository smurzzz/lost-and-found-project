/**
 * Shared structured matching (Phase 4).
 *
 * Rule-based matching between lost reports and found items using ONLY
 * structured fields — category equality, word overlap across description,
 * item name, and location, and a location similarity boost. Deliberately
 * no image similarity and no AI (proposal exclusion).
 *
 * Shared verbatim by the server (authoritative scoring) and the client
 * (explanation display), and unit-tested directly.
 */

import type { ItemCategory } from "./validation";

/** A lost report side of the match equation (subset of fields used). */
export type MatchReportInput = {
  category: string;
  description: string;
  locationLost: string;
  dateLost: Date;
};

/** A found item side of the match equation (subset of fields used). */
export type MatchItemInput = {
  name: string;
  category: string;
  location: string;
  foundDate: Date;
  imageUrl?: string | null;
  /** Free-form detail logged by staff; feeds description matching. */
  description?: string | null;
};

/** One scored candidate returned by the matcher. */
export type MatchCandidate = {
  item: MatchItemInput;
  /** 0-100 quality score. */
  score: number;
  /** Structured reasons the item matched, for UI explanation. */
  reasons: string[];
};

/** Words too common to be discriminating in descriptions. */
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "was", "were", "has", "had", "have",
  "this", "that", "when", "where", "what", "who", "into", "from",
  "near", "around", "there", "then", "his", "her", "its", "all",
  "some", "are", "but", "not", "you", "your", "our", "out", "off",
  "item", "lost", "found", "campus", "small", "black", "blue",
]);

/** Tokenize text into significant lowercase words (letters/digits, len>=3). */
export function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

/** Jaccard-style overlap: |A ∩ B| / |A ∪ B|, 0..1. */
export function wordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const w of setA) if (setB.has(w)) shared++;
  const union = new Set([...a, ...b]).size;
  return shared / union;
}

/**
 * Coverage of B by A: |A ∩ B| / |B| — how much of B's vocabulary the
 * report explains. Coverage (not Jaccard) is the right metric here: a
 * detailed report should not be penalized for listing many details.
 */
export function coverageOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  let shared = 0;
  for (const w of new Set(b)) if (setA.has(w)) shared++;
  return shared / new Set(b).size;
}

const MS_PER_DAY = 86_400_000;

/** Location similarity: shared significant tokens across the two strings. */
function locationSimilarity(locationLost: string, itemLocation: string): number {
  const a = significantWords(locationLost);
  const b = significantWords(itemLocation);
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let shared = 0;
  for (const w of a) if (setB.has(w)) shared++;
  return shared / Math.max(a.length, b.length);
}

/**
 * Score one candidate item against a report. Returns null when the item
 * cannot match (category mismatch, item predates the loss, zero signal).
 *
 * Score composition (0-100), all structured — no AI, no image similarity:
 *  - category equality is the gate (30 pts)
 *  - item-name words covered by the report (up to 30 pts)
 *  - item description/location words covered by the report (up to 15 pts)
 *  - location similarity (up to 15 pts)
 *  - recency of the found date relative to the loss (up to 10 pts)
 */
export function scoreMatch(
  report: MatchReportInput,
  item: MatchItemInput,
): MatchCandidate | null {
  // Gate 1: category must match exactly (structured matching only).
  if (item.category !== report.category) return null;

  // Gate 2: the item must have been found on/after the loss date.
  if (item.foundDate.getTime() < report.dateLost.getTime()) return null;

  const reportWords = significantWords(report.description);
  const nameWords = significantWords(item.name);
  const detailWords = significantWords(
    `${item.description ?? ""} ${item.location}`,
  );

  const nameOverlap = coverageOverlap(reportWords, nameWords);
  const detailOverlap = coverageOverlap(reportWords, detailWords);
  const locationSim = locationSimilarity(report.locationLost, item.location);

  // Gate 3: require at least one real signal beyond the category gate.
  if (nameOverlap === 0 && detailOverlap === 0 && locationSim === 0) {
    return null;
  }

  const reasons: string[] = ["Same category"];

  const daysLost =
    (item.foundDate.getTime() - report.dateLost.getTime()) / MS_PER_DAY;
  const recency = Math.max(0, 1 - daysLost / 30);

  const score = Math.round(
    30 +
      nameOverlap * 30 +
      detailOverlap * 15 +
      locationSim * 15 +
      recency * 10,
  );

  if (nameOverlap >= 0.3) reasons.push("Item name matches your description");
  if (detailOverlap >= 0.15) reasons.push("Description overlaps item details");
  if (locationSim >= 0.3) reasons.push("Locations are similar");
  if (daysLost <= 7) reasons.push("Found within a week of the loss");

  return {
    item,
    score: Math.min(100, score),
    reasons,
  };
}

/**
 * Score a list of candidates and return the best matches, strongest first.
 * Never returns AI-similarity data — only structured, explainable reasons.
 */
export function rankMatches(
  report: MatchReportInput,
  items: MatchItemInput[],
  limit = 5,
): MatchCandidate[] {
  return items
    .map((item) => scoreMatch(report, item))
    .filter((c): c is MatchCandidate => c !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Default category used when a report does not specify one. */
export const DEFAULT_MATCH_CATEGORY: ItemCategory = "Other";
