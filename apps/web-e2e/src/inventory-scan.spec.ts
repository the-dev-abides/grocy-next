import { type APIRequestContext, expect, test } from '@playwright/test';
import {
  listRows,
  PENDING_SCANS,
  type PendingScanRow,
  sessionRows,
  typeCode,
} from './pending-scans.js';

// The tests of the Inventory scan screen.
// A typed code becomes one row per product with the Grocy stock from the product read.
// A repeat scan changes nothing.
// A row with no product and no lookup result takes a write-in name.
// The API keeps its rows for the whole run, and the tests of one file run in parallel.
// Thus each test owns one code and one product.
// The Purchase tests own the three fixture codes and the 12-digit form of the second product barcode.
// They remove rows by code across both booking types.
// Thus this file uses the 13-digit form of that product barcode, a Grocycode, and a produce code of its own.

async function inventoryRows(
  request: APIRequestContext,
  code: string,
  productId: null | number,
): Promise<PendingScanRow[]> {
  const rows = await listRows(request);
  return rows.filter((row) => {
    return (
      row.bookingType === 'inventory' &&
      row.code !== null &&
      (row.code === code || (productId !== null && row.productId === productId))
    );
  });
}

// One product has at most one open Inventory pending scan with a code. Thus the
// open rows of the product with a code go too, whatever code they carry. A row
// with no code is never a merge target, and the review queue tests own the
// Inventory rows with no code.
async function removeInventoryRows(
  request: APIRequestContext,
  code: string,
  productId: null | number,
): Promise<void> {
  const rows = await inventoryRows(request, code, productId);
  for (const row of rows) {
    await request.delete(`${PENDING_SCANS}/${String(row.id)}`);
  }
}

test('a typed fixture code shows one row with the product name and the Grocy stock', async ({
  page,
  request,
}) => {
  // The 13-digit form of the second product barcode of Coca-Cola. Product 1
  // has the stock 6 in the unit Can.
  const code = '0049000006346';
  await removeInventoryRows(request, code, 1);
  await page.goto('/scan/inventory');

  await typeCode(page, code);

  const row = sessionRows(page).filter({
    hasText: 'Coca-Cola Original 330 ml',
  });
  await expect(row).toBeVisible({ timeout: 3000 });
  await expect(row).toContainText('In Grocy: 6 Can');
  await expect(row.getByRole('textbox', { name: 'Product name' })).toHaveCount(
    0,
  );
  await expect(
    page.getByText('1 scan in the review queue', { exact: true }),
  ).toBeVisible();
  const stored = await inventoryRows(request, code, 1);
  expect(stored).toHaveLength(1);
});

test('the same code typed again leaves one row with no change', async ({
  page,
  request,
}) => {
  // The Grocycode of Philadelphia, product 2 with the stock 2 in the unit
  // Pack. A Grocycode is a code like any other on the scan screen.
  const code = 'grcy:p:2';
  await removeInventoryRows(request, code, 2);
  await page.goto('/scan/inventory');
  await typeCode(page, code);
  const row = sessionRows(page).filter({
    hasText: 'Philadelphia Original 150 g',
  });
  await expect(row).toContainText('In Grocy: 2 Pack');
  const [first] = await inventoryRows(request, code, 2);

  await typeCode(page, code);

  // The repeat answers the open row. The banner names the product and says
  // that it is in the list, and the list keeps one row.
  await expect(page.getByRole('status')).toContainText('Already in the list');
  await expect(sessionRows(page)).toHaveCount(1);
  await expect(row).toContainText('In Grocy: 2 Pack');
  const stored = await inventoryRows(request, code, 2);
  expect(stored).toEqual([first]);
});

test('a row for an unknown code shows the write-in name field, and the typed name is on the row after the poll', async ({
  page,
  request,
}) => {
  // A four-digit produce code gets no lookup, so the row has no product and
  // no lookup result.
  const code = '4016';
  await removeInventoryRows(request, code, null);
  await page.goto('/scan/inventory');
  await typeCode(page, code);
  // The row shows the bare code first, and the write-in name after the
  // update.
  const row = sessionRows(page).filter({ hasText: /4016|Olive oil/ });
  await expect(row).toBeVisible({ timeout: 3000 });
  await expect(row).toContainText(code);
  const field = row.getByRole('textbox', { name: 'Product name' });
  await expect(field).toBeVisible();

  await field.fill('Olive oil');
  await field.press('Enter');

  await expect(row).toContainText('Olive oil', { timeout: 3000 });
  await expect(row).toContainText('New product');
  await expect(field).toHaveValue('Olive oil');
  const stored = await inventoryRows(request, code, null);
  expect(stored).toHaveLength(1);
  expect(stored[0]?.writeInName).toBe('Olive oil');
});
