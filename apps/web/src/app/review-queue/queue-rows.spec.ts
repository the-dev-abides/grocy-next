import type { PendingScan } from '../api/next-api';
import { queueRows } from './queue-rows';

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

describe('the rows of the review queue', () => {
  it('holds every pending scan of both booking types, most recent at the top', () => {
    const items = [
      row({ id: 1, scannedAt: '2026-11-11T10:00:00.000Z' }),
      row({
        bookingType: 'inventory',
        id: 2,
        scannedAt: '2026-11-11T10:00:02.000Z',
      }),
      row({ id: 3, scannedAt: '2026-11-11T10:00:01.000Z' }),
    ];

    expect(queueRows(items).map(({ id }) => id)).toEqual([2, 3, 1]);
  });

  it('keeps the later row first when two rows have one scan time', () => {
    const items = [row({ id: 1 }), row({ id: 2 })];

    expect(queueRows(items).map(({ id }) => id)).toEqual([2, 1]);
  });
});
