import { bodyOf, formOf, requiresFactor, withPatch } from './product-form';

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
    expect(bodyOf({ ...form, name: ' Heinz Beanz 415 g ' }, [])).toEqual({
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
      bodyOf(
        {
          ...form,
          description: ' ',
          productGroupId: 1,
          purchaseUnitId: 4,
        },
        [],
      ),
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
    expect(bodyOf({ ...form, name: ' ' }, [])).toBeNull();
    expect(bodyOf({ ...form, locationId: null }, [])).toBeNull();
    expect(bodyOf({ ...form, stockUnitId: null }, [])).toBeNull();
    expect(bodyOf({ ...form, purchaseUnitId: null }, [])).toBeNull();
  });

  it('is nothing while the factor is not a number above zero, or the due days are not a whole number from -1', () => {
    expect(bodyOf({ ...form, factor: '0' }, [])).toBeNull();
    expect(bodyOf({ ...form, factor: 'two' }, [])).toBeNull();
    expect(bodyOf({ ...form, defaultDueDays: '1.5' }, [])).toBeNull();
    expect(bodyOf({ ...form, defaultDueDays: '-2' }, [])).toBeNull();
    expect(bodyOf({ ...form, defaultDueDays: '-1' }, [])).toMatchObject({
      defaultDueDays: -1,
    });
  });
});

// The household of the bug report: Gram, Kilogram, Ounce, Bag, and Pack, with
// the household conversions 1 Kilogram = 1000 Gram and 1 Ounce =
// 28.349523125 Gram. The lookup is UPC 196633911698: 4.45kg of rolled oats in
// a bag.
const PACK = 2;
const GRAM = 4;
const KILOGRAM = 5;
const OUNCE = 6;
const BAG = 7;

describe('the factor of the short product form in a household with household conversions', () => {
  const lists = {
    quantityUnitConversions: [
      { factor: 1000, fromQuantityUnitId: KILOGRAM, toQuantityUnitId: GRAM },
      {
        factor: 28.349523125,
        fromQuantityUnitId: OUNCE,
        toQuantityUnitId: GRAM,
      },
    ],
    quantityUnits: [
      { id: PACK, name: 'Pack' },
      { id: GRAM, name: 'Gram' },
      { id: KILOGRAM, name: 'Kilogram' },
      { id: OUNCE, name: 'Ounce' },
      { id: BAG, name: 'Bag' },
    ],
  };
  const oats = {
    locationId: 2,
    lookupResult: {
      brand: 'Kirkland Signature',
      imageUrl: null,
      name: 'Whole grain rolled oats',
      netQuantity: 4450,
      netQuantityUnit: 'g',
      packageShapes: ['en:bag'],
      quantityText: '4.45kg',
      service: 'Open Food Facts',
      sourceUrl: 'https://world.openfoodfacts.org/product/196633911698',
    },
    productGroupId: null,
    writeInName: null,
  };
  const form = formOf(oats, lists);

  it('proposes the Gram, the Bag, and the net quantity as the factor', () => {
    expect(form).toMatchObject({
      factor: '4450',
      purchaseUnitId: BAG,
      stockUnitId: GRAM,
    });
    expect(requiresFactor(form, lists.quantityUnitConversions)).toBe(true);
  });

  it('computes the factor again from the net quantity when the user changes the stock unit', () => {
    expect(withPatch(form, { stockUnitId: KILOGRAM }, oats, lists).factor).toBe(
      '4.45',
    );
    expect(
      Number(withPatch(form, { stockUnitId: OUNCE }, oats, lists).factor),
    ).toBeCloseTo(156.969, 3);
  });

  it('needs no factor when the household conversions resolve the pair', () => {
    const changed = withPatch(form, { purchaseUnitId: KILOGRAM }, oats, lists);

    expect(requiresFactor(changed, lists.quantityUnitConversions)).toBe(false);
    expect(bodyOf(changed, lists.quantityUnitConversions)).toEqual({
      defaultDueDays: 0,
      description: 'Kirkland Signature, 4.45kg',
      locationId: 2,
      name: 'Whole grain rolled oats',
      purchaseUnitId: KILOGRAM,
      stockUnitId: GRAM,
    });
  });

  // The bug report: the form proposed the Ounce, and the user changed the
  // units to Gram and Kilogram. The factor of the Ounce must not stay.
  it('drops the old factor when a unit change gives a pair that the household conversions resolve', () => {
    const ounce = withPatch(form, { stockUnitId: OUNCE }, oats, lists);
    const changed = withPatch(
      ounce,
      { purchaseUnitId: KILOGRAM, stockUnitId: GRAM },
      oats,
      lists,
    );

    expect(bodyOf(changed, lists.quantityUnitConversions)).not.toHaveProperty(
      'purchaseToStockFactor',
    );
  });

  it('leaves the factor empty when the net quantity gives no value for the new pair', () => {
    const changed = withPatch(form, { stockUnitId: PACK }, oats, lists);

    expect(changed.factor).toBe('');
    expect(requiresFactor(changed, lists.quantityUnitConversions)).toBe(true);
    expect(bodyOf(changed, lists.quantityUnitConversions)).toBeNull();
  });

  it('keeps the typed factor when the user changes a field that is not a unit', () => {
    const typed = { ...form, factor: '4500' };

    expect(withPatch(typed, { locationId: 1 }, oats, lists).factor).toBe(
      '4500',
    );
  });
});
