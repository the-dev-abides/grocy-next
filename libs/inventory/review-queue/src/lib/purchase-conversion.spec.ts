import { toStockUnit } from './purchase-conversion.ts';

// The fixture: the stock unit 2 (Pack), the purchase unit 2, and the
// conversion 1 Box (unit 3) = 6 Packs in both directions.
const PRODUCT = {
  conversions: [
    { factor: 1, fromQuantityUnitId: 2, toQuantityUnitId: 2 },
    { factor: 6, fromQuantityUnitId: 3, toQuantityUnitId: 2 },
    { factor: 1 / 6, fromQuantityUnitId: 2, toQuantityUnitId: 3 },
  ],
  purchaseUnitId: 2,
  stockUnitId: 2,
};

describe('the Purchase amount and price conversion', () => {
  it('keeps an amount in the stock unit', () => {
    expect(
      toStockUnit(
        { amount: 2, price: null, priceType: 'unit', quantityUnitId: 2 },
        PRODUCT,
      ),
    ).toEqual({ amount: 2, price: null });
  });

  it('takes the purchase unit for the empty unit', () => {
    expect(
      toStockUnit(
        { amount: 2, price: 1.5, priceType: 'unit', quantityUnitId: null },
        { ...PRODUCT, purchaseUnitId: 3 },
      ),
    ).toEqual({ amount: 12, price: 0.25 });
  });

  it('multiplies the amount by the factor of the scanned unit', () => {
    expect(
      toStockUnit(
        { amount: 1, price: null, priceType: 'unit', quantityUnitId: 3 },
        PRODUCT,
      ),
    ).toEqual({ amount: 6, price: null });
  });

  it('divides a unit price by the factor of the scanned unit', () => {
    expect(
      toStockUnit(
        { amount: 1, price: 3, priceType: 'unit', quantityUnitId: 3 },
        PRODUCT,
      ),
    ).toEqual({ amount: 6, price: 0.5 });
  });

  it('divides a total price by the stock amount', () => {
    expect(
      toStockUnit(
        { amount: 2, price: 3, priceType: 'total', quantityUnitId: 3 },
        PRODUCT,
      ),
    ).toEqual({ amount: 12, price: 0.25 });
  });

  it('keeps a unit price in the stock unit', () => {
    expect(
      toStockUnit(
        { amount: 4, price: 0.85, priceType: 'unit', quantityUnitId: 2 },
        PRODUCT,
      ),
    ).toEqual({ amount: 4, price: 0.85 });
  });

  it('refuses a unit with no path to the stock unit with the no-conversion problem', () => {
    expect(() => {
      return toStockUnit(
        { amount: 1, price: null, priceType: 'unit', quantityUnitId: 1 },
        PRODUCT,
      );
    }).toThrow(
      expect.objectContaining({
        problem: expect.objectContaining({
          status: 422,
          type: '/problems/no-conversion',
        }),
      }),
    );
  });

  it('needs no conversion row for the stock unit itself', () => {
    expect(
      toStockUnit(
        { amount: 3, price: null, priceType: 'unit', quantityUnitId: 2 },
        { ...PRODUCT, conversions: [] },
      ),
    ).toEqual({ amount: 3, price: null });
  });
});
