import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    // The property tests play many random games. On a slow CI runner one test can pass 5 seconds.
    testTimeout: 30_000,
  },
});
