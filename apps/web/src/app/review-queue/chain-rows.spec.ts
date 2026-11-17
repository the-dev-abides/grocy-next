import type { PendingScan } from '../api/next-api';

import type { RowProperties } from './row-properties';

import { chainRowsOf, isSameRows, NO_ROWS } from './chain-rows';
import { isSameRowProperties } from './row-properties';

function row(
  fields: Partial<PendingScan> & Pick<PendingScan, 'id'>,
): PendingScan {
  return {
    amount: 1,
    bookingType: 'consume',
    code: null,
    createdAt: '2026-11-17T10:00:00.000Z',
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
    scannedAt: '2026-11-17T10:00:00.000Z',
    spoiled: false,
    stockEntryId: null,
    storeId: null,
    toLocationId: null,
    updatedAt: '2026-11-17T10:00:00.000Z',
    writeInName: null,
    ...fields,
  };
}

const LISTS = {
  locations: [],
  productGroups: [],
  products: [],
  quantityUnitConversions: [],
  quantityUnits: [],
  stores: [],
};

function noop() {
  // The test does not call the callbacks.
}

describe('the chain rows of the review queue', () => {
  it('gives each row the older rows of its product, oldest first, with the id as the tie break', () => {
    const newest = row({ id: 1, scannedAt: '2026-11-17T10:02:00.000Z' });
    const oldest = row({ id: 2, scannedAt: '2026-11-17T10:00:00.000Z' });
    const sameTimeFirst = row({ id: 3, scannedAt: '2026-11-17T10:01:00.000Z' });
    const sameTimeSecond = row({
      id: 4,
      scannedAt: '2026-11-17T10:01:00.000Z',
    });
    const otherProduct = row({
      id: 5,
      productId: 2,
      scannedAt: '2026-11-17T09:00:00.000Z',
    });

    const chains = chainRowsOf([
      newest,
      oldest,
      sameTimeSecond,
      sameTimeFirst,
      otherProduct,
    ]);

    expect(chains.get(1)).toEqual([oldest, sameTimeFirst, sameTimeSecond]);
    expect(chains.get(4)).toEqual([oldest, sameTimeFirst]);
    expect(chains.get(2)).toBe(NO_ROWS);
    expect(chains.get(5)).toBe(NO_ROWS);
  });

  it('gives a row with no product no chain', () => {
    expect(chainRowsOf([row({ id: 1, productId: null })]).has(1)).toBe(false);
  });

  it('compares two slices row by row by identity', () => {
    const first = row({ id: 1 });
    const second = row({ id: 2 });

    expect(isSameRows([first, second], [first, second])).toBe(true);
    expect(isSameRows([first, second], [first, { ...second }])).toBe(false);
    expect(isSameRows([first], [first, second])).toBe(false);
  });

  // The stock entry lines of a row see the stock after the older rows of the
  // same product. So a row whose older row changed must draw again, also
  // when the row itself did not change.
  it('lets a row draw again when an older row of its product changed', () => {
    const older = row({ id: 1, scannedAt: '2026-11-17T10:00:00.000Z' });
    const newer = row({ id: 2, scannedAt: '2026-11-17T10:05:00.000Z' });
    const properties = (rows: PendingScan[]): RowProperties => {
      return {
        chainRows: chainRowsOf(rows).get(2) ?? NO_ROWS,
        isChecked: false,
        lists: LISTS,
        onChanged: noop,
        onResult: noop,
        onToggle: noop,
        scan: newer,
      };
    };
    const before = properties([older, newer]);
    const samePoll = properties([older, newer]);
    const changedPoll = properties([{ ...older, amount: 2 }, newer]);

    expect(isSameRowProperties(before, samePoll)).toBe(true);
    expect(isSameRowProperties(before, changedPoll)).toBe(false);
  });
});
