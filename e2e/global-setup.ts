import { chromium, type FullConfig } from '@playwright/test';
import { makeTestUser, registerAndLandOnDashboard } from './helpers/test-user';

export const STORAGE_STATE_PATH = 'e2e/.auth/user.json';

// Registering costs one of the 5 register-attempts/hour the app rate-limits
// per IP (src/app/api/v1/auth/register/route.ts) — real production
// behavior, not something to weaken for tests. Doing it once here and
// sharing the resulting session via storageState (instead of every spec
// registering its own user) keeps the whole suite well under that quota.
// auth.spec.ts opts out of this shared state since it exercises
// register/login/logout itself.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await registerAndLandOnDashboard(page, makeTestUser());
  await page.context().storageState({ path: STORAGE_STATE_PATH });

  await browser.close();
}
