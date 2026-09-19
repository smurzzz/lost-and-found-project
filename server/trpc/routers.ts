/**
 * ClaimIt tRPC routers (Phase 2).
 *
 * Procedures mirror the frozen UI contract's data needs. Status vocabulary
 * and transition rules come from shared/workflow.ts. All mutations that
 * affect custody are staffOnly and append audit events.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure, router as baseRouter, staffOnlyProcedure } from "./trpc";
import { listAuditForItem, listRecentAudit } from "../services/audit-service";
import {
  confirmRelease,
  scanQrTag,
  submitClaim,
} from "../services/claim-service";
import {
  getFoundItem,
  listFoundItems,
  logFoundItem,
} from "../services/found-item-service";
import {
  createLostReport,
  findMatchesForReport,
  listReportsForStudent,
} from "../services/lost-report-service";
import {
  logFoundItemSchema,
  reportLostItemSchema,
} from "../../shared/validation";
import { buildTagData } from "../services/tag-service";
import {
  listNotifications,
  markNotificationRead,
  unreadCount,
} from "../services/notification-service";
import { upsertDevUser } from "../auth";

export const appRouter = baseRouter({
  /** Exchange a dev identity for a session identity (dev mode only). */
  auth: {
    me: publicProcedure.query(({ ctx }) => ctx.user),
    devLogin: publicProcedure
      .input(z.object({ name: z.string().min(1), role: z.enum(["student", "staff"]) }))
      .mutation(async ({ input }) => upsertDevUser(input.name, input.role)),
  },

  items: {
    list: publicProcedure.query(() => listFoundItems()),
    pendingClaims: staffOnlyProcedure.query(() =>
      listFoundItems({ onlyPendingClaims: true }),
    ),
    byId: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(({ input }) => getFoundItem(input.id)),
    /**
     * Log a found item. Input is validated by the shared Phase 3 contract
     * (logFoundItemSchema) — invalid/missing fields return field-level issues.
     */
    log: staffOnlyProcedure
      .input(logFoundItemSchema)
      .mutation(({ ctx, input }) =>
        logFoundItem({
          ...input,
          staffId: ctx.user.id,
          staffName: ctx.user.name,
        }),
      ),
    /** Render the printable tag (QR data URL + item summary) for an item. */
    tag: staffOnlyProcedure
      .input(z.object({ itemId: z.string().uuid() }))
      .query(({ input }) => buildTagData(input.itemId)),
    /** Staff scan: resolves a QR payload to item + pending claim. */
    scan: staffOnlyProcedure
      .input(z.object({ qrCode: z.string().min(4) }))
      .mutation(({ ctx, input }) =>
        scanQrTag({
          qrCode: input.qrCode,
          staffId: ctx.user.id,
          staffName: ctx.user.name,
        }),
      ),
    /** Release: enforced server-side (scan + pending claim required). */
    release: staffOnlyProcedure
      .input(z.object({ itemId: z.string().uuid() }))
      .mutation(({ ctx, input }) =>
        confirmRelease({
          itemId: input.itemId,
          staffId: ctx.user.id,
          staffName: ctx.user.name,
        }),
      ),
  },

  reports: {
    /** Validated by the shared Phase 4 form contract. */
    create: publicProcedure
      .input(reportLostItemSchema)
      .mutation(({ ctx, input }) =>
        createLostReport({
          studentId: ctx.user.id,
          ...input,
          imageUrl: input.imageUrl ?? null,
        }),
      ),
    mine: publicProcedure.query(({ ctx }) => listReportsForStudent(ctx.user.id)),
    /** Structured matches for one of the caller's own reports. */
    matches: publicProcedure
      .input(z.object({ reportId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const reports = await listReportsForStudent(ctx.user.id);
        const report = reports.find((r) => r.id === input.reportId);
        if (!report) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
        }
        return findMatchesForReport(report);
      }),
  },

  claims: {
    submit: publicProcedure
      .input(
        z.object({
          foundItemId: z.string().uuid(),
          verificationAnswer: z.string().min(1).max(1000),
          lostReportId: z.string().uuid().nullish(),
        }),
      )
      .mutation(({ ctx, input }) =>
        submitClaim({
          foundItemId: input.foundItemId,
          studentId: ctx.user.id,
          studentName: ctx.user.name,
          verificationAnswer: input.verificationAnswer,
          lostReportId: input.lostReportId ?? null,
        }),
      ),
  },

  audit: {
    recent: publicProcedure.query(() => listRecentAudit()),
    forItem: publicProcedure
      .input(z.object({ itemId: z.string().uuid() }))
      .query(({ input }) => listAuditForItem(input.itemId)),
  },

  notifications: {
    list: publicProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
    unreadCount: publicProcedure.query(({ ctx }) => unreadCount(ctx.user.id)),
    markRead: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(({ ctx, input }) => markNotificationRead(ctx.user.id, input.id)),
  },
});

export type AppRouter = typeof appRouter;
