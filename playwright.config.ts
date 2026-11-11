import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests of the main flows (plan, section 9.1): tutorial, match against the AI, deck editor, online match.
 * The tests start the PvP server (in memory) and the Vite dev server.
 * PW_CHROMIUM sets a Chromium binary, when the installed browser has another version.
 */
const E2E_PORT = 5199;
export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}/`,
    locale: "it-IT",
    trace: "off",
    viewport: { width: 1280, height: 900 },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: [
    {
      command: "pnpm start:server",
      env: { PORT: "8787", DB_PATH: ":memory:", TURN_SECONDS: "120" },
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm --filter @tcg/client exec vite --port ${E2E_PORT} --strictPort --host 127.0.0.1`,
      url: `http://127.0.0.1:${E2E_PORT}/`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
