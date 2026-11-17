import { expect, test } from './fixtures.js';

test('the web app opens in the browser on the review queue page', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Review queue' }),
  ).toBeVisible();
  await expect(page.getByRole('banner')).toContainText('Grocy Next');
});
