/**
 * ClaimIt API server (Phase 2).
 *
 * Express 5 hosts the tRPC app via the fetch adapter. dotenv loads .env
 * (DATABASE_URL for Neon, CLERK_* when configured). Run with `pnpm server`.
 */
import "dotenv/config";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";

import { appRouter } from "./trpc/routers";
import { createContext } from "./trpc/context";
import { isClerkConfigured, isDevLoginEnabled } from "./auth";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "claimit-api",
    auth: isClerkConfigured()
      ? isDevLoginEnabled()
        ? "clerk+dev-login"
        : "clerk"
      : "dev-fallback",
  });
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) =>
      createContext({
        authorization: req.headers.authorization,
        headers: req.headers as Record<string, string | undefined>,
      }),
    onError: ({ error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("[trpc]", error);
      }
    },
  }),
);

// Some CI shells export PORT=0; treat 0/NaN as unset and use the default.
const configuredPort = Number(process.env.PORT);
const port = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
app.listen(port, () => {
  console.log(`ClaimIt API listening on http://localhost:${port}`);
  console.log(
    `Auth mode: ${
      isClerkConfigured()
        ? isDevLoginEnabled()
          ? "clerk + dev-login override"
          : "clerk"
        : "dev-fallback (no CLERK_SECRET_KEY)"
    }`,
  );
});
