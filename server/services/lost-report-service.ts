/**
 * Lost report service (Phases 2/4).
 *
 * Students file structured reports (category + description + location).
 * Matching is intentionally rule-based (no AI, per proposal exclusions):
 * the shared engine in shared/matching.ts scores candidates on category
 * equality, word overlap across description/name/location, and recency.
 * New matches fire MATCH_FOUND notifications for the report's student.
 */
import { and, desc, eq, gte } from "drizzle-orm";

import { rankMatches } from "../../shared/matching";
import { reportLostItemSchema, type ReportLostItemInput } from "../../shared/validation";
import { getDb } from "../db/client";
import { foundItems, lostReports } from "../db/schema";
import { toItemDto, type FoundItemDto } from "./found-item-service";
import { recordAuditEvent } from "./audit-service";
import { createNotification } from "./notification-service";

export type LostReportDto = {
  id: string;
  studentId: string;
  category: string;
  description: string;
  dateLost: Date;
  locationLost: string;
  imageUrl: string | null;
  status: (typeof lostReports.$inferSelect)["status"];
};

/** A report plus the number of current structured matches. */
export type LostReportWithMatchCount = LostReportDto & {
  matchCount: number;
};

/** A scored match enriched for the UI (match reasons + display fields). */
export type ReportMatch = {
  item: FoundItemDto;
  score: number;
  reasons: string[];
};

export function toReportDto(row: typeof lostReports.$inferSelect): LostReportDto {
  return {
    id: row.id,
    studentId: row.studentId,
    category: row.category,
    description: row.description,
    dateLost: row.dateLost,
    locationLost: row.locationLost,
    imageUrl: row.imageUrl,
    status: row.status,
  };
}

/**
 * Create a lost report. Input is validated by the shared Phase 4 contract
 * (defense in depth: tRPC already parsed it).
 */
export async function createLostReport(
  input: ReportLostItemInput & { studentId: string },
): Promise<LostReportDto> {
  const parsed = reportLostItemSchema.parse(input);
  const db = getDb();
  const inserted = await db
    .insert(lostReports)
    .values({
      studentId: input.studentId,
      category: parsed.category,
      description: parsed.description,
      dateLost: new Date(parsed.dateLost),
      locationLost: parsed.locationLost,
      imageUrl: parsed.imageUrl ?? null,
    })
    .returning();
  const report = toReportDto(inserted[0]);

  // Fire MATCH_FOUND notifications for any existing items that already
  // match this new report (Phase 6 adds push delivery).
  const matches = await findMatchesForReport(report);
  for (const match of matches) {
    await createNotification({
      userId: input.studentId,
      kind: "MATCH_FOUND",
      title: "Possible match found",
      body: `A ${match.item.name} found at ${match.item.location} may match your lost ${report.category.toLowerCase()} report.`,
      foundItemId: match.item.id,
    });
  }

  return report;
}

export async function listReportsForStudent(
  studentId: string,
): Promise<LostReportWithMatchCount[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lostReports)
    .where(eq(lostReports.studentId, studentId))
    .orderBy(desc(lostReports.createdAt));

  return Promise.all(
    rows.map(async (row) => {
      const report = toReportDto(row);
      return { ...report, matchCount: await countMatchesForReport(report) };
    }),
  );
}

/** Recount matches on demand (cheap: candidate window capped at 50). */
export async function countMatchesForReport(report: LostReportDto): Promise<number> {
  const db = getDb();
  const rows = await db
    .select()
    .from(foundItems)
    .where(
      and(
        eq(foundItems.category, report.category),
        gte(foundItems.foundDate, report.dateLost),
      ),
    )
    .limit(50);
  const reportInput = {
    category: report.category,
    description: report.description,
    locationLost: report.locationLost,
    dateLost: report.dateLost,
  };
  return rankMatches(
    reportInput,
    rows.map((row) => toItemDto(row)),
    50,
  ).length;
}

/**
 * Structured possible matches for a report, scored by the shared engine.
 * Returns the top candidates with explainable reasons — no AI, no image
 * similarity.
 */
export async function findMatchesForReport(
  report: LostReportDto,
  limit = 5,
): Promise<ReportMatch[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(foundItems)
    .where(
      and(
        eq(foundItems.category, report.category),
        gte(foundItems.foundDate, report.dateLost),
      ),
    )
    .orderBy(desc(foundItems.createdAt))
    .limit(50);

  const reportInput = {
    category: report.category,
    description: report.description,
    locationLost: report.locationLost,
    dateLost: report.dateLost,
  };
  const candidates = rankMatches(
    reportInput,
    rows.map((row) => toItemDto(row)),
    limit,
  );
  // Candidates carry the full FoundItemDto (toItemDto output satisfies
  // MatchItemInput), so map back to the enriched ReportMatch shape.
  return candidates.map(({ item, score, reasons }) => ({
    item: item as FoundItemDto,
    score,
    reasons,
  }));
}

/** Mark a report as matched once a claim is submitted against it. */
export async function markReportMatched(reportId: string): Promise<void> {
  const db = getDb();
  await db
    .update(lostReports)
    .set({ status: "MATCHED", updatedAt: new Date() })
    .where(eq(lostReports.id, reportId));
}

export { recordAuditEvent };
