/**
 * tRPC initialization and authorization middleware (Phase 2).
 *
 * public: any authenticated request (all procedures require a user —
 *         the login screen is SSO-only by design).
 * staffOnly: procedures that mutate found items, claims, or releases.
 */
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";

import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    // Never leak stack traces outside development.
    if (process.env.NODE_ENV === "production") {
      return { ...shape, data: { ...shape.data, stack: undefined } };
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const staffOnlyProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "staff") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff role required",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const studentProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "student") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Student role required",
    });
  }
  return next({ ctx });
});
