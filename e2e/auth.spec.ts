import { test, expect } from '@playwright/test';
import { makeTestUser, registerAndLandOnDashboard } from './helpers/test-user';

// Starts logged out — this is the one spec that exercises register/login/
// logout itself, so it opts out of the shared storageState set up in
// e2e/global-setup.ts (and used by every other spec).
test.use({ storageState: { cookies: [], origins: [] } });

test('registers, logs out, and logs back in through the real UI', async ({ page }) => {
  const user = makeTestUser();

  await registerAndLandOnDashboard(page, user);
  await expect(page.getByRole('button', { name: user.name })).toBeVisible();

  await page.getByRole('button', { name: user.name }).click();
  await page.getByText('Sign Out').click();
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: user.name })).toBeVisible();
});
