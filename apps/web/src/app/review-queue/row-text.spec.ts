import { amountText, bookingTypeLabel, unitOf } from './row-text';

const quantityUnits = [
  { id: 1, name: 'Can' },
  { id: 2, name: 'Pack' },
  { id: 3, name: 'Box' },
];
const product = { purchaseUnitId: 2, stockAmount: 1, stockUnitId: 2 };

describe('the words of a review queue row', () => {
  it('names the unit of a Purchase row by its quantity unit', () => {
    expect(
      unitOf(
        { bookingType: 'purchase', quantityUnitId: 3 },
        product,
        quantityUnits,
      ),
    ).toBe('Box');
  });

  it('names the purchase unit of the product when the Purchase row has no unit', () => {
    expect(
      unitOf(
        { bookingType: 'purchase', quantityUnitId: null },
        product,
        quantityUnits,
      ),
    ).toBe('Pack');
  });

  it('names the stock unit of the product for an Inventory row', () => {
    expect(
      unitOf(
        { bookingType: 'inventory', quantityUnitId: 3 },
        product,
        quantityUnits,
      ),
    ).toBe('Pack');
  });

  it('names no unit while the product read has not answered', () => {
    expect(
      unitOf(
        { bookingType: 'purchase', quantityUnitId: null },
        undefined,
        quantityUnits,
      ),
    ).toBe('');
  });

  it('writes the amount with its unit', () => {
    expect(
      amountText(
        { amount: 2, bookingType: 'purchase', quantityUnitId: 3 },
        product,
        quantityUnits,
      ),
    ).toBe('2 Box');
  });

  it('writes the Grocy stock as the placeholder of an Inventory row with no count', () => {
    expect(
      amountText(
        { amount: null, bookingType: 'inventory', quantityUnitId: null },
        { ...product, stockAmount: 6, stockUnitId: 1 },
        quantityUnits,
      ),
    ).toBe('— (6 Can now)');
  });

  it('writes a dash for a row with no amount and no product', () => {
    expect(
      amountText(
        { amount: null, bookingType: 'purchase', quantityUnitId: null },
        undefined,
        quantityUnits,
      ),
    ).toBe('—');
  });

  it('names the booking type', () => {
    expect(bookingTypeLabel.purchase).toBe('Purchase');
    expect(bookingTypeLabel.inventory).toBe('Inventory');
  });
});
