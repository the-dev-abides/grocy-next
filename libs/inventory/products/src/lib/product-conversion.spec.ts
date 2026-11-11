import { purchaseToStockRowOf } from './product-conversion.ts';

// The fixture: the stock unit 2 (Pack) and the purchase unit 3 (Box). The
// Grocy trigger created the row 7 from the Box to the Pack with factor 1.
const UNITS = { purchaseUnitId: 3, stockUnitId: 2 };
const TRIGGER_ROW = {
  factor: 1,
  fromQuantityUnitId: 3,
  id: 7,
  toQuantityUnitId: 2,
};

describe('the conversion row from the purchase unit to the stock unit', () => {
  it('finds the row that the Grocy trigger created', () => {
    expect(purchaseToStockRowOf([TRIGGER_ROW], UNITS)).toEqual(TRIGGER_ROW);
  });

  it('ignores a row in the other direction', () => {
    const reverse = {
      factor: 1,
      fromQuantityUnitId: 2,
      id: 8,
      toQuantityUnitId: 3,
    };

    expect(purchaseToStockRowOf([reverse, TRIGGER_ROW], UNITS)).toEqual(
      TRIGGER_ROW,
    );
    expect(purchaseToStockRowOf([reverse], UNITS)).toBeNull();
  });

  it('returns null when the product has no row for the pair', () => {
    expect(purchaseToStockRowOf([], UNITS)).toBeNull();
  });
});
