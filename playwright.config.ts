import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = `http://localhost:${PORT}`;

/**
 * E2E runs against a production build with the test-only sign-in provider enabled.
 * Needs a reachable DATABASE_URL (npm run db:local gives you one) that has been migrated + seeded.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: BASE, trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${PORT}` : `npx next build && npx next start -p ${PORT}`,
    url: `${BASE}/api/status`,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://drp:drp@localhost:5433/drp",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-123",
      AUTH_URL: BASE,
      AUTH_TRUST_HOST: "true",
      AUTH_TEST_LOGIN_SECRET: "e2e-login",
      ADMIN_ROLE_IDS: "900000000000000001",
      FIVEM_API_SECRET: "e2e-fivem",
      NEXT_PUBLIC_SITE_URL: BASE,
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
