import { bookingTypeLabel } from '../booking-types';
import {
  amountText,
  defaultUnitLabel,
  locationText,
  rowName,
  unitOf,
} from './row-text';

const locations = [
  { id: 1, name: 'Fridge' },
  { id: 3, name: 'Freezer' },
];

const quantityUnits = [
  { id: 1, name: 'Can' },
  { id: 2, name: 'Pack' },
  { id: 3, name: 'Box' },
];
const product = {
  consumeUnitId: 1,
  purchaseUnitId: 2,
  stockAmount: 1,
  stockUnitId: 2,
};

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

  // The empty unit of a Consume is the consume unit, as Grocy shows it.
  it('names the consume unit of the product when the Consume row has no unit', () => {
    expect(
      unitOf(
        { bookingType: 'consume', quantityUnitId: null },
        product,
        quantityUnits,
      ),
    ).toBe('Can');
  });

  it('names the stock unit of the product when the Transfer row has no unit', () => {
    expect(
      unitOf(
        { bookingType: 'transfer', quantityUnitId: null },
        { ...product, stockUnitId: 1 },
        quantityUnits,
      ),
    ).toBe('Can');
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

  // The unit select of the row form names the default unit of the booking
  // type, with the unit of the product when the product read has answered.
  it('names the default unit of each booking type in the unit select', () => {
    expect(defaultUnitLabel('purchase', product, quantityUnits)).toBe(
      'Purchase unit (Pack)',
    );
    expect(defaultUnitLabel('consume', product, quantityUnits)).toBe(
      'Consume unit (Can)',
    );
    expect(defaultUnitLabel('transfer', undefined, quantityUnits)).toBe(
      'Stock unit',
    );
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

describe('the location of a review queue row', () => {
  it('is the location of a Consume row', () => {
    expect(
      locationText(
        { bookingType: 'consume', locationId: 1, toLocationId: null },
        locations,
      ),
    ).toBe('Fridge');
  });

  it('is "From → To" on a Transfer row', () => {
    expect(
      locationText(
        { bookingType: 'transfer', locationId: 1, toLocationId: 3 },
        locations,
      ),
    ).toBe('Fridge → Freezer');
  });

  it('names the missing "to" location of a Transfer row', () => {
    expect(
      locationText(
        { bookingType: 'transfer', locationId: 1, toLocationId: null },
        locations,
      ),
    ).toBe('Fridge → No "to" location');
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
