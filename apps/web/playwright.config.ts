import { defineConfig } from "@playwright/test";

// Local E2E against the real stack: `npm run stack:up` (DB + Spring) first; Next dev starts here.
// E2E uses the passwordless dev login (HS256, issuer popspot-dev), so never reuse a server started without it.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3100", channel: "chrome", trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- -p 3100", url: "http://localhost:3100/login", reuseExistingServer: false, timeout: 120_000, env: { DEV_AUTH_ENABLED: "true" } },
});
