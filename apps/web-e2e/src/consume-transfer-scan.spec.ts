import { expect, test } from '@playwright/test';

import { removeRows, sessionRows, typeCode } from './pending-scans.js';

// The tests of the Consume and Transfer scan screen. In this version every
// scan is a Consume. The test removes the Consume rows of its code first, so a
// repeat scan from an earlier run does not merge into the new row.

test('a typed code on the Consume and Transfer scan screen shows one Consume row with the fork and knife icon', async ({
  page,
  request,
}) => {
  const code = '5449000000996';
  await removeRows(
    request,
    (row) => row.bookingType === 'consume' && row.code === code,
  );
  await page.goto('/review-queue');
  await page
    .getByRole('banner')
    .getByRole('link', { name: 'Consume and Transfer' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Consume and Transfer' }),
  ).toBeVisible();

  await typeCode(page, code);

  const rows = sessionRows(page);
  await expect(rows).toHaveCount(1, { timeout: 3000 });
  const row = rows.first();
  await expect(row).toContainText('Coca-Cola Original 330 ml');
  await expect(row.getByRole('img', { name: 'Consume' })).toBeVisible();
  await expect(row).toContainText('Consume from Fridge');
});
