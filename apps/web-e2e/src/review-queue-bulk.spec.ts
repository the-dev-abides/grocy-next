import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';

// The tests of the filter, the bulk actions, and the full form of one row of the review queue.
// The API keeps its rows for the whole run, and every test of every file runs in parallel against one API.
// Each test creates its own rows through the API with a note of its own and removes them at the end.
// Accept all and Reject all act on every row that the filter shows.
// Thus each of the two tests filters on a location and a product group that only its own rows have.
// No other file sets a product group on a row.
// No other test of this file uses the Freezer with a product group.
// The bulk edit acts on the checked rows only.
// The codes of this file are produce codes that no other file types.

const PENDING_SCANS = '/api/v2/pending-scans';

// The fixture household of the Grocy mock.
const PANTRY = 2;
const FREEZER = 3;
const GARAGE = 4;
const DAIRY = 1;
const SNACKS = 2;

// The Grocy mock answers a purchase with a fixed stock log row. The row has the
// location 1 Fridge and the due date 2027-01-01. It has the amount and the
// price of the request.
const MOCK_DUE_DATE = '2027-01-01';

interface PendingScanRow {
  amount: null | number;
  dueDate: null | string;
  id: number;
  locationId: null | number;
  note: null | string;
  price: null | number;
  priceType: 'total' | 'unit';
  productGroupId: null | number;
  productId: null | number;
  quantityUnitId: null | number;
  storeId: null | number;
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

async function createRow(
  request: APIRequestContext,
  body: Record<string, unknown>,
): Promise<PendingScanRow> {
  const response = await request.post(PENDING_SCANS, { data: body });
  expect(response.status()).toBe(201);
  return (await response.json()) as PendingScanRow;
}

async function storedRow(
  request: APIRequestContext,
  id: number,
): Promise<PendingScanRow | undefined> {
  const rows = await listRows(request);
  return rows.find((row) => row.id === id);
}

function queueRows(page: Page): Locator {
  return page.getByRole('table', { name: 'Pending scans' }).locator('tbody tr');
}

async function pickOption(
  scope: Locator | Page,
  label: string,
  option: string,
) {
  await scope.getByLabel(label, { exact: true }).click();
  const page = 'page' in scope ? scope.page() : scope;
  await page.getByRole('option', { name: option, exact: true }).click();
}

test('the filter by location, product group, and each of the four states narrows the table', async ({
  page,
  request,
}) => {
  const note = 'bulk-filter';
  await removeRows(request, note);
  // Four rows. The first is a ready Purchase row in the Pantry. The second is
  // an Inventory row with no count in the Fridge. The third is a row with no
  // product in the Pantry. The fourth is a row in the inactive Garage that the
  // Grocy mock refuses at accept.
  await createRow(request, {
    bookingType: 'purchase',
    locationId: PANTRY,
    note,
    productGroupId: SNACKS,
    productId: 5,
  });
  await createRow(request, {
    bookingType: 'inventory',
    locationId: 1,
    note,
    productGroupId: SNACKS,
    productId: 6,
  });
  await createRow(request, {
    bookingType: 'purchase',
    code: '4021',
    locationId: PANTRY,
    note,
    productGroupId: DAIRY,
  });
  await createRow(request, {
    bookingType: 'purchase',
    locationId: GARAGE,
    note,
    productGroupId: SNACKS,
    productId: 3,
  });
  await page.goto('/review-queue');
  const rows = queueRows(page).filter({ hasText: note });
  await expect(rows).toHaveCount(4);
  const failed = rows.filter({ hasText: 'Nutella Biscuits 304 g' });
  await failed.getByRole('button', { name: 'Accept' }).click();
  await expect(failed).toContainText('Accept failed');

  await pickOption(page, 'Location', 'Pantry');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'Yoghurt' })).toHaveCount(1);
  await expect(rows.filter({ hasText: '4021' })).toHaveCount(1);

  await pickOption(page, 'Location', 'All locations');
  await pickOption(page, 'Product group', 'Dairy');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('4021');

  await pickOption(page, 'Product group', 'All product groups');
  for (const { name, state } of [
    { name: '4021', state: 'Needs a product' },
    { name: 'Yoghurt Strawberry 150 g', state: 'Needs a count' },
    { name: 'Nutella Biscuits 304 g', state: 'Accept failed' },
    { name: 'Yoghurt', state: 'Ready' },
  ]) {
    await pickOption(page, 'State', state);
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText(name);
  }

  await removeRows(request, note);
});

test('Accept all on a filtered table books the ready rows, skips the others, and shows one line per row with the skipped count', async ({
  page,
  request,
}) => {
  const note = 'bulk-accept';
  await removeRows(request, note);
  // A ready Purchase row, a row with no product, and an Inventory row with
  // no count, all in the Freezer and in the group Snacks.
  const facts = { locationId: FREEZER, note, productGroupId: SNACKS };
  const ready = await createRow(request, {
    ...facts,
    amount: 2,
    bookingType: 'purchase',
    productId: 5,
    quantityUnitId: 2,
  });
  const noProduct = await createRow(request, {
    ...facts,
    bookingType: 'purchase',
    code: '4022',
  });
  const noCount = await createRow(request, {
    ...facts,
    bookingType: 'inventory',
    productId: 6,
  });
  await page.goto('/review-queue');
  await pickOption(page, 'Location', 'Freezer');
  await pickOption(page, 'Product group', 'Snacks');
  const rows = queueRows(page);
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: note })).toHaveCount(3);

  await page.getByRole('button', { name: 'Accept all' }).click();

  const dialog = page.getByRole('dialog', { name: 'Accept all' });
  await expect(dialog).toContainText(
    'One booking per row, 1 row. 2 rows have no product or no count and are skipped.',
  );
  await dialog.getByRole('button', { name: 'Accept 1' }).click();

  const result = page.getByRole('status');
  await expect(result).toContainText('1 booked, 2 skipped');
  await expect(result.getByRole('listitem')).toHaveCount(3);
  await expect(result).toContainText(
    `Yoghurt: Booked 2 Pack at Fridge, due ${MOCK_DUE_DATE}, no price, purchase.`,
  );
  await expect(result).toContainText('4022: Skipped. The row has no product.');
  await expect(result).toContainText(
    'Yoghurt Strawberry 150 g: Skipped. The row has no count.',
  );
  await expect(rows).toHaveCount(2);
  expect(await storedRow(request, ready.id)).toBeUndefined();
  expect(await storedRow(request, noProduct.id)).toBeDefined();
  expect(await storedRow(request, noCount.id)).toBeDefined();

  await removeRows(request, note);
});

test('Reject all opens the confirm with the count and removes the shown rows', async ({
  page,
  request,
}) => {
  const note = 'bulk-reject';
  await removeRows(request, note);
  const facts = { locationId: FREEZER, note, productGroupId: DAIRY };
  await createRow(request, { ...facts, bookingType: 'purchase', code: '4023' });
  await createRow(request, { ...facts, bookingType: 'purchase', productId: 2 });
  await page.goto('/review-queue');
  await pickOption(page, 'Location', 'Freezer');
  await pickOption(page, 'Product group', 'Dairy');
  const rows = queueRows(page);
  await expect(rows.filter({ hasText: note })).toHaveCount(2);
  await expect(rows).toHaveCount(2);

  await page.getByRole('button', { name: 'Reject all' }).click();

  const dialog = page.getByRole('dialog', { name: 'Reject all' });
  await expect(dialog).toContainText(
    '2 pending scans are deleted. The queue keeps no history.',
  );
  await dialog.getByRole('button', { name: 'Reject 2' }).click();

  await expect(rows.filter({ hasText: note })).toHaveCount(0);
  const stored = await listRows(request);
  expect(stored.filter((row) => row.note === note)).toEqual([]);
});

test('the bulk edit sets one field on the checked rows and changes nothing else on them', async ({
  page,
  request,
}) => {
  const note = 'bulk-edit';
  await removeRows(request, note);
  const first = await createRow(request, {
    amount: 2,
    bookingType: 'purchase',
    dueDate: '2027-05-01',
    note,
    price: 1.5,
    priceType: 'total',
    productId: 5,
    quantityUnitId: 2,
    storeId: 1,
  });
  const second = await createRow(request, {
    bookingType: 'purchase',
    code: '4024',
    note,
  });
  const unchecked = await createRow(request, {
    bookingType: 'inventory',
    note,
    productId: 7,
  });
  await page.goto('/review-queue');
  const rows = queueRows(page).filter({ hasText: note });
  await expect(rows).toHaveCount(3);
  await rows.filter({ hasText: 'Yoghurt' }).getByRole('checkbox').check();
  await rows.filter({ hasText: '4024' }).getByRole('checkbox').check();

  await page.getByRole('button', { name: 'Bulk edit' }).click();

  const dialog = page.getByRole('dialog', { name: 'Edit 2 pending scans' });
  await expect(dialog.getByRole('button', { name: 'Apply' })).toBeDisabled();
  await pickOption(dialog, 'Location', 'Pantry');
  await expect(dialog).toContainText('1 field changes on 2 rows.');
  await dialog.getByRole('button', { name: 'Apply' }).click();

  await expect(dialog).toBeHidden();
  await expect
    .poll(async () => {
      const row = await storedRow(request, first.id);
      return row?.locationId;
    })
    .toBe(PANTRY);
  expect(await storedRow(request, first.id)).toEqual({
    ...first,
    locationId: PANTRY,
    updatedAt: expect.any(String),
  });
  expect(await storedRow(request, second.id)).toEqual({
    ...second,
    locationId: PANTRY,
    updatedAt: expect.any(String),
  });
  expect(await storedRow(request, unchecked.id)).toEqual(unchecked);

  await removeRows(request, note);
});

test('the full form of one row saves every field', async ({
  page,
  request,
}) => {
  const note = 'bulk-full-form';
  const savedNote = 'bulk-full-form saved';
  await removeRows(request, note);
  await removeRows(request, savedNote);
  const created = await createRow(request, {
    bookingType: 'purchase',
    code: '4025',
    note,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await row.getByRole('button', { name: 'Edit' }).click();

  const dialog = page.getByRole('dialog', { name: '4025' });
  await dialog.getByRole('spinbutton', { name: 'Amount' }).fill('3');
  await pickOption(dialog, 'Unit', 'Pack');
  await pickOption(dialog, 'Location', 'Fridge');
  await dialog.getByLabel('Due date', { exact: true }).fill('2027-04-01');
  await pickOption(dialog, 'Store', 'Supermarket');
  await dialog.getByRole('textbox', { name: 'Price' }).fill('2.5');
  await pickOption(dialog, 'Price type', 'in total');
  await pickOption(dialog, 'Product group of the new product', 'Dairy');
  await dialog.getByRole('textbox', { name: 'Note' }).fill(savedNote);
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden();
  await expect(queueRows(page).filter({ hasText: savedNote })).toBeVisible();
  expect(await storedRow(request, created.id)).toMatchObject({
    amount: 3,
    dueDate: '2027-04-01',
    locationId: 1,
    note: savedNote,
    price: 2.5,
    priceType: 'total',
    productGroupId: DAIRY,
    quantityUnitId: 2,
    storeId: 1,
  });

  await removeRows(request, savedNote);
});

test('Change the product on the full form opens the product pick dialog, and the pick sets the product', async ({
  page,
  request,
}) => {
  const note = 'bulk-change-product';
  await removeRows(request, note);
  const created = await createRow(request, {
    bookingType: 'purchase',
    note,
    productId: 3,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row).toContainText('Nutella Biscuits 304 g');
  await row.getByRole('button', { name: 'Edit' }).click();
  const form = page.getByRole('dialog', { name: 'Nutella Biscuits 304 g' });

  await form.getByRole('button', { name: 'Change the product' }).click();

  const pick = page.getByRole('dialog', { name: 'Pick the product' });
  await expect(pick).toBeVisible();
  await expect(form).toBeHidden();
  await pick
    .getByRole('textbox', { name: 'Search the products' })
    .fill('phila');
  await pick
    .getByRole('list', { name: 'Products' })
    .getByRole('button')
    .click();

  await expect(pick).toBeHidden();
  await expect(row).toContainText('Philadelphia Original 150 g');
  expect(await storedRow(request, created.id)).toMatchObject({
    productId: 2,
  });

  await removeRows(request, note);
});
