import { test, expect } from '@playwright/test';

// Already authenticated via the shared storageState from e2e/global-setup.ts.
test('imports a recipe from a URL and saves it to Cook Later', async ({ page }) => {
  await page.goto('/recipes');
  await page.getByRole('button', { name: 'Import Recipe' }).click();

  // Points at e2e/mock-servers/server.mjs's GET /recipe-fixture — a static
  // page with JSON-LD Recipe data, standing in for a real scraped site.
  await page.getByLabel('Source').fill('http://127.0.0.1:4010/recipe-fixture');
  await page.getByRole('button', { name: 'Fetch Recipe' }).click();

  await expect(page.getByLabel('Title')).toHaveValue('E2E Mock Tabbouleh', { timeout: 15_000 });

  await page.getByRole('button', { name: 'Add to Cook Later' }).click();
  await expect(page.getByText('Saved to Cook Later')).toBeVisible({ timeout: 10_000 });
});
