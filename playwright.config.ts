import { defineConfig } from "@playwright/test";

/**
 * Browser tests. They need a Postgres to point the app at:
 *
 *   E2E_DATABASE_URL=postgres://... npm run test:e2e
 *
 * The database is wiped and reloaded with the sample cats before each test,
 * so never point this at real data.
 */
const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) throw new Error("Set E2E_DATABASE_URL to a throwaway Postgres database.");
process.env.DATABASE_URL = databaseUrl;

const PORT = 3210;

export default defineConfig({
  testDir: "tests/e2e",
  // One database, so one test at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    hasTouch: true,
    isMobile: true,
    trace: "off",
  },
  projects: [
    { name: "phone-390", use: { viewport: { width: 390, height: 844 } } },
    { name: "phone-360", use: { viewport: { width: 360, height: 640 } }, grep: /@layout/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: { DATABASE_URL: databaseUrl },
  },
});
