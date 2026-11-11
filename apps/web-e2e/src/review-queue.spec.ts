import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';

// The tests of the review queue screen: the table of every pending scan of
// both booking types, the accept and the reject of a row, and the sidebar
// badge. The API keeps its rows for the whole run, and every test of every
// file runs in parallel against one API, so each test creates its own rows
// through the API with a note of its own, finds them by that note, and
// removes them at the end. The other spec files own the fixture codes, so
// the rows of this file carry a product and no code, a produce code that no
// other file types, or the third unknown code of the Open Food Facts mock.

const PENDING_SCANS = '/api/v2/pending-scans';

// The third unknown code of the Open Food Facts mock, Heinz Beanz 415 g. The
// record names the end-to-end mock as its image host, so the picture
// download of the update that sets the new product reaches the mock. The
// Grocy mock answers the product create with the id 4 and the product
// barcode create with the id 5.
const NEW_PRODUCT_CODE = '5000157024671';
const NEW_PRODUCT_ID = 4;
const NEW_PRODUCT_BARCODE_ID = 5;

// The Open Food Facts mock of the Playwright configuration. The lookup worker
// of the API names the source URL after it.
const OPEN_FACTS_MOCK_URL = 'http://localhost:18081';

// The lookup worker answers within a few seconds. The row shows the result
// at the next poll of the pending scan list.
const LOOKUP_TIMEOUT_MS = 15_000;

// The Grocy mock answers a purchase with a fixed stock log row: the location
// 1 Fridge, the due date 2027-01-01, and the amount and the price of the
// request.
const MOCK_DUE_DATE = '2027-01-01';

interface PendingScanRow {
  bookingType: 'inventory' | 'purchase';
  code: null | string;
  id: number;
  locationId: null | number;
  note: null | string;
  productBarcodeId: null | number;
  productId: null | number;
}

async function listRows(request: APIRequestContext): Promise<PendingScanRow[]> {
  const response = await request.get(PENDING_SCANS);
  const { items } = (await response.json()) as { items: PendingScanRow[] };
  return items;
}

async function removeRows(
  request: APIRequestContext,
  isMatch: (row: PendingScanRow) => boolean,
): Promise<void> {
  const rows = await listRows(request);
  for (const row of rows) {
    if (isMatch(row)) {
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

function queueRows(page: Page): Locator {
  return page.getByRole('table', { name: 'Pending scans' }).locator('tbody tr');
}

for (const path of ['/scan/purchase', '/scan/inventory']) {
  test(`Done on the scan screen ${path} opens the review queue`, async ({
    page,
  }) => {
    await page.goto(path);

    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page).toHaveURL('/review-queue');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Review queue' }),
    ).toBeVisible();
  });
}

test('the table shows the rows of both booking types, most recent at the top, and the sidebar badge shows their count', async ({
  page,
  request,
}) => {
  const note = 'review-queue-both-types';
  await removeRows(request, (row) => {
    return (
      row.note === note ||
      (row.bookingType === 'inventory' && row.productId === 7)
    );
  });
  // A Purchase row of product 6 first, then an Inventory row of product 7.
  const purchase = await createRow(request, {
    amount: 2,
    bookingType: 'purchase',
    note,
    productId: 6,
    quantityUnitId: 2,
  });
  const inventory = await createRow(request, {
    bookingType: 'inventory',
    note,
    productId: 7,
  });
  await page.goto('/review-queue');

  const rows = queueRows(page).filter({ hasText: note });
  await expect(rows).toHaveCount(2);
  const inventoryRow = rows.filter({ hasText: 'Rice jar' });
  const purchaseRow = rows.filter({ hasText: 'Yoghurt Strawberry 150 g' });
  await expect(rows.first()).toContainText('Rice jar');
  await expect(inventoryRow).toContainText('Inventory');
  await expect(inventoryRow).toContainText('— (500 Gram now)');
  await expect(inventoryRow).toContainText('Needs a count');
  await expect(
    inventoryRow.getByRole('button', { name: 'Accept' }),
  ).toHaveCount(0);
  await expect(purchaseRow).toContainText('Purchase');
  await expect(purchaseRow).toContainText('2 Pack');
  await expect(purchaseRow).toContainText('Ready');
  await expect(
    purchaseRow.getByRole('button', { name: 'Accept' }),
  ).toBeVisible();
  await expect(purchaseRow.locator('time')).toHaveText(/\d{1,2}:\d{2}/);
  await expect(
    page.getByText(
      'Contains data from Open Food Facts, available under the Open Database License.',
    ),
  ).toBeVisible();

  // The badge counts every pending scan. Other tests add and remove rows at
  // the same time, so the check retries until the badge and the API agree.
  const badge = page
    .getByRole('complementary', { name: 'Sidebar' })
    .getByTitle('Pending scans');
  await expect
    .poll(async () => {
      const rows = await listRows(request);
      const text = await badge.textContent();
      return text === String(rows.length);
    })
    .toBe(true);

  await removeRows(request, (row) =>
    [purchase.id, inventory.id].includes(row.id),
  );
});

test('an accept of a known Purchase row removes the row and shows the booking facts in the result line', async ({
  page,
  request,
}) => {
  const note = 'review-queue-accept';
  await removeRows(request, (row) => row.note === note);
  // Three packs of product 5 at 1.5 per pack. The pack is the stock unit of
  // the product, so the booking keeps the amount and the price.
  await createRow(request, {
    amount: 3,
    bookingType: 'purchase',
    note,
    price: 1.5,
    priceType: 'unit',
    productId: 5,
    quantityUnitId: 2,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Accept' }).click();

  await expect(row).toHaveCount(0);
  const result = page.getByRole('status');
  await expect(result).toContainText('1 booked');
  await expect(result).toContainText(
    `Yoghurt: Booked 3 Pack at Fridge, due ${MOCK_DUE_DATE}, price 1.5 per Pack, purchase.`,
  );
  const stored = await listRows(request);
  expect(stored.filter((item) => item.note === note)).toEqual([]);
});

test('a reject removes the row', async ({ page, request }) => {
  const note = 'review-queue-reject';
  await removeRows(request, (row) => row.note === note);
  // A produce code that no other file types. The row has no product.
  await createRow(request, { bookingType: 'purchase', code: '4017', note });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row).toBeVisible();
  await expect(row).toContainText('4017');
  await expect(row).toContainText('Needs a product');
  await expect(row.getByRole('button', { name: 'Accept' })).toHaveCount(0);

  await row.getByRole('button', { name: 'Reject' }).click();

  await expect(row).toHaveCount(0);
  const stored = await listRows(request);
  expect(stored.filter((item) => item.note === note)).toEqual([]);
});

test('a failed accept keeps the row with the red tint, the Grocy message, and Accept again', async ({
  page,
  request,
}) => {
  const note = 'review-queue-failed-accept';
  await removeRows(request, (row) => row.note === note);
  // The Grocy mock refuses a purchase into the inactive location 4 with no
  // due date, as Grocy does.
  const created = await createRow(request, {
    bookingType: 'purchase',
    locationId: 4,
    note,
    productId: 3,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row.getByRole('button', { name: 'Accept' })).toBeVisible();

  await row.getByRole('button', { name: 'Accept' }).click();

  await expect(row).toContainText('Location does not exist');
  await expect(row).toContainText('Accept failed');
  const acceptAgain = row.getByRole('button', { name: 'Accept again' });
  await expect(acceptAgain).toBeVisible();
  await expect(
    row.getByRole('button', { name: 'Accept', exact: true }),
  ).toHaveCount(0);
  // The expired row colour of ADR 0013, `#f5c6cb`, as the oklch token. The
  // mouse leaves the row first, so the hover colour does not apply.
  await page.mouse.move(0, 0);
  await expect(row).toHaveCSS('background-color', 'oklch(0.869 0.054 11.1)');

  await removeRows(request, (item) => item.id === created.id);
});

test('a row with no product shows Pick product and New product and no accept', async ({
  page,
  request,
}) => {
  const note = 'review-queue-needs-product';
  await removeRows(request, (row) => row.note === note);
  const created = await createRow(request, {
    bookingType: 'purchase',
    code: '4018',
    note,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });

  await expect(row).toContainText('Needs a product');
  await expect(row.getByRole('button', { name: 'Pick product' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'New product' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Accept' })).toHaveCount(0);

  await removeRows(request, (item) => item.id === created.id);
});

test('the product pick dialog finds a fixture product by a part of its name and sets it on the row', async ({
  page,
  request,
}) => {
  const note = 'review-queue-pick-product';
  await removeRows(request, (row) => row.note === note);
  const created = await createRow(request, {
    bookingType: 'purchase',
    code: '4019',
    note,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await row.getByRole('button', { name: 'Pick product' }).click();

  const dialog = page.getByRole('dialog', { name: 'Pick the product' });
  await expect(dialog).toContainText(
    'The code 4019 is added to the product that you pick.',
  );
  await dialog
    .getByRole('textbox', { name: 'Search the products' })
    .fill('phila');
  const hits = dialog
    .getByRole('list', { name: 'Products' })
    .getByRole('button');
  await expect(hits).toHaveCount(1);
  await hits.click();

  // The server added the code to product 2 in Grocy and set the product on
  // the row, so the row is ready. The Grocy mock answers the product barcode
  // id 5.
  await expect(dialog).toBeHidden();
  await expect(row).toContainText('Philadelphia Original 150 g');
  await expect(row).toContainText('Ready');
  await expect(row.getByRole('button', { name: 'Accept' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Pick product' })).toHaveCount(
    0,
  );
  const rows = await listRows(request);
  expect(rows.find((item) => item.id === created.id)).toMatchObject({
    productBarcodeId: 5,
    productId: 2,
  });

  await removeRows(request, (item) => item.id === created.id);
});

async function pickOption(dialog: Locator, label: string, option: string) {
  await dialog.getByLabel(label, { exact: true }).click();
  await dialog
    .page()
    .getByRole('option', { name: option, exact: true })
    .click();
}

test('New product opens the short product form with the proposals of the lookup result, creates the product, and the accept books it', async ({
  page,
  request,
}) => {
  const note = 'review-queue-new-product';
  await removeRows(
    request,
    (row) => row.note === note || row.code === NEW_PRODUCT_CODE,
  );
  const created = await createRow(request, {
    bookingType: 'purchase',
    code: NEW_PRODUCT_CODE,
    note,
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row.getByRole('link', { name: 'Open Food Facts' })).toBeVisible({
    timeout: LOOKUP_TIMEOUT_MS,
  });
  await expect(row).toContainText('Beanz in a rich tomato sauce');

  await row.getByRole('button', { name: 'New product' }).click();

  // The proposals of ADR 0011: the name, the description with the brand and
  // the label text, the stock unit Gram from g, the purchase unit Pack from a
  // label with no package word, and the factor 415 from the net quantity.
  const dialog = page.getByRole('dialog', { name: 'New product' });
  const name = dialog.getByRole('textbox', { name: 'Name' });
  await expect(name).toHaveValue('Beanz in a rich tomato sauce');
  await expect(
    dialog.getByRole('textbox', { name: 'Description' }),
  ).toHaveValue('H J Heinz Foods UK Ltd, 415g');
  await expect(dialog.getByLabel('Stock unit', { exact: true })).toContainText(
    'Gram',
  );
  await expect(
    dialog.getByLabel('Purchase unit', { exact: true }),
  ).toContainText('Pack');
  await expect(
    dialog.getByRole('spinbutton', { name: 'One Pack is how many Gram' }),
  ).toHaveValue('415');
  await expect(
    dialog.getByRole('spinbutton', { name: 'Default due days' }),
  ).toHaveValue('0');
  const attribution = dialog.getByText(
    'Contains data from Open Food Facts, available under the Open Database License.',
  );
  await expect(attribution).toBeVisible();
  await expect(
    attribution.getByRole('link', { name: 'Open Food Facts' }),
  ).toHaveAttribute(
    'href',
    `${OPEN_FACTS_MOCK_URL}/product/${NEW_PRODUCT_CODE}`,
  );
  // The create needs a location, and every proposal can be changed.
  const save = dialog.getByRole('button', { name: 'Create and use' });
  await expect(save).toBeDisabled();
  await pickOption(dialog, 'Default location', 'Pantry');
  await pickOption(dialog, 'Product group', 'Snacks');
  await name.fill('Heinz Beanz 415 g');
  await expect(save).toBeEnabled();

  await save.click();

  // The product exists in Grocy and the row has it: the server added the
  // code to the product, set the default location of the product on the row,
  // and the row is ready.
  await expect(dialog).toBeHidden();
  await expect(row).toContainText('Heinz Beanz 415 g');
  await expect(row).toContainText('Ready');
  await expect(row.getByRole('button', { name: 'Accept' })).toBeVisible();
  const rows = await listRows(request);
  expect(rows.find((item) => item.id === created.id)).toMatchObject({
    locationId: 2,
    productBarcodeId: NEW_PRODUCT_BARCODE_ID,
    productId: NEW_PRODUCT_ID,
  });

  await row.getByRole('button', { name: 'Accept' }).click();

  // One Pack is 415 Gram, so the booking of the one scanned pack holds 415
  // Gram. The Grocy mock answers the purchase with its fixed location and
  // due date.
  await expect(row).toHaveCount(0);
  const result = page.getByRole('status');
  await expect(result).toContainText('1 booked');
  await expect(result).toContainText(
    `Heinz Beanz 415 g: Booked 415 Gram at Fridge, due ${MOCK_DUE_DATE}, no price, purchase.`,
  );
  const stored = await listRows(request);
  expect(stored.filter((item) => item.note === note)).toEqual([]);
});

test('New product on a row with a write-in name opens the form with that name and no unit proposal', async ({
  page,
  request,
}) => {
  const note = 'review-queue-write-in-name';
  await removeRows(request, (row) => row.note === note);
  const created = await createRow(request, {
    bookingType: 'inventory',
    code: '4020',
    note,
    writeInName: 'Oat milk',
  });
  await page.goto('/review-queue');
  const row = queueRows(page).filter({ hasText: note });
  await expect(row).toContainText('Oat milk');

  await row.getByRole('button', { name: 'New product' }).click();

  const dialog = page.getByRole('dialog', { name: 'New product' });
  await expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue(
    'Oat milk',
  );
  await expect(dialog.getByLabel('Stock unit', { exact: true })).toContainText(
    'Pick one',
  );
  await expect(
    dialog.getByLabel('Purchase unit', { exact: true }),
  ).toContainText('Pick one');
  await expect(
    dialog.getByRole('button', { name: 'Create and use' }),
  ).toBeDisabled();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await removeRows(request, (item) => item.id === created.id);
});
