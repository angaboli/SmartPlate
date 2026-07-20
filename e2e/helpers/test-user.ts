import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

// The @e2e.smartplate.test suffix is what e2e/global-teardown.ts matches on
// to delete every user this suite creates — never reuse this domain for
// anything that should survive a test run.
export function makeTestUser(): TestUser {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return {
    name: 'E2E Test User',
    email: `e2e-${id}@e2e.smartplate.test`,
    password: 'E2eTestPassword123!',
  };
}

/** Registers a fresh user through the real UI and waits for the dashboard redirect. */
export async function registerAndLandOnDashboard(page: Page, user: TestUser) {
  await page.goto('/register');
  await page.getByLabel('Full Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm Password').fill(user.password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}
