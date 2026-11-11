import type { PendingScan } from '../api/next-api';
import { bannerOf, outcomeOf } from './scan-outcome';

function row(fields: Partial<PendingScan>): PendingScan {
  return {
    amount: 1,
    bookingType: 'purchase',
    code: '5449000000996',
    createdAt: '2026-11-11T10:00:00.000Z',
    dueDate: null,
    error: null,
    id: 1,
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

describe('the outcome of a create call', () => {
  it('is a known product when the new row has a product', () => {
    expect(outcomeOf(row({ productId: 1 }))).toBe('known');
  });

  it('is an unknown code when the new row has no product', () => {
    expect(outcomeOf(row({ productId: null }))).toBe('unknown');
  });

  it('is a repeat when the row was scanned after it was created', () => {
    expect(
      outcomeOf(
        row({
          amount: 2,
          productId: 1,
          scannedAt: '2026-11-11T10:00:05.000Z',
        }),
      ),
    ).toBe('repeat');
  });

  it('is a repeat for a merged row with no product too', () => {
    expect(
      outcomeOf(row({ amount: 2, scannedAt: '2026-11-11T10:00:05.000Z' })),
    ).toBe('repeat');
  });

  // An Inventory repeat scan answers the open row with no change, so the
  // row has one time for the create and the scan. The session knows the row.
  it('is a repeat when the session already holds the row', () => {
    expect(
      outcomeOf(row({ bookingType: 'inventory', productId: 1 }), true),
    ).toBe('repeat');
  });
});

describe('the banner of a create call', () => {
  const lists = {
    locations: [],
    products: [{ description: null, id: 1, name: 'Coca-Cola Original 330 ml' }],
    quantityUnits: [{ id: 1, name: 'Can' }],
  };

  it('names the product and the amount for a known product', () => {
    expect(bannerOf(row({ productId: 1, quantityUnitId: 1 }), lists)).toEqual({
      detail: '1 Can',
      kind: 'known',
      title: 'Coca-Cola Original 330 ml',
    });
  });

  it('names the product and the code for a known product on the Inventory screen', () => {
    expect(
      bannerOf(
        row({ amount: null, bookingType: 'inventory', productId: 1 }),
        lists,
      ),
    ).toEqual({
      detail: '5449000000996',
      kind: 'known',
      title: 'Coca-Cola Original 330 ml',
    });
  });

  it('says that the product is in the list for an Inventory repeat, with no plus one', () => {
    expect(
      bannerOf(
        row({ amount: null, bookingType: 'inventory', productId: 1 }),
        lists,
        true,
      ),
    ).toEqual({
      detail: 'Already in the list',
      kind: 'repeat',
      title: 'Coca-Cola Original 330 ml',
    });
  });

  it('names the code for an unknown code', () => {
    expect(bannerOf(row({ code: '3017620422003' }), lists)).toEqual({
      detail: '3017620422003',
      kind: 'unknown',
      title: 'Unknown barcode',
    });
  });

  it('names the product and the new amount for a repeat', () => {
    expect(
      bannerOf(
        row({
          amount: 2,
          productId: 1,
          quantityUnitId: 1,
          scannedAt: '2026-11-11T10:00:05.000Z',
        }),
        lists,
      ),
    ).toEqual({
      detail: '2 Can',
      kind: 'repeat',
      pill: '+1',
      title: 'Coca-Cola Original 330 ml',
    });
  });

  it('names the code for a repeat of a row with no product and no unit', () => {
    expect(
      bannerOf(
        row({ amount: 2, code: '4011', scannedAt: '2026-11-11T10:00:05.000Z' }),
        lists,
      ),
    ).toEqual({ detail: '2', kind: 'repeat', pill: '+1', title: '4011' });
  });
});
