import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // React Native / Expo modules reference __DEV__ at import time.
    setupFiles: ["tests/setup.ts"],
  },
});
