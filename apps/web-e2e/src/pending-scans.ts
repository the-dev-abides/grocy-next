import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from '@playwright/test';

// The helpers that the spec files share. They read and write the pending scan list through the Next API and work the shared controls of the screens.

export const PENDING_SCANS = '/api/v2/pending-scans';

// The Open Food Facts mock of the Playwright configuration. The lookup worker
// of the API names the source URL after it.
export const OPEN_FACTS_MOCK_URL = 'http://localhost:18081';

// The lookup worker answers within a few seconds. The row shows the result
// at the next poll of the pending scan list.
export const LOOKUP_TIMEOUT_MS = 15_000;

// The Grocy mock answers a purchase with a fixed stock log row. The row has the
// location 1 Fridge and the due date 2027-01-01. It has the amount and the
// price of the request.
export const MOCK_DUE_DATE = '2027-01-01';

// The fields of a pending scan that the spec files read.
export interface PendingScanRow {
  amount: null | number;
  bookingType: 'inventory' | 'purchase';
  code: null | string;
  dueDate: null | string;
  id: number;
  locationId: null | number;
  note: null | string;
  price: null | number;
  priceType: 'total' | 'unit';
  productBarcodeId: null | number;
  productGroupId: null | number;
  productId: null | number;
  quantityUnitId: null | number;
  scannedAt: string;
  storeId: null | number;
  updatedAt: string;
  writeInName: null | string;
}

function isRow(body: unknown): body is PendingScanRow {
  return (
    typeof body === 'object' &&
    body !== null &&
    'id' in body &&
    typeof body.id === 'number'
  );
}

function isRowList(body: unknown): body is { items: PendingScanRow[] } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'items' in body &&
    Array.isArray(body.items)
  );
}

export async function listRows(
  request: APIRequestContext,
): Promise<PendingScanRow[]> {
  const response = await request.get(PENDING_SCANS);
  const body: unknown = await response.json();
  if (!isRowList(body)) {
    throw new Error('The pending scan list has no items.');
  }
  return body.items;
}

export async function storedRow(
  request: APIRequestContext,
  id: number,
): Promise<PendingScanRow | undefined> {
  const rows = await listRows(request);
  return rows.find((row) => row.id === id);
}

export async function removeRows(
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

export async function removeRowsWithCode(
  request: APIRequestContext,
  code: string,
): Promise<void> {
  await removeRows(request, (row) => row.code === code);
}

export async function removeRowsWithNote(
  request: APIRequestContext,
  note: string,
): Promise<void> {
  await removeRows(request, (row) => row.note === note);
}

export async function createRow(
  request: APIRequestContext,
  body: Record<string, unknown>,
): Promise<PendingScanRow> {
  const response = await request.post(PENDING_SCANS, { data: body });
  expect(response.status()).toBe(201);
  const created: unknown = await response.json();
  if (!isRow(created)) {
    throw new Error('The create answered no pending scan.');
  }
  return created;
}

export function queueRows(page: Page): Locator {
  return page.getByRole('table', { name: 'Pending scans' }).locator('tbody tr');
}

export function sessionRows(page: Page): Locator {
  return page
    .getByRole('list', { name: 'Scans of this session' })
    .getByRole('listitem');
}

export async function typeCode(page: Page, code: string): Promise<void> {
  const field = page.getByRole('textbox', { name: 'Code' });
  await field.fill(code);
  await field.press('Enter');
}

// The scope is the page or a dialog. The options of a select open on the page.
export async function pickOption(
  scope: Locator | Page,
  label: string,
  option: string,
): Promise<void> {
  await scope.getByLabel(label, { exact: true }).click();
  const page = 'page' in scope ? scope.page() : scope;
  await page.getByRole('option', { exact: true, name: option }).click();
}

// A drag with the mouse from near the right edge of the element to the left,
// by the fraction of the element width.
export async function swipeLeft(
  page: Page,
  element: Locator,
  fraction: number,
): Promise<void> {
  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();
  if (box === null) {
    throw new Error('The element has no box on the page.');
  }
  const startX = box.x + box.width * 0.9;
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX - box.width * fraction, y, { steps: 10 });
  await page.mouse.up();
}
