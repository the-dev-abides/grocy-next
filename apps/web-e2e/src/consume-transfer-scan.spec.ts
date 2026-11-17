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

// The code 0049000006346 belongs to no other Consume or Transfer test. The
// Inventory tests use it too, so the test ignores the Inventory rows. A tap on
// the icon of the row sends one update that flips the booking type.
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
    stored
      .filter((item) => item.code === code && item.bookingType !== 'inventory')
      .map((item) => item.bookingType),
  ).toEqual(['consume']);
});

// The Grocycode grcy:p:3 is product 3, with its stock in the Pantry. The trash
// can sets the spoiled flag of the row.
test('a tap on the trash can of a Consume row makes the trash can red and the detail line says Spoiled', async ({
  page,
  request,
}) => {
  const code = 'grcy:p:3';
  await removeRows(
    request,
    (row) => row.bookingType === 'consume' && row.code === code,
  );
  await page.goto('/scan/consume-transfer');
  await typeCode(page, code);
  const rows = sessionRows(page);
  await expect(rows).toHaveCount(1, { timeout: 3000 });
  const row = rows.first();
  const trashCan = row.getByRole('button', { name: 'Spoiled' });
  await expect(trashCan).toHaveAttribute('aria-pressed', 'false');

  await trashCan.click();

  await expect(trashCan).toHaveAttribute('aria-pressed', 'true');
  await expect(trashCan).toHaveClass(/text-destructive/);
  await expect(row).toContainText('Consume from Pantry · Spoiled');
  const stored = await listRows(request);
  expect(stored.filter((item) => item.code === code)).toMatchObject([
    { bookingType: 'consume', spoiled: true },
  ]);
});

// The Grocycode grcy:p:1 is product 1, with its stock at the Fridge. A tap on
// the name opens the row form. The plus button and the typed amount change
// the amount, the "To" select sets the "to" location, and Reject removes the
// row.
test('the row form of a Transfer row takes a typed amount and the "to" location, and its Reject removes the row', async ({
  page,
  request,
}) => {
  const code = 'grcy:p:1';
  await removeRows(
    request,
    (row) => row.bookingType === 'transfer' && row.code === code,
  );
  await page.goto('/scan/consume-transfer');
  await page.getByRole('radio', { name: 'Transfer' }).click();
  await typeCode(page, code);
  const rows = sessionRows(page);
  await expect(rows).toHaveCount(1, { timeout: 3000 });
  const row = rows.first();
  await expect(row).toContainText('Transfer Fridge → No "to" location');
  await expect(row.getByRole('button', { name: 'Spoiled' })).toHaveCount(0);

  await row.getByRole('button', { name: 'More' }).click();
  await expect(row).toContainText('2 Can');
  await row.getByRole('button', { name: 'Coca-Cola Original 330 ml' }).click();
  const amount = row.getByRole('textbox', { name: 'Amount' });
  await amount.fill('0.5');
  await amount.press('Enter');
  await expect(row).toContainText('0.5 Can');
  await pickOption(row, 'To', 'Freezer');
  await expect(row).toContainText('Transfer Fridge → Freezer');
  const stored = await listRows(request);
  expect(stored.filter((item) => item.code === code)).toMatchObject([
    { amount: 0.5, bookingType: 'transfer', toLocationId: 3 },
  ]);

  await row.getByRole('button', { name: 'Reject' }).click();

  await expect(page.getByText('0 scans in the review queue')).toBeVisible();
  const left = await listRows(request);
  expect(left.filter((item) => item.code === code)).toEqual([]);
});
