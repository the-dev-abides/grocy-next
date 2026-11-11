import type { PendingScan } from '../api/next-api';
import { sessionRows } from './session-rows';

function row(
  fields: Partial<PendingScan> & Pick<PendingScan, 'id'>,
): PendingScan {
  return {
    amount: 1,
    bookingType: 'purchase',
    code: '4011',
    createdAt: '2026-11-11T10:00:00.000Z',
    dueDate: null,
    error: null,
    lastLookupAt: null,
    locationId: null,
    lookupResult: null,
    note: null,
    price: null,
    priceType: 'unit',
    productBarcodeId: null,
    productGroupId: null,
    productId: null,
    quantityUnitId: null,
    scannedAt: '2026-11-11T10:00:00.000Z',
    storeId: null,
    updatedAt: '2026-11-11T10:00:00.000Z',
    writeInName: null,
    ...fields,
  };
}

describe('the session rows of a scan screen', () => {
  it('keeps the rows that this screen created or merged, and no other row', () => {
    const items = [row({ id: 1 }), row({ id: 2 }), row({ id: 3 })];

    const rows = sessionRows(items, new Set([1, 3]), 'purchase');

    expect(rows.map(({ id }) => id)).toEqual([3, 1]);
  });

  it('keeps only the rows of the booking type of the screen', () => {
    const items = [row({ id: 1 }), row({ bookingType: 'inventory', id: 2 })];

    const rows = sessionRows(items, new Set([1, 2]), 'purchase');

    expect(rows.map(({ id }) => id)).toEqual([1]);
  });

  it('puts the most recent scan at the top', () => {
    const items = [
      row({ id: 1, scannedAt: '2026-11-11T10:00:00.000Z' }),
      row({ id: 2, scannedAt: '2026-11-11T10:00:02.000Z' }),
      row({ id: 3, scannedAt: '2026-11-11T10:00:01.000Z' }),
    ];

    const rows = sessionRows(items, new Set([1, 2, 3]), 'purchase');

    expect(rows.map(({ id }) => id)).toEqual([2, 3, 1]);
  });

  it('returns no row when the screen created none', () => {
    expect(sessionRows([row({ id: 1 })], new Set(), 'purchase')).toEqual([]);
  });
});
