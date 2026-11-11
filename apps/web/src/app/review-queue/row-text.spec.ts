import { amountText, bookingTypeLabel, rowName, unitOf } from './row-text';

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

describe('the name of a review queue row', () => {
  const products = [{ id: 1, name: 'Coca-Cola Original 330 ml' }];
  const lookupResult = {
    brand: 'Ferrero',
    imageUrl: null,
    name: 'Nutella',
    netQuantity: 400,
    netQuantityUnit: 'g',
    quantityText: '400 g',
    service: 'Open Food Facts',
    sourceUrl: 'https://world.openfoodfacts.org/product/3017620422003',
  };

  it('is the product name when the row has a product', () => {
    expect(
      rowName(
        {
          code: '5449000000996',
          lookupResult: null,
          productId: 1,
          writeInName: null,
        },
        products,
      ),
    ).toBe('Coca-Cola Original 330 ml');
  });

  it('is the write-in name, then the lookup name, then the bare code', () => {
    expect(
      rowName(
        {
          code: '3017620422003',
          lookupResult,
          productId: null,
          writeInName: 'Hazelnut spread',
        },
        products,
      ),
    ).toBe('Hazelnut spread');
    expect(
      rowName(
        {
          code: '3017620422003',
          lookupResult,
          productId: null,
          writeInName: null,
        },
        products,
      ),
    ).toBe('Nutella');
    expect(
      rowName(
        {
          code: '4011',
          lookupResult: null,
          productId: null,
          writeInName: null,
        },
        products,
      ),
    ).toBe('4011');
  });
});
