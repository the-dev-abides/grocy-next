import {
  proposeFactor,
  proposeProduct,
  proposeStockUnit,
} from './product-proposal';

const CAN = { id: 1, name: 'Can' };
const PACK = { id: 2, name: 'Pack' };
const GRAM = { id: 4, name: 'Gram' };
const KILOGRAM = { id: 5, name: 'kg' };
const LITRE = { id: 6, name: 'Litre' };
const BAG = { id: 9, name: 'Bag' };
const OUNCE = { id: 10, name: 'Ounce' };

describe('the stock unit proposal of the short product form', () => {
  it('proposes the household unit whose name matches g, with the net quantity', () => {
    expect(proposeStockUnit(415, 'g', [CAN, PACK, GRAM, KILOGRAM], [])).toEqual(
      {
        amount: 415,
        unitId: 4,
      },
    );
  });

  it('proposes the household unit whose name matches ml, case ignored', () => {
    expect(
      proposeStockUnit(330, 'ml', [CAN, { id: 8, name: 'MILLILITRE' }], []),
    ).toEqual({ amount: 330, unitId: 8 });
  });

  it('proposes a household unit with a conversion to the net quantity unit, with the net quantity converted', () => {
    expect(proposeStockUnit(400, 'g', [CAN, KILOGRAM], [])).toEqual({
      amount: 0.4,
      unitId: 5,
    });
    expect(proposeStockUnit(750, 'ml', [LITRE], [])).toEqual({
      amount: 0.75,
      unitId: 6,
    });
  });

  // The household of the bug report: Gram, Kilogram, and Ounce, with the
  // household conversion 1 Ounce = 28.349523125 Gram. The name match comes
  // first, so the proposal is the Gram and not the Ounce.
  it('takes the household unit whose name matches g before a household unit with a household conversion to g', () => {
    const ounceToGram = {
      factor: 28.349523125,
      fromQuantityUnitId: 10,
      toQuantityUnitId: 4,
    };

    expect(
      proposeStockUnit(4450, 'g', [OUNCE, GRAM, KILOGRAM], [ounceToGram]),
    ).toEqual({ amount: 4450, unitId: 4 });
  });

  // A household conversion between two units of the name list, such as
  // 1 kg = 1000 g, does not move the proposal from the gram to the kg.
  it('keeps the name match when a household conversion joins two units of the name list', () => {
    const kilogramToGram = {
      factor: 1000,
      fromQuantityUnitId: 5,
      toQuantityUnitId: 4,
    };

    expect(
      proposeStockUnit(415, 'g', [GRAM, KILOGRAM], [kilogramToGram]),
    ).toEqual({ amount: 415, unitId: 4 });
  });

  it('ignores a household conversion to a unit that does not match the net quantity unit', () => {
    const bagToCan = { factor: 6, fromQuantityUnitId: 9, toQuantityUnitId: 1 };

    expect(proposeStockUnit(415, 'g', [CAN, BAG, GRAM], [bagToCan])).toEqual({
      amount: 415,
      unitId: 4,
    });
  });

  it('proposes nothing when no household unit matches', () => {
    expect(proposeStockUnit(415, 'g', [CAN, PACK], [])).toBeNull();
  });

  it('proposes the name match while the household conversions have not loaded', () => {
    expect(proposeStockUnit(415, 'g', [CAN, GRAM], undefined)).toEqual({
      amount: 415,
      unitId: 4,
    });
  });

  it('proposes nothing when the lookup has no net quantity, no unit, or a unit outside g and ml', () => {
    expect(proposeStockUnit(null, 'g', [GRAM], [])).toBeNull();
    expect(proposeStockUnit(415, null, [GRAM], [])).toBeNull();
    expect(proposeStockUnit(2, 'pcs', [GRAM], [])).toBeNull();
    expect(proposeStockUnit(415, 'g', undefined, [])).toBeNull();
  });
});

describe('the proposal of the short product form', () => {
  const lookupResult = {
    brand: 'H J Heinz Foods UK Ltd',
    imageUrl: null,
    name: 'Beanz in a rich tomato sauce',
    netQuantity: 415,
    netQuantityUnit: 'g',
    quantityText: '415g',
    service: 'Open Food Facts',
    sourceUrl: 'https://world.openfoodfacts.org/product/5000157024671',
  };
  const units = [CAN, PACK, GRAM];

  it('proposes the name, the description, and the units from the lookup result', () => {
    expect(
      proposeProduct({ lookupResult, writeInName: null }, units, []),
    ).toEqual({
      description: 'H J Heinz Foods UK Ltd, 415g',
      name: 'Beanz in a rich tomato sauce',
      purchaseUnitId: 2,
      stockUnitId: 4,
    });
  });

  it('takes the write-in name as the product name', () => {
    expect(
      proposeProduct({ lookupResult, writeInName: 'Baked beans' }, units, []),
    ).toMatchObject({ name: 'Baked beans' });
  });

  it('proposes no unit when the stock unit has no match', () => {
    expect(
      proposeProduct({ lookupResult, writeInName: null }, [CAN, PACK], []),
    ).toEqual({
      description: 'H J Heinz Foods UK Ltd, 415g',
      name: 'Beanz in a rich tomato sauce',
      purchaseUnitId: null,
      stockUnitId: null,
    });
  });

  it('proposes the write-in name alone for a row with no lookup result', () => {
    expect(
      proposeProduct(
        { lookupResult: null, writeInName: 'Oat milk' },
        units,
        [],
      ),
    ).toEqual({
      description: '',
      name: 'Oat milk',
      purchaseUnitId: null,
      stockUnitId: null,
    });
  });
});

describe('the factor proposal of the short product form', () => {
  const oats = {
    brand: null,
    imageUrl: null,
    name: 'Whole grain rolled oats',
    netQuantity: 4450,
    netQuantityUnit: 'g',
    quantityText: '4.45kg',
    service: 'Open Food Facts',
    sourceUrl: 'https://world.openfoodfacts.org/product/196633911698',
  };
  const units = [PACK, GRAM, KILOGRAM, BAG];

  it('is the net quantity in the stock unit for a package as the purchase unit', () => {
    expect(
      proposeFactor(oats, { purchaseUnitId: 9, stockUnitId: 4 }, units, []),
    ).toBe(4450);
    expect(
      proposeFactor(oats, { purchaseUnitId: 9, stockUnitId: 5 }, units, []),
    ).toBeCloseTo(4.45, 9);
  });

  // 4450 g is 4450 Gram and 4.45 Kilogram, so one Kilogram is 1000 Gram.
  it('divides by the net quantity in the purchase unit when the purchase unit also measures the net quantity', () => {
    expect(
      proposeFactor(oats, { purchaseUnitId: 5, stockUnitId: 4 }, units, []),
    ).toBe(1000);
  });

  it('is nothing when the stock unit does not measure the net quantity, or the lookup has no net quantity', () => {
    expect(
      proposeFactor(oats, { purchaseUnitId: 9, stockUnitId: 2 }, units, []),
    ).toBeNull();
    expect(
      proposeFactor(
        { ...oats, netQuantity: null },
        { purchaseUnitId: 9, stockUnitId: 4 },
        units,
        [],
      ),
    ).toBeNull();
    expect(
      proposeFactor(null, { purchaseUnitId: 9, stockUnitId: 4 }, units, []),
    ).toBeNull();
  });
});
