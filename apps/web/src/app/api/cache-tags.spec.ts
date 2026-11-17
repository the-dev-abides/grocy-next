import { configureStore } from '@reduxjs/toolkit';

import type {
  Booking,
  ListPendingScansResponse,
  PendingScan,
  Product,
  StockLogRow,
} from './next-api';

import { bookingTagsOf, cachedApi, productTagsOf } from './cache-tags';

// The stock entry 20 of product 6, a sub-product of the parent product 5.
const CHILD_ENTRY = {
  amount: 3,
  dueDate: '2026-11-25',
  id: 20,
  locationId: 1,
  open: false,
  purchasedDate: '2026-11-08',
  stockId: '69131a2b3cd91',
};

function productOf(fields: Partial<Product> & { id: number }): Product {
  return {
    canBeOpened: true,
    consumeLocationId: null,
    consumeUnitId: 2,
    conversions: [],
    defaultDueDays: 0,
    description: null,
    hasPicture: false,
    isParent: false,
    locationId: 1,
    minStockAmount: 0,
    name: 'Yoghurt',
    productGroupId: null,
    purchaseToStockFactor: 1,
    purchaseUnitId: 2,
    stockAmount: 0,
    stockEntries: [],
    stockUnitId: 2,
    subProductStockEntries: [],
    tareWeight: null,
    ...fields,
  };
}

function consumeOf(productId: number, stockEntryId: number): Booking {
  const row: StockLogRow = {
    amount: -1,
    dueDate: '2026-11-25',
    id: 105,
    locationId: 1,
    note: null,
    price: null,
    purchasedDate: '2026-11-08',
    spoiled: false,
    stockEntryId,
    storeId: null,
    transactionType: 'consume',
  };
  return {
    bookings: [row],
    bookingType: 'consume',
    pendingScanId: 1,
    productId,
    transactionId: '69131a2b3cf01',
  };
}

function hasSharedTag(booking: Booking, product: Product): boolean {
  const booked = bookingTagsOf(booking);
  return productTagsOf(product).some((tag) =>
    booked.some((item) => item.type === tag.type && item.id === tag.id),
  );
}

// An accept changes the stock, so it marks the product reads that show the
// changed stock as old.
describe('the product reads that an accept marks as old', () => {
  const parent = productOf({
    id: 5,
    isParent: true,
    subProductStockEntries: [
      { ...CHILD_ENTRY, canBeOpened: true, productId: 6 },
    ],
  });
  const child = productOf({ id: 6, stockEntries: [CHILD_ENTRY] });
  const other = productOf({ id: 1 });

  it('marks the read of the booked product as old', () => {
    expect(hasSharedTag(consumeOf(1, 11), other)).toBe(true);
  });

  it('marks the read of a sub-product as old after a Consume of its parent product', () => {
    expect(hasSharedTag(consumeOf(5, 20), child)).toBe(true);
  });

  it('marks the read of a parent product as old after a booking of its sub-product', () => {
    expect(hasSharedTag(consumeOf(6, 20), parent)).toBe(true);
  });

  it('keeps the read of a product that the booking does not touch', () => {
    expect(hasSharedTag(consumeOf(6, 20), other)).toBe(false);
  });
});

function scanOf(id: number, fields: Partial<PendingScan> = {}): PendingScan {
  return {
    amount: 1,
    bookingType: 'purchase',
    code: null,
    createdAt: '2026-11-17T10:00:00.000Z',
    dueDate: null,
    error: null,
    id,
    lastLookupAt: null,
    locationId: null,
    lookupResult: {
      brand: 'Ferrero',
      imageUrl: null,
      name: 'Nutella',
      netQuantity: 400,
      netQuantityUnit: 'g',
      packageShapes: ['en:jar'],
      quantityText: '400 g',
      service: 'Open Food Facts',
      sourceUrl: 'https://world.openfoodfacts.org/product/3017620422003',
    },
    note: null,
    price: null,
    priceType: 'unit',
    productBarcodeId: null,
    productGroupId: null,
    productId: 3,
    quantityUnitId: null,
    scannedAt: `2026-11-17T10:00:0${String(id)}.000Z`,
    spoiled: false,
    stockEntryId: null,
    storeId: null,
    toLocationId: null,
    updatedAt: '2026-11-17T10:00:00.000Z',
    writeInName: null,
    ...fields,
  };
}

// The list in the cache after the first list and after the second list.
async function listAfter(
  first: PendingScan[],
  second: PendingScan[],
): Promise<[ListPendingScansResponse, ListPendingScansResponse]> {
  const store = configureStore({
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(cachedApi.middleware),
    reducer: { [cachedApi.reducerPath]: cachedApi.reducer },
  });
  const select = cachedApi.endpoints.listPendingScans.select(undefined);
  const { upsertQueryData } = cachedApi.util;
  await store.dispatch(
    upsertQueryData('listPendingScans', undefined, { items: first }),
  );
  const before = select(store.getState()).data;
  await store.dispatch(
    upsertQueryData('listPendingScans', undefined, { items: second }),
  );
  const after = select(store.getState()).data;
  if (before === undefined || after === undefined) {
    throw new Error('The list is not in the cache.');
  }
  return [before, after];
}

// The pending scan list comes most recent first. A new row at the top moves
// every other row one place down. The default structural sharing of RTK
// Query compares the rows place by place, so it gave every row a new object,
// and the review queue drew every row again at each poll. The list keeps the
// object of each row that did not change, by its id.
describe('the pending scan list in the cache', () => {
  it('keeps the object of each row that did not change when a new row comes at the top', async () => {
    const [before, after] = await listAfter(
      [scanOf(2), scanOf(1)],
      [scanOf(3), scanOf(2), scanOf(1)],
    );

    expect(after.items.map(({ id }) => id)).toEqual([3, 2, 1]);
    expect(after.items[1]).toBe(before.items[0]);
    expect(after.items[2]).toBe(before.items[1]);
  });

  it('gives a new object to a row that changed, and keeps the others', async () => {
    const [before, after] = await listAfter(
      [scanOf(2), scanOf(1)],
      [scanOf(2, { amount: 2 }), scanOf(1)],
    );

    expect(after.items[0]).not.toBe(before.items[0]);
    expect(after.items[0]?.amount).toBe(2);
    expect(after.items[1]).toBe(before.items[1]);
  });

  it('keeps the list object when no row changed', async () => {
    const [before, after] = await listAfter(
      [scanOf(2), scanOf(1)],
      [scanOf(2), scanOf(1)],
    );

    expect(after).toBe(before);
  });

  it('drops a row that left the list', async () => {
    const [before, after] = await listAfter(
      [scanOf(3), scanOf(2), scanOf(1)],
      [scanOf(3), scanOf(1)],
    );

    expect(after.items.map(({ id }) => id)).toEqual([3, 1]);
    expect(after.items[1]).toBe(before.items[2]);
  });
});
