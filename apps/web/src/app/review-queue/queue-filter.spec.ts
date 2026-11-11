import type { PendingScan } from '../api/next-api';
import { filterRows, NO_FILTER } from './queue-filter';

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
    productId: 1,
    quantityUnitId: null,
    scannedAt: '2026-11-11T10:00:00.000Z',
    storeId: null,
    updatedAt: '2026-11-11T10:00:00.000Z',
    writeInName: null,
    ...fields,
  };
}

const rows = [
  row({ id: 1, locationId: 1, productGroupId: 1 }),
  row({ id: 2, locationId: 2, productGroupId: 1, productId: null }),
  row({
    amount: null,
    bookingType: 'inventory',
    id: 3,
    locationId: 1,
    productGroupId: 2,
  }),
  row({ error: 'Location does not exist', id: 4, locationId: null }),
];

function idsOf(items: readonly PendingScan[]): number[] {
  return items.map(({ id }) => id);
}

describe('the filter of the review queue', () => {
  it('keeps every row when no filter is set', () => {
    expect(idsOf(filterRows(rows, NO_FILTER))).toEqual([1, 2, 3, 4]);
  });

  it('keeps the rows of one location', () => {
    expect(idsOf(filterRows(rows, { ...NO_FILTER, locationId: 1 }))).toEqual([
      1, 3,
    ]);
  });

  it('keeps the rows of one product group', () => {
    expect(
      idsOf(filterRows(rows, { ...NO_FILTER, productGroupId: 1 })),
    ).toEqual([1, 2]);
  });

  it('keeps the rows of each of the four states', () => {
    expect(idsOf(filterRows(rows, { ...NO_FILTER, state: 'ready' }))).toEqual([
      1,
    ]);
    expect(
      idsOf(filterRows(rows, { ...NO_FILTER, state: 'needs-product' })),
    ).toEqual([2]);
    expect(
      idsOf(filterRows(rows, { ...NO_FILTER, state: 'needs-count' })),
    ).toEqual([3]);
    expect(idsOf(filterRows(rows, { ...NO_FILTER, state: 'failed' }))).toEqual([
      4,
    ]);
  });

  it('keeps only the rows that match every set part of the filter', () => {
    expect(
      idsOf(
        filterRows(rows, { locationId: 1, productGroupId: 2, state: null }),
      ),
    ).toEqual([3]);
    expect(
      idsOf(
        filterRows(rows, { locationId: 1, productGroupId: 2, state: 'ready' }),
      ),
    ).toEqual([]);
  });
});
