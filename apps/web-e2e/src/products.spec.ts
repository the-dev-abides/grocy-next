import { expect, test } from '@playwright/test';

// The product list page reads the `items` envelope of the Next API through
// the generated API slice. The Grocy mock holds the three fixture products.
test('the product list page shows the fixture products of the Grocy mock', async ({
  page,
}) => {
  await page.goto('/stock');

  await expect(page.getByText('3 products')).toBeVisible();
  await expect(page.getByText('Coca-Cola Original 330 ml')).toBeVisible();
  await expect(page.getByText('Philadelphia Original 150 g')).toBeVisible();
  await expect(page.getByText('Nutella Biscuits 304 g')).toBeVisible();
});
