import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';

// The tests of the Inventory rows of the review queue.
// They cover the count field with the Grocy stock as the placeholder, the difference, and what the accept does.
// They cover the notes of a parent product and a tare weight product.
// They cover the accept with no change, an increase, and a decrease.
// The API keeps its rows for the whole run, and every test of every file runs in parallel against one API.
// The rows of this file are Inventory rows with a product and no code.
// Thus no scan merges into them, and no other file removes them.
// Each test owns one product and finds its row by a note of its own.

const PENDING_SCANS = '/api/v2/pending-scans';

interface PendingScanRow {
  id: number;
  note: null | string;
}

async function listRows(request: APIRequestContext): Promise<PendingScanRow[]> {
  const response = await request.get(PENDING_SCANS);
  const { items } = (await response.json()) as { items: PendingScanRow[] };
  return items;
}

async function removeRows(
  request: APIRequestContext,
  note: string,
): Promise<void> {
  const rows = await listRows(request);
  for (const row of rows) {
    if (row.note === note) {
      await request.delete(`${PENDING_SCANS}/${String(row.id)}`);
    }
  }
}

// An Inventory row of the product with no count, and the review queue with
// that row.
async function openInventoryRow(
  page: Page,
  request: APIRequestContext,
  productId: number,
  note: string,
): Promise<Locator> {
  await removeRows(request, note);
  const response = await request.post(PENDING_SCANS, {
    data: { bookingType: 'inventory', note, productId },
  });
  expect(response.status()).toBe(201);
  await page.goto('/review-queue');
  const row = page
    .getByRole('table', { name: 'Pending scans' })
    .locator('tbody tr')
    .filter({ hasText: note });
  await expect(row).toBeVisible();
  return row;
}

async function setCount(row: Locator, unit: string, count: string) {
  const field = row.getByRole('spinbutton', { name: `Count in ${unit}` });
  await field.fill(count);
  await field.press('Enter');
}

async function expectGone(
  request: APIRequestContext,
  row: Locator,
  note: string,
) {
  await expect(row).toHaveCount(0);
  const stored = await listRows(request);
  expect(stored.filter((item) => item.note === note)).toEqual([]);
}

test('an Inventory row shows the Grocy stock as the placeholder and no accept until the count is set, and a count equal to the stock leaves with no change', async ({
  page,
  request,
}) => {
  const note = 'inventory-accept-no-change';
  // Product 6 has the stock 3 in the unit Pack.
  const row = await openInventoryRow(page, request, 6, note);
  const field = row.getByRole('spinbutton', { name: 'Count in Pack' });
  await expect(field).toHaveAttribute('placeholder', '3');
  await expect(field).toHaveValue('');
  await expect(row).toContainText('In Grocy: 3 Pack');
  await expect(row).toContainText('Needs a count');
  await expect(row.getByRole('button', { name: 'Accept' })).toHaveCount(0);

  await setCount(row, 'Pack', '3');

  await expect(row).toContainText('no change');
  await expect(row).toContainText('Ready');
  await row.getByRole('button', { name: 'Accept' }).click();

  // The Grocy mock refuses an inventory with the new amount equal to the
  // stock. Thus the result line shows that the API did not call Grocy.
  await expectGone(request, row, note);
  const result = page.getByRole('status');
  await expect(result).toContainText('1 booked');
  await expect(result).toContainText(
    'Yoghurt Strawberry 150 g: No change. Grocy was not called.',
  );
});

test('an increase shows the difference and the new stock entry, and the accept shows the booking facts', async ({
  page,
  request,
}) => {
  const note = 'inventory-accept-increase';
  // Product 3 has the stock 1 in the unit Pack and the default location
  // Pantry.
  const row = await openInventoryRow(page, request, 3, note);

  await setCount(row, 'Pack', '4');

  await expect(row).toContainText('+3 Pack');
  await expect(row).toContainText(
    'Adds one stock entry of 3 Pack at Pantry, due the product default.',
  );
  await row.getByRole('button', { name: 'Accept' }).click();

  // The Grocy mock answers every inventory increase with the defaults of
  // product 3.
  await expectGone(request, row, note);
  await expect(page.getByRole('status')).toContainText(
    'Nutella Biscuits 304 g: Booked 3 Pack at Pantry, due 2027-01-01, price 3.99 per Pack, inventory-correction.',
  );
});

test('a decrease shows the stock entries that it takes from in the Grocy order, and the accept shows the booking facts', async ({
  page,
  request,
}) => {
  const note = 'inventory-accept-decrease';
  // Product 1 has the stock 6 in the unit Can in five stock entries. The
  // first two stock entries in the Grocy order hold 3 Can.
  const row = await openInventoryRow(page, request, 1, note);
  await expect(row).toContainText('In Grocy: 6 Can in 5 stock entries');

  await setCount(row, 'Can', '3');

  await expect(row).toContainText('-3 Can');
  await expect(row).toContainText(
    'Takes 2 Can from the entry due 2026-12-15 at Fridge, 1 Can from the entry due 2027-01-01 at Fridge.',
  );
  await row.getByRole('button', { name: 'Accept' }).click();

  await expectGone(request, row, note);
  await expect(page.getByRole('status')).toContainText(
    'Coca-Cola Original 330 ml: Booked -2 Can at Fridge, due 2026-12-15, price 0.85 per Can, inventory-correction. Booked -1 Can at Fridge, due 2027-01-01, price 0.85 per Can, inventory-correction.',
  );
});

test('a parent product row says that the count is own stock only', async ({
  page,
  request,
}) => {
  const note = 'inventory-accept-parent';
  // Product 5 is the parent of product 6 and has no own stock.
  const row = await openInventoryRow(page, request, 5, note);

  await expect(row).toContainText(
    'In Grocy: 0 Pack · parent product, own stock only',
  );

  await removeRows(request, note);
});

test('a tare weight product row says that the count is a gross weight, and the gross weight of the stock plus the tare weight is no change', async ({
  page,
  request,
}) => {
  const note = 'inventory-accept-tare-weight';
  // Product 7 has the own stock 500 Gram and the tare weight 250 Gram.
  const row = await openInventoryRow(page, request, 7, note);
  await expect(row).toContainText(
    'In Grocy: 500 Gram · tare weight 250 Gram, count the gross weight',
  );

  await setCount(row, 'Gram', '750');

  await expect(row).toContainText('no change');
  await row.getByRole('button', { name: 'Accept' }).click();

  // The Grocy mock refuses the new amount 750 for product 7, so the result
  // line shows that the API did not call Grocy.
  await expectGone(request, row, note);
  await expect(page.getByRole('status')).toContainText(
    'Rice jar: No change. Grocy was not called.',
  );
});
