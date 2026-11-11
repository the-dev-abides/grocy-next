import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';

// The tests of the Purchase scan screen: a typed code becomes a pending scan
// and shows in the session list within the three-second poll. The API keeps
// its rows for the whole run, and the tests of one file run in parallel, so
// each test types a code of its own and removes the open rows of that code
// first. A repeat of the run, or a retry, then never merges into an old row.

const PENDING_SCANS = '/api/v2/pending-scans';

interface PendingScanRow {
  code: null | string;
  id: number;
}

async function removeRowsWithCode(
  request: APIRequestContext,
  code: string,
): Promise<void> {
  const response = await request.get(PENDING_SCANS);
  const { items } = (await response.json()) as { items: PendingScanRow[] };
  for (const row of items) {
    if (row.code === code) {
      await request.delete(`${PENDING_SCANS}/${String(row.id)}`);
    }
  }
}

async function typeCode(page: Page, code: string): Promise<void> {
  const field = page.getByRole('textbox', { name: 'Code' });
  await field.fill(code);
  await field.press('Enter');
}

function sessionRows(page: Page) {
  return page
    .getByRole('list', { name: 'Scans of this session' })
    .getByRole('listitem');
}

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
  await expect(row).toContainText('0.85 total');
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

async function swipeLeft(page: Page, row: Locator, fraction: number) {
  const box = await row.boundingBox();
  if (box === null) {
    throw new Error('The row has no box on the page.');
  }
  const startX = box.x + box.width * 0.9;
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - box.width * fraction, y, { steps: 10 });
  await page.mouse.up();
}

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
