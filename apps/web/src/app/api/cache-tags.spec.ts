import type { Booking, Product, StockLogRow } from './next-api';

import { bookingTagsOf, productTagsOf } from './cache-tags';

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
