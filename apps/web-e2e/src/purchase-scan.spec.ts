import { expect, test } from '@playwright/test';
import {
  listRows,
  LOOKUP_TIMEOUT_MS,
  OPEN_FACTS_MOCK_URL,
  PENDING_SCANS,
  type PendingScanRow,
  pickOption,
  removeRowsWithCode,
  scannerLabel,
  sendScannerCode,
  sessionRows,
  swipeLeft,
  typeCode,
} from './pending-scans.js';

// The tests of the Purchase scan screen: a typed code becomes a pending scan and shows in the session list within the three-second poll.
// The API keeps its rows for the whole run, and the tests of one file run in parallel.
// Thus each test types a code of its own and removes the open rows of that code first.
// A repeat of the run, or a retry, then never merges into an old row.

test('a typed fixture code shows the product name, the time, and the barcode price within three seconds', async ({
  page,
  request,
}) => {
  const code = '5449000000996';
  await removeRowsWithCode(request, code);
  await page.goto('/scan/purchase');

  await typeCode(page, code);

  const row = sessionRows(page).filter({
    hasText: 'Coca-Cola Original 330 ml',
  });
  await expect(row).toBeVisible({ timeout: 3000 });
  await expect(row.locator('time')).toHaveText(/\d{1,2}:\d{2}/);
  await expect(row).toContainText('0.85 unit');
  await expect(row).toContainText('1 Can');
});

test('a typed unknown code shows the bare code', async ({ page, request }) => {
  // A four-digit produce code gets no lookup, so the row keeps the bare code.
  const code = '4011';
  await removeRowsWithCode(request, code);
  await page.goto('/scan/purchase');

  await typeCode(page, code);

  const row = sessionRows(page).filter({ hasText: code });
  await expect(row).toBeVisible({ timeout: 3000 });
  await expect(row).toContainText('Product default');
  await expect(row).toContainText('no price');
  await expect(
    page.getByText('1 scan in the review queue', { exact: true }),
  ).toBeVisible();
});

test('a fixture code typed two times shows one row with the amount two at the top', async ({
  page,
  request,
}) => {
  const code = '7622300441937';
  await removeRowsWithCode(request, code);
  await removeRowsWithCode(request, '4012');
  await page.goto('/scan/purchase');

  await typeCode(page, '4012');
  await expect(sessionRows(page).filter({ hasText: '4012' })).toBeVisible();
  await typeCode(page, code);
  await typeCode(page, code);

  const rows = sessionRows(page);
  await expect(rows.first()).toContainText('Philadelphia Original 150 g');
  await expect(rows.first()).toContainText('2 Pack');
  await expect(rows).toHaveCount(2);
});

// The tests of the code 8000500310427 run one after the other in one worker,
// in the order of the file. Two tests on one code must not run at one time,
// because each test removes the open rows of the code first. The hardware
// scanner tests of the Purchase and the Inventory scan screens send this code,
// as the spec of the hardware scanner says. Thus the Inventory test is in this
// file too.
test.describe('the code 8000500310427', () => {
  test.describe.configure({ mode: 'default' });

  test('plus and minus on a row change the amount within the poll', async ({
    page,
    request,
  }) => {
    // The product barcode of this code carries the amount two.
    const code = '8000500310427';
    await removeRowsWithCode(request, code);
    await page.goto('/scan/purchase');
    await typeCode(page, code);
    const row = sessionRows(page).filter({ hasText: 'Nutella Biscuits 304 g' });
    await expect(row).toContainText('2 Pack');

    await row.getByRole('button', { name: 'More' }).click();
    await expect(row).toContainText('3 Pack', { timeout: 3000 });

    await row.getByRole('button', { name: 'Less' }).click();
    await expect(row).toContainText('2 Pack', { timeout: 3000 });
  });

  test('a hardware scanner code with no field in focus shows one row, and the decoder line says Scanner', async ({
    page,
    request,
  }) => {
    const code = '8000500310427';
    await removeRowsWithCode(request, code);
    await page.goto('/scan/purchase');
    await expect(
      page.getByText('0 scans in the review queue', { exact: true }),
    ).toBeVisible();
    await expect(page.locator(':focus')).toHaveCount(0);
    await expect(scannerLabel(page)).toHaveCount(0);

    await sendScannerCode(page, code);

    const row = sessionRows(page).filter({ hasText: 'Nutella Biscuits 304 g' });
    await expect(row).toContainText('2 Pack', { timeout: 3000 });
    await expect(sessionRows(page)).toHaveCount(1);
    await expect(scannerLabel(page)).toBeVisible();
  });

  test('a hardware scanner code with no field in focus shows one Inventory row, and the decoder line says Scanner', async ({
    page,
    request,
  }) => {
    // Product 3 has the stock 1 in the unit Pack.
    const code = '8000500310427';
    await removeRowsWithCode(request, code);
    await page.goto('/scan/inventory');
    await expect(
      page.getByText('0 scans in the review queue', { exact: true }),
    ).toBeVisible();
    await expect(page.locator(':focus')).toHaveCount(0);
    await expect(scannerLabel(page)).toHaveCount(0);

    await sendScannerCode(page, code);

    const row = sessionRows(page).filter({ hasText: 'Nutella Biscuits 304 g' });
    await expect(row).toContainText('In Grocy: 1 Pack', { timeout: 3000 });
    await expect(sessionRows(page)).toHaveCount(1);
    await expect(scannerLabel(page)).toBeVisible();
  });
});

test('a hardware scanner code into the focused code field makes one row and no second row', async ({
  page,
  request,
}) => {
  const code = '4026';
  await removeRowsWithCode(request, code);
  await page.goto('/scan/purchase');
  await page.getByRole('textbox', { name: 'Code' }).focus();

  await sendScannerCode(page, code);

  const row = sessionRows(page).filter({ hasText: code });
  await expect(row).toBeVisible({ timeout: 3000 });
  await expect(
    page.getByText('1 scan in the review queue', { exact: true }),
  ).toBeVisible();
  // A second create call of the code merges into the open row and adds one to
  // the amount. Thus the amount 1 shows that the listener made no create call.
  const rows = await listRows(request);
  const stored = rows.filter((item) => item.code === code);
  expect(stored).toHaveLength(1);
  expect(stored[0]?.amount).toBe(1);
  await expect(scannerLabel(page)).toHaveCount(0);
});

test('a swipe to the left past a third of the row width removes the row', async ({
  page,
  request,
}) => {
  // The 12-digit form of the second product barcode of Coca-Cola.
  const code = '049000006346';
  await removeRowsWithCode(request, code);
  await page.goto('/scan/purchase');
  await typeCode(page, code);
  const row = sessionRows(page).filter({
    hasText: 'Coca-Cola Original 330 ml',
  });
  await expect(row).toBeVisible();

  await swipeLeft(page, row, 0.5);

  await expect(row).toBeHidden({ timeout: 3000 });
  await expect(
    page.getByText('0 scans in the review queue', { exact: true }),
  ).toBeVisible();
});

test('a short swipe snaps back and keeps the row', async ({
  page,
  request,
}) => {
  const code = '4013';
  await removeRowsWithCode(request, code);
  await page.goto('/scan/purchase');
  await typeCode(page, code);
  const row = sessionRows(page).filter({ hasText: code });
  await expect(row).toBeVisible();

  await swipeLeft(page, row, 0.15);

  // The poll runs one time before the check, so a sent delete would show.
  await expect(row).toBeVisible();
  await expect(row).toHaveCount(1);
  await expect(
    page.getByText('1 scan in the review queue', { exact: true }),
  ).toBeVisible({ timeout: 4000 });
  const response = await request.get(PENDING_SCANS);
  const { items } = (await response.json()) as { items: PendingScanRow[] };
  expect(items.filter((item) => item.code === code)).toHaveLength(1);
});

// The date that the browser writes for the due date rule of seven days. The
// test and the browser run on one machine, so the calendar date is the same.
const DUE_IN_SEVEN_DAYS = Temporal.Now.plainDateISO()
  .add({ days: 7 })
  .toString();

test('the defaults of the section land on the row of the next typed code, and the closed section shows them in one line', async ({
  page,
  request,
}) => {
  const code = '4014';
  await removeRowsWithCode(request, code);
  await page.goto('/scan/purchase');
  const section = page.getByRole('button', { name: 'Defaults' });
  await expect(section).toContainText(
    'Product default · No store · Product default · Default group',
  );

  await section.click();
  await pickOption(page, 'Location', 'Pantry');
  await pickOption(page, 'Store', 'Supermarket');
  await pickOption(page, 'Due date', 'Days from today');
  await expect(page.getByRole('spinbutton', { name: 'Days' })).toHaveValue('7');
  await section.click();
  await expect(section).toContainText(
    'Pantry · Supermarket · +7 days · Default group',
  );

  await typeCode(page, code);

  const row = sessionRows(page).filter({ hasText: code });
  await expect(row).toBeVisible({ timeout: 3000 });
  await expect(row).toContainText('Pantry');
  await expect(row).toContainText(DUE_IN_SEVEN_DAYS);
  const response = await request.get(PENDING_SCANS);
  const { items } = (await response.json()) as {
    items: (PendingScanRow & {
      dueDate: null | string;
      locationId: null | number;
      storeId: null | number;
    })[];
  };
  const stored = items.find((item) => item.code === code);
  expect(stored).toMatchObject({
    dueDate: DUE_IN_SEVEN_DAYS,
    locationId: 2,
    storeId: 1,
  });
});

test('a price typed before a scan lands on that row, the field clears, and the price type stays', async ({
  page,
  request,
}) => {
  const code = '4015';
  await removeRowsWithCode(request, code);
  await page.goto('/scan/purchase');
  const price = page.getByRole('textbox', { name: 'Price for the next scan' });
  const total = page.getByRole('button', { name: 'total', exact: true });

  await total.click();
  await price.fill('2.5');
  await typeCode(page, code);

  const row = sessionRows(page).filter({ hasText: code });
  await expect(row).toBeVisible({ timeout: 3000 });
  await expect(row).toContainText('2.5 total');
  await expect(price).toHaveValue('');
  await expect(total).toHaveAttribute('aria-pressed', 'true');
});

test('a typed unknown code shows its lookup result name and the service link within the poll', async ({
  page,
  request,
}) => {
  // The second unknown code of the Open Food Facts mock, Barilla Basilico
  // 400 g. The camera tests own the first unknown code, and a typed code
  // merges into an open row of the same code.
  const code = '8076809513722';
  await removeRowsWithCode(request, code);
  await page.goto('/scan/purchase');

  await typeCode(page, code);

  // The row shows the bare code first, and the name of the lookup result
  // after the lookup. The service name is a link to the product page.
  const row = sessionRows(page).filter({ hasText: /8076809513722|Basilico/ });
  await expect(row).toBeVisible();
  const link = row.getByRole('link', { name: 'Open Food Facts' });
  await expect(link).toBeVisible({ timeout: LOOKUP_TIMEOUT_MS });
  await expect(row).toContainText('Basilico');
  await expect(link).toHaveAttribute(
    'href',
    `${OPEN_FACTS_MOCK_URL}/product/${code}`,
  );
});
