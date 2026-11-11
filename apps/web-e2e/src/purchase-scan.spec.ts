import {
  type APIRequestContext,
  expect,
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
