import { defineConfig } from "@playwright/test";

// Local E2E against the real stack: `npm run stack:up` (DB + Spring) first; Next dev starts here.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3100", channel: "chrome", trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- -p 3100", url: "http://localhost:3100/login", reuseExistingServer: true, timeout: 120_000 },
});
