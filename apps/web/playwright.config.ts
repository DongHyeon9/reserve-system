import { defineConfig } from "@playwright/test";

// Local E2E against the real stack: `npm run stack:up` (DB + Spring) first.
// Builds and starts its own production server in .next-e2e, so it can run while `npm run web:dev` is open.
// Uses the passwordless dev login (HS256, issuer popspot-dev); E2E_API_BASE_URL points at a Spring using the Docker DB.
const env = {
  DEV_AUTH_ENABLED: "true",
  NEXT_DIST_DIR: ".next-e2e",
  API_BASE_URL: process.env.E2E_API_BASE_URL ?? "http://localhost:8080",
};

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3100", channel: "chrome", trace: "retain-on-failure" },
  webServer: {
    command: "npx next build && npx next start -p 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 240_000,
    env,
  },
});
