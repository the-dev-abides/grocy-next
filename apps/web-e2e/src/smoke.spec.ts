import { expect, test } from '@playwright/test';

test('the placeholder page opens in the browser', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Grocy Next' }),
  ).toBeVisible();
});
