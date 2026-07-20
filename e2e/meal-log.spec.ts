import { test, expect } from '@playwright/test';

// Already authenticated via the shared storageState from e2e/global-setup.ts.
test('logs a meal and shows the AI analysis and suggestions', async ({ page }) => {
  await page.goto('/dashboard');

  await page
    .getByPlaceholder(/grilled chicken/i)
    .fill('Grilled chicken with rice and steamed broccoli');
  await page.getByRole('button', { name: 'Analyze with AI' }).click();

  // The AI call is answered by e2e/mock-servers/server.mjs (see
  // OPENAI_BASE_URL in playwright.config.ts), not the real OpenAI API.
  await expect(page.getByText('Good', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Add a side salad')).toBeVisible();
  await expect(
    page.getByText('A fresh side salad would round out this meal nicely.'),
  ).toBeVisible();
});
