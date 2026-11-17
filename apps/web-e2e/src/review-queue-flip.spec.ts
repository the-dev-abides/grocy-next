import { expect, test } from '@playwright/test';

import {
  createRow,
  type PendingScanRow,
  queueRows,
  removeRows,
  storedRow,
} from './pending-scans.js';

// The test of the flip of a row between Consume and Transfer in the review
// queue. The test creates its own rows through the API with a note of its own,
// as the other review queue tests do.

// A tap on the icon flips a Consume row to a Transfer with one update call.
// The row keeps its fields. The icon of a Purchase row is no button.
test('a tap on the icon of a Consume row flips it to a Transfer, and the icon of a Purchase row does nothing', async ({
  page,
  request,
}) => {
  const note = 'review-queue-flip';
  const hasNote = (row: PendingScanRow) => row.note?.startsWith(note) === true;
  await removeRows(request, hasNote);
  const created = await createRow(request, {
    amount: 2,
    bookingType: 'consume',
    locationId: 1,
    note: `${note} consume`,
    productId: 1,
    toLocationId: 2,
  });
  await createRow(request, {
    bookingType: 'purchase',
    note: `${note} purchase`,
    productId: 2,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: `${note} consume` });
  const purchaseRow = queueRows(page).filter({ hasText: `${note} purchase` });
  await expect(
    purchaseRow.getByRole('img', { name: 'Purchase' }),
  ).toBeVisible();
  await expect(
    purchaseRow.getByRole('button', { name: /^Purchase/ }),
  ).toHaveCount(0);

  await row
    .getByRole('button', { name: 'Consume. Change to Transfer.' })
    .click();

  await expect(
    row.getByRole('button', { name: 'Transfer. Change to Consume.' }),
  ).toBeVisible();
  await expect(row).toContainText('Fridge → Pantry');
  expect(await storedRow(request, created.id)).toMatchObject({
    amount: 2,
    bookingType: 'transfer',
    locationId: 1,
    toLocationId: 2,
  });

  await removeRows(request, hasNote);
});
