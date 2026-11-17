import type { PendingScan, Product } from '../api/next-api';
import type { ChainRow } from './chain-rows';
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

// The rows of a chain, without the product reads.
function rowsOf(chain: readonly ChainRow[] | undefined): PendingScan[] {
  return (chain ?? []).map((item) => item.row);
}

// A stock entry of a product read, named by its stock id.
function entryOf(stockId: string) {
  return {
    amount: 1,
    dueDate: null,
    id: 1,
    locationId: 1,
    open: false,
    purchasedDate: null,
    stockId,
  };
}

// A product read with own stock entries and stock entries of sub-products,
// each named by its stock id.
function readOf(id: number, own: string[], sub: string[]): Product {
  return {
    id,
    stockEntries: own.map((stockId) => entryOf(stockId)),
    subProductStockEntries: sub.map((stockId) => {
      return {
        ...entryOf(stockId),
        canBeOpened: true,
        productId: 6,
      };
    }),
  } as unknown as Product;
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

    expect(rowsOf(chains.get(1))).toEqual([
      oldest,
      sameTimeFirst,
      sameTimeSecond,
    ]);
    expect(rowsOf(chains.get(4))).toEqual([oldest, sameTimeFirst]);
    expect(chains.get(2)).toBe(NO_ROWS);
    expect(chains.get(5)).toBe(NO_ROWS);
  });

  it('gives a row with no product no chain', () => {
    expect(chainRowsOf([row({ id: 1, productId: null })]).has(1)).toBe(false);
  });

  // Product 5 is a parent product. Its read shows the stock entry of its
  // sub-product, product 6. Thus the rows of both products chain.
  it('chains the rows of a parent product and of its sub-product, with their product reads', () => {
    const parent = row({
      id: 1,
      productId: 5,
      scannedAt: '2026-11-17T10:00:00.000Z',
    });
    const child = row({
      id: 2,
      productId: 6,
      scannedAt: '2026-11-17T10:01:00.000Z',
    });
    const other = row({
      id: 3,
      productId: 7,
      scannedAt: '2026-11-17T09:00:00.000Z',
    });
    const reads = new Map([
      [5, readOf(5, [], ['pack'])],
      [6, readOf(6, ['pack'], [])],
      [7, readOf(7, ['jar'], [])],
    ]);

    const chains = chainRowsOf([parent, child, other], reads);

    expect(chains.get(2)).toEqual([{ product: reads.get(5), row: parent }]);
    expect(chains.get(1)).toBe(NO_ROWS);
    expect(chains.get(3)).toBe(NO_ROWS);
  });

  it('compares two slices row by row by identity', () => {
    const first = { product: undefined, row: row({ id: 1 }) };
    const second = { product: undefined, row: row({ id: 2 }) };
    const changed = { product: undefined, row: { ...second.row } };

    expect(isSameRows([first, second], [first, second])).toBe(true);
    expect(isSameRows([first, second], [first, changed])).toBe(false);
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
