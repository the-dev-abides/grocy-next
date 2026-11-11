import { bodyOf, formOf } from './product-form';

const units = [
  { id: 2, name: 'Pack' },
  { id: 4, name: 'Gram' },
];

const scan = {
  locationId: 2,
  lookupResult: {
    brand: 'H J Heinz Foods UK Ltd',
    imageUrl: null,
    name: 'Beanz in a rich tomato sauce',
    netQuantity: 415,
    netQuantityUnit: 'g',
    quantityText: '415g',
    service: 'Open Food Facts',
    sourceUrl: 'https://world.openfoodfacts.org/product/5000157024671',
  },
  productGroupId: null,
  writeInName: null,
};

describe('the fields of the short product form', () => {
  it('start from the proposals, the location and the product group of the row, and no due days', () => {
    expect(
      formOf(scan, { quantityUnitConversions: [], quantityUnits: units }),
    ).toEqual({
      defaultDueDays: '0',
      description: 'H J Heinz Foods UK Ltd, 415g',
      factor: '415',
      locationId: 2,
      name: 'Beanz in a rich tomato sauce',
      productGroupId: null,
      purchaseUnitId: 2,
      stockUnitId: 4,
    });
  });
});

describe('the body of the product create from the form', () => {
  const form = formOf(scan, {
    quantityUnitConversions: [],
    quantityUnits: units,
  });

  it('holds the required fields, the description, and the factor when the units differ', () => {
    expect(bodyOf({ ...form, name: ' Heinz Beanz 415 g ' })).toEqual({
      defaultDueDays: 0,
      description: 'H J Heinz Foods UK Ltd, 415g',
      locationId: 2,
      name: 'Heinz Beanz 415 g',
      purchaseToStockFactor: 415,
      purchaseUnitId: 2,
      stockUnitId: 4,
    });
  });

  it('leaves out the description and the factor when the description is empty and the units are one unit', () => {
    expect(
      bodyOf({
        ...form,
        description: ' ',
        productGroupId: 1,
        purchaseUnitId: 4,
      }),
    ).toEqual({
      defaultDueDays: 0,
      locationId: 2,
      name: 'Beanz in a rich tomato sauce',
      productGroupId: 1,
      purchaseUnitId: 4,
      stockUnitId: 4,
    });
  });

  it('is nothing while a required field is empty', () => {
    expect(bodyOf({ ...form, name: ' ' })).toBeNull();
    expect(bodyOf({ ...form, locationId: null })).toBeNull();
    expect(bodyOf({ ...form, stockUnitId: null })).toBeNull();
    expect(bodyOf({ ...form, purchaseUnitId: null })).toBeNull();
  });

  it('is nothing while the factor is not a number above zero, or the due days are not a whole number from -1', () => {
    expect(bodyOf({ ...form, factor: '0' })).toBeNull();
    expect(bodyOf({ ...form, factor: 'two' })).toBeNull();
    expect(bodyOf({ ...form, defaultDueDays: '1.5' })).toBeNull();
    expect(bodyOf({ ...form, defaultDueDays: '-2' })).toBeNull();
    expect(bodyOf({ ...form, defaultDueDays: '-1' })).toMatchObject({
      defaultDueDays: -1,
    });
  });
});
