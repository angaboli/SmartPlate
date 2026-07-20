import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE_PATH } from './e2e/global-setup';

// Dedicated port, distinct from the usual `pnpm dev` (3000), so E2E never
// collides with a dev server the developer already has running.
const PORT = 3100;
const MOCK_PORT = 4010;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    // Most specs start already logged in (see e2e/global-setup.ts) so they
    // don't each burn a registration against the 5/hour rate limit.
    // auth.spec.ts overrides this to test register/login/logout itself.
    storageState: STORAGE_STATE_PATH,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/mock-servers/server.mjs',
      url: `http://127.0.0.1:${MOCK_PORT}/recipe-fixture`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_SERVER_PORT: String(MOCK_PORT) },
    },
    {
      // `next dev` refuses a second instance in the same project directory
      // even on a different port (single dev-server lock per project dir),
      // which collides with a developer's own `pnpm dev`. A built/started
      // instance doesn't have that lock, and is closer to prod anyway.
      command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        // Redirects every OpenAI call this server makes to the mock above —
        // see the comment on `baseURL` in src/services/ai.service.ts.
        OPENAI_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/openai`,
      },
    },
  ],
});
