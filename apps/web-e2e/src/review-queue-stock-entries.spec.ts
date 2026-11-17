import { expect, test } from '@playwright/test';

import {
  createRow,
  pickOption,
  queueRows,
  removeRows,
  storedRow,
} from './pending-scans.js';

// The tests of the stock entry lines of the review queue. Each test creates
// its own rows through the API with a note of its own.

// Product 6 has 3 sealed packs in one stock entry at the Fridge, due 25 Nov.
// No other test makes a Consume or a Transfer of product 6. The older row
// takes 1 pack and opens the rest. The newer row sees the 2 opened packs
// after the older row, and its 3 packs are more than the stock. The stock
// entry select of the row form picks the stock entry.
test('the stock entry lines of two Consume rows of one product chain, and the newer row shows the warning above the stock', async ({
  page,
  request,
}) => {
  const note = 'review-queue-stock-entry-lines';
  await removeRows(request, (row) => {
    return (
      row.productId === 6 &&
      (row.bookingType === 'consume' || row.bookingType === 'transfer')
    );
  });
  await createRow(request, {
    amount: 1,
    bookingType: 'consume',
    locationId: 1,
    note: `${note}-older`,
    productId: 6,
  });
  const newer = await createRow(request, {
    amount: 3,
    bookingType: 'consume',
    locationId: 1,
    note: `${note}-newer`,
    productId: 6,
  });
  await page.goto('/review-queue');

  const older = queueRows(page).filter({ hasText: `${note}-older` });
  await expect(older.getByRole('list', { name: 'Stock entries' })).toHaveText(
    /^1 Pack from a new pack in Fridge, due (25 Nov|Nov 25)\. Opens the rest\.$/,
  );
  const newerRow = queueRows(page).filter({ hasText: `${note}-newer` });
  const lines = newerRow.getByRole('list', { name: 'Stock entries' });
  await expect(lines.getByRole('listitem')).toHaveText([
    /^2 Pack from the opened pack in Fridge, due (25 Nov|Nov 25)$/,
    'Grocy has only 2 Pack for this Consume. The accept fails.',
  ]);
  await expect(newerRow).toContainText('Ready');

  await newerRow.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Yoghurt Strawberry 150 g',
  });
  await pickOption(
    dialog,
    'Stock entry',
    'Amount: 3; Due on 2026-11-25; Bought on 2026-11-08; Not opened',
  );
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  expect(await storedRow(request, newer.id)).toMatchObject({
    stockEntryId: '69131a2b3cd91',
  });
  await removeRows(request, (row) => row.note?.startsWith(note) === true);
});
