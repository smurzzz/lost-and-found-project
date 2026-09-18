/**
 * Lost report service (Phase 2).
 *
 * Students file structured reports (category + description + location).
 * Matching is intentionally rule-based (no AI, per proposal exclusions):
 * same category plus word overlap between report text and item name,
 * and items that entered the system after the report was filed.
 */
import { and, desc, eq, gte } from "drizzle-orm";

import { getDb } from "../db/client";
import { foundItems, lostReports } from "../db/schema";
import { toItemDto, type FoundItemDto } from "./found-item-service";
import { recordAuditEvent } from "./audit-service";

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

export async function createLostReport(input: {
  studentId: string;
  category: string;
  description: string;
  dateLost: Date;
  locationLost: string;
  imageUrl?: string | null;
}): Promise<LostReportDto> {
  const db = getDb();
  const inserted = await db
    .insert(lostReports)
    .values({
      studentId: input.studentId,
      category: input.category,
      description: input.description,
      dateLost: input.dateLost,
      locationLost: input.locationLost,
      imageUrl: input.imageUrl ?? null,
    })
    .returning();
  return toReportDto(inserted[0]);
}

export async function listReportsForStudent(studentId: string): Promise<LostReportDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lostReports)
    .where(eq(lostReports.studentId, studentId))
    .orderBy(desc(lostReports.createdAt));
  return rows.map(toReportDto);
}

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
}

/**
 * Structured possible matches for a report: same category, word overlap
 * with the description, and the item was logged on/after the loss date.
 */
export async function findMatchesForReport(
  report: LostReportDto,
  limit = 5,
): Promise<FoundItemDto[]> {
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

  const reportWords = new Set(significantWords(report.description));
  const scored = rows
    .map((row) => {
      const item = toItemDto(row);
      const itemWords = significantWords(`${item.name} ${item.location}`);
      const overlap = itemWords.filter((w) => reportWords.has(w)).length;
      return { item, overlap };
    })
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit);
  return scored.map(({ item }) => item);
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
