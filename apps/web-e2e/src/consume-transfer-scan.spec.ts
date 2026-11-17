import { expect, test } from '@playwright/test';

import {
  listRows,
  pickOption,
  removeRows,
  sessionRows,
  typeCode,
} from './pending-scans.js';

// The tests of the Consume and Transfer scan screen. Each test removes the rows
// of its code and its booking type first, so a repeat scan from an earlier run
// does not merge into the new row.

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
  await expect(
    row.getByRole('button', { name: 'Consume. Change to Transfer.' }),
  ).toBeVisible();
  await expect(row).toContainText('Consume from Fridge');
});

// The code 7622300441937 is product 2, with its stock at its default location,
// the Fridge. The switch and the "to" location stay for the next scans.
test('the switch on Transfer with the Freezer makes a typed code one Transfer row from the Fridge to the Freezer', async ({
  page,
  request,
}) => {
  const code = '7622300441937';
  await removeRows(
    request,
    (row) => row.bookingType === 'transfer' && row.code === code,
  );
  await page.goto('/scan/consume-transfer');
  const strip = page.getByText(/^The next scan is a /);
  await expect(strip).toHaveText('The next scan is a Consume');

  await page.getByRole('radio', { name: 'Transfer' }).click();
  await pickOption(page, 'To', 'Freezer');

  await expect(strip).toHaveText('The next scan is a Transfer to Freezer');
  await typeCode(page, code);

  const rows = sessionRows(page);
  await expect(rows).toHaveCount(1, { timeout: 3000 });
  const row = rows.first();
  await expect(row).toContainText('Philadelphia Original 150 g');
  await expect(
    row.getByRole('button', { name: 'Transfer. Change to Consume.' }),
  ).toBeVisible();
  await expect(row).toContainText('Transfer Fridge → Freezer');
  await expect(page.getByRole('radio', { name: 'Transfer' })).toBeChecked();
});

// The code 0049000006346 belongs to no other Consume or Transfer test. A tap on
// the icon of the row sends one update that flips the booking type. The row
// keeps its other fields.
test('a tap on the icon of a Transfer row on the scan screen makes the row a Consume', async ({
  page,
  request,
}) => {
  const code = '0049000006346';
  await removeRows(request, (row) => {
    return (
      (row.bookingType === 'consume' || row.bookingType === 'transfer') &&
      row.code === code
    );
  });
  await page.goto('/scan/consume-transfer');
  await page.getByRole('radio', { name: 'Transfer' }).click();
  await typeCode(page, code);

  const rows = sessionRows(page);
  await expect(rows).toHaveCount(1, { timeout: 3000 });
  const row = rows.first();
  await row
    .getByRole('button', { name: 'Transfer. Change to Consume.' })
    .click();

  await expect(
    row.getByRole('button', { name: 'Consume. Change to Transfer.' }),
  ).toBeVisible();
  await expect(row).toContainText('Consume from');
  await expect(rows).toHaveCount(1);
  const stored = await listRows(request);
  expect(
    stored.filter((item) => item.code === code).map((item) => item.bookingType),
  ).toEqual(['consume']);
});
