import "dotenv/config";

import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config (Phase 2).
 * Migrations run against the direct (unpooled) Neon endpoint when
 * DATABASE_URL_UNPOOLED is set, falling back to DATABASE_URL.
 */
export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL ??
      "postgresql://localhost:5432/claimit",
  },
});
