import { expect, test } from '@playwright/test';
import {
  createRow,
  pickOption,
  queueRows,
  removeRowsWithNote,
  storedRow,
} from './pending-scans.js';

// The tests of the booking type filter and of the bulk edit of a Consume row and a Transfer row.
// Each test creates its own rows through the API with a note of its own and removes them at the end.
// Each test finds its rows by its note, so the rows of other tests do not change the counts.

// The fixture household of the Grocy mock.
const FRIDGE = 1;
const PANTRY = 2;
const FREEZER = 3;

test('the booking type filter shows the Consume row or the Transfer row, and the location filter shows the Transfer by its "to" location', async ({
  page,
  request,
}) => {
  const note = 'booking-types-type-filter';
  await removeRowsWithNote(request, note);
  await createRow(request, {
    bookingType: 'consume',
    locationId: FRIDGE,
    note,
    productId: 1,
  });
  await createRow(request, {
    bookingType: 'transfer',
    locationId: FRIDGE,
    note,
    productId: 2,
    toLocationId: FREEZER,
  });
  await page.goto('/review-queue');
  const rows = queueRows(page).filter({ hasText: note });
  await expect(rows).toHaveCount(2);

  await pickOption(page, 'Booking type', 'Consume');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Coca-Cola Original 330 ml');

  await pickOption(page, 'Booking type', 'Transfer');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Philadelphia Original 150 g');

  await pickOption(page, 'Booking type', 'All booking types');
  await pickOption(page, 'Location', 'Freezer');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Philadelphia Original 150 g');

  await removeRowsWithNote(request, note);
});

test('the bulk edit of a Consume row and a Transfer row names the count of rows of the "to" location, and sets it on the Transfer only', async ({
  page,
  request,
}) => {
  const note = 'booking-types-mixed-edit';
  await removeRowsWithNote(request, note);
  const consume = await createRow(request, {
    bookingType: 'consume',
    locationId: FRIDGE,
    note,
    productId: 1,
  });
  const transfer = await createRow(request, {
    bookingType: 'transfer',
    locationId: FRIDGE,
    note,
    productId: 2,
  });
  await page.goto('/review-queue');
  const rows = queueRows(page).filter({ hasText: note });
  await expect(rows).toHaveCount(2);
  const checkboxes = await rows.getByRole('checkbox').all();
  for (const checkbox of checkboxes) {
    await checkbox.check();
  }

  await page.getByRole('button', { name: 'Bulk edit' }).click();

  const dialog = page.getByRole('dialog', { name: 'Edit 2 pending scans' });
  await expect(
    dialog.getByLabel('Booking type', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel('Spoiled (1 of 2 rows)')).toBeVisible();
  await expect(dialog.getByLabel('Store', { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('Due date', { exact: true })).toHaveCount(0);
  await pickOption(dialog, 'To (1 of 2 rows)', 'Pantry');
  await expect(dialog).toContainText('1 field changes on 2 rows.');
  await dialog.getByRole('button', { name: 'Apply' }).click();

  await expect(dialog).toBeHidden();
  await expect
    .poll(async () => {
      const row = await storedRow(request, transfer.id);
      return row?.toLocationId;
    })
    .toBe(PANTRY);
  expect(await storedRow(request, consume.id)).toEqual(consume);

  await removeRowsWithNote(request, note);
});
