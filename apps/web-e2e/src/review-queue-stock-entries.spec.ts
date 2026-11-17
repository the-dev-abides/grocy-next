import type { APIRequestContext } from '@playwright/test';

import { expect, test } from './fixtures.js';
import {
  createRow,
  pickOption,
  queueRows,
  removeRows,
  sessionRows,
  storedRow,
  typeCode,
} from './pending-scans.js';

// The tests of the stock entry lines. The review queue tests create their own
// rows through the API with a note of their own.
//
// The stock entry lines of a row chain with every Consume row and Transfer row
// in the queue that shares a stock entry with it. Product 5, Yoghurt, is a
// parent product with no own stock. Its sub-product, product 6, has 3 sealed
// packs at the Fridge, due 25 Nov, in stock entry 69131a2b3cd91. Thus a Consume
// of product 5 and a Consume of product 6 share that stock entry.
//
// Only the tests of the block below make Consume rows or Transfer rows of
// product 5 or product 6. The tests of the block never run at the same
// time. The file lock stops the other browsers. The block runs its tests one
// after the other in one worker. Each test first removes the Consume rows and
// the Transfer rows of both products.

const DUE = '(25 Nov|Nov 25)';

function isOfYoghurt(row: { bookingType: string; productId: null | number }) {
  return (
    (row.productId === 5 || row.productId === 6) &&
    (row.bookingType === 'consume' || row.bookingType === 'transfer')
  );
}

function removeYoghurtRows(request: APIRequestContext): Promise<void> {
  return removeRows(request, isOfYoghurt);
}

test.describe('the Consume rows of product 5 and product 6', () => {
  test.describe.configure({ mode: 'default' });

  // The older row takes a part of the sealed pack and opens the rest. The newer
  // row sees the opened rest after the older row, and its amount is the whole
  // stock, more than the rest. The stock entry select of the row form picks the
  // stock entry.
  test('the stock entry lines of two Consume rows of one product chain, and the newer row shows the warning above the stock', async ({
    page,
    request,
  }, testInfo) => {
    const note = `review-queue-stock-entry-lines-${testInfo.project.name}`;
    await removeYoghurtRows(request);
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
      new RegExp(
        String.raw`^1 Pack from a new pack in Fridge, due ${DUE}\. Opens the rest\.$`,
      ),
    );
    const newerRow = queueRows(page).filter({ hasText: `${note}-newer` });
    const lines = newerRow.getByRole('list', { name: 'Stock entries' });
    await expect(lines.getByRole('listitem')).toHaveText([
      new RegExp(`^2 Pack from the opened pack in Fridge, due ${DUE}$`),
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
    await removeYoghurtRows(request);
  });

  // A Consume of the parent takes the stock of the child, as the accept
  // does. Thus the row shows the pack of the child and the warning above that
  // stock.
  test('the stock entry lines of a Consume of a parent product show the stock of its sub-product and the warning above it', async ({
    page,
    request,
  }, testInfo) => {
    const note = `review-queue-stock-entry-parent-${testInfo.project.name}`;
    await removeYoghurtRows(request);
    await createRow(request, {
      amount: 4,
      bookingType: 'consume',
      locationId: 1,
      note,
      productId: 5,
    });
    await page.goto('/review-queue');

    const row = queueRows(page).filter({ hasText: note });
    const lines = row.getByRole('list', { name: 'Stock entries' });
    await expect(lines.getByRole('listitem')).toHaveText([
      new RegExp(`^3 Pack, all of a sealed pack in Fridge, due ${DUE}$`),
      'Grocy has only 3 Pack for this Consume. The accept fails.',
    ]);
    await removeYoghurtRows(request);
  });

  // The older Consume of the parent takes 1 pack of the child and opens the
  // rest. The newer Consume of the child sees the opened rest, so the queue
  // does not show the pack two times.
  test('the stock entry lines of a Consume of a sub-product see the stock after an older Consume of its parent product', async ({
    page,
    request,
  }, testInfo) => {
    const note = `review-queue-stock-entry-shared-${testInfo.project.name}`;
    await removeYoghurtRows(request);
    await createRow(request, {
      amount: 1,
      bookingType: 'consume',
      locationId: 1,
      note: `${note}-parent`,
      productId: 5,
    });
    await createRow(request, {
      amount: 3,
      bookingType: 'consume',
      locationId: 1,
      note: `${note}-child`,
      productId: 6,
    });
    await page.goto('/review-queue');

    const child = queueRows(page).filter({ hasText: `${note}-child` });
    const lines = child.getByRole('list', { name: 'Stock entries' });
    await expect(lines.getByRole('listitem')).toHaveText([
      new RegExp(`^2 Pack from the opened pack in Fridge, due ${DUE}$`),
      'Grocy has only 2 Pack for this Consume. The accept fails.',
    ]);
    await removeYoghurtRows(request);
  });

  // The Grocycode grcy:p:5 is product 5. A Consume of 1 of the parent on the
  // scan screen takes a part of the pack of the child, as the accept does. Thus
  // the accept opens the rest.
  test('a Consume row of a parent product on the scan screen says "Opens a new pack" from the stock of its sub-product', async ({
    page,
    request,
  }) => {
    await removeYoghurtRows(request);
    await page.goto('/scan/consume-transfer');
    await typeCode(page, 'grcy:p:5');

    const rows = sessionRows(page);
    await expect(rows).toHaveCount(1, { timeout: 3000 });
    const row = rows.first();
    await expect(row).toContainText('Yoghurt');
    await expect(row).toContainText('Consume from Fridge');
    await expect(row).toContainText('Opens a new pack');
    await removeYoghurtRows(request);
  });

  // The stock entry Grocycode of stock entry 69131a2b3cd91 names its 3 packs.
  // A Consume of it takes the whole stock entry. The repeat scan merges and
  // adds 3 packs again, so the pill of the banner shows "+3", not "+1".
  test('the pill of a repeat scan of a stock entry Grocycode shows the amount that the merge added', async ({
    page,
    request,
  }) => {
    const code = 'grcy:p:6:69131a2b3cd91';
    await removeYoghurtRows(request);
    await page.goto('/scan/consume-transfer');
    await typeCode(page, code);
    const rows = sessionRows(page);
    await expect(rows).toHaveCount(1, { timeout: 3000 });
    await expect(rows.first()).toContainText('3 Pack');

    await typeCode(page, code);

    const banner = page.getByRole('status');
    await expect(banner).toContainText('Consume · 6 Pack');
    await expect(banner).toContainText('+3');
    await expect(rows).toHaveCount(1);
    await removeYoghurtRows(request);
  });
});

// An accept changes the stock, so the review queue loads the product read of
// the booked product again. The stock entry lines of the other rows of the
// product and the Inventory preview then use the new stock. The Grocy mock
// answers the consume of product 1 and keeps its stock.
test('an accept loads the product read of the booked product again', async ({
  page,
  request,
}, testInfo) => {
  const note = `review-queue-stock-entry-refresh-${testInfo.project.name}`;
  await removeRows(request, (row) => row.note?.startsWith(note) === true);
  for (const name of ['accepted', 'kept']) {
    await createRow(request, {
      amount: 1,
      bookingType: 'consume',
      locationId: 1,
      note: `${note}-${name}`,
      productId: 1,
    });
  }
  await page.goto('/review-queue');
  const kept = queueRows(page).filter({ hasText: `${note}-kept` });
  await expect(kept.getByRole('list', { name: 'Stock entries' })).toBeVisible();

  const productRead = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/v2/products/1'
    );
  });
  const accepted = queueRows(page).filter({ hasText: `${note}-accepted` });
  await accepted.getByRole('button', { name: 'Accept' }).click();

  await expect(accepted).toHaveCount(0);
  await productRead;
  await removeRows(request, (row) => row.note?.startsWith(note) === true);
});
