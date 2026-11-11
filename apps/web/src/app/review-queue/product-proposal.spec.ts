import {
  proposeProduct,
  proposePurchaseUnit,
  proposeStockUnit,
} from './product-proposal';

const CAN = { id: 1, name: 'Can' };
const PACK = { id: 2, name: 'Pack' };
const GRAM = { id: 4, name: 'Gram' };
const KILOGRAM = { id: 5, name: 'kg' };
const LITRE = { id: 6, name: 'Litre' };
const BOTTLE = { id: 7, name: 'Bottle' };
const BAG = { id: 9, name: 'Bag' };

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

  // 1 Bag = 500 g, and the lookup gives the net quantity 1000 g. Thus the
  // proposal is the Bag with the net quantity 2.
  it('proposes a household unit with a household conversion to a unit that matches the net quantity unit', () => {
    const bagToGram = {
      factor: 500,
      fromQuantityUnitId: 9,
      toQuantityUnitId: 4,
    };

    expect(proposeStockUnit(1000, 'g', [CAN, BAG, GRAM], [bagToGram])).toEqual({
      amount: 2,
      unitId: 9,
    });
  });

  // 1 g = 0.004 Bag, so 1 Bag = 250 g. The net quantity 500 g is 2 Bags.
  it('proposes the household unit of a household conversion in the other direction', () => {
    const gramToBag = {
      factor: 0.004,
      fromQuantityUnitId: 4,
      toQuantityUnitId: 9,
    };

    expect(proposeStockUnit(500, 'g', [GRAM, BAG], [gramToBag])).toEqual({
      amount: 2,
      unitId: 9,
    });
  });

  // 1 Bag = 0.5 kg. The net quantity 1000 g is 1 kg, so 2 Bags.
  it('converts the net quantity through a unit of the name list for kg', () => {
    const bagToKilogram = {
      factor: 0.5,
      fromQuantityUnitId: 9,
      toQuantityUnitId: 5,
    };

    expect(
      proposeStockUnit(1000, 'g', [KILOGRAM, BAG], [bagToKilogram]),
    ).toEqual({ amount: 2, unitId: 9 });
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

describe('the purchase unit proposal of the short product form', () => {
  it('proposes the household unit of the package word on the label', () => {
    expect(proposePurchaseUnit('750 ml bottle', [PACK, BOTTLE])).toBe(7);
    expect(proposePurchaseUnit('6 x 330 ml cans', [PACK, CAN])).toBe(1);
  });

  it('proposes the pack when the label names no package', () => {
    expect(proposePurchaseUnit('415g', [CAN, PACK])).toBe(2);
    expect(proposePurchaseUnit(null, [CAN, PACK])).toBe(2);
  });

  it('proposes nothing when the household has no unit of the package list', () => {
    expect(proposePurchaseUnit('415g', [CAN, GRAM])).toBeNull();
    expect(proposePurchaseUnit('415g', undefined)).toBeNull();
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

  it('proposes the name, the description, the units, and the factor from the lookup result', () => {
    expect(
      proposeProduct({ lookupResult, writeInName: null }, units, []),
    ).toEqual({
      description: 'H J Heinz Foods UK Ltd, 415g',
      name: 'Beanz in a rich tomato sauce',
      purchaseToStockFactor: 415,
      purchaseUnitId: 2,
      stockUnitId: 4,
    });
  });

  it('proposes the unit of a household conversion as the stock unit, with the factor from the converted net quantity', () => {
    const bagLookup = {
      ...lookupResult,
      netQuantity: 1000,
      quantityText: '1 kg bag',
    };
    const bagToGram = {
      factor: 500,
      fromQuantityUnitId: 9,
      toQuantityUnitId: 4,
    };

    expect(
      proposeProduct(
        { lookupResult: bagLookup, writeInName: null },
        [CAN, PACK, GRAM, BAG],
        [bagToGram],
      ),
    ).toMatchObject({
      purchaseToStockFactor: 2,
      purchaseUnitId: 9,
      stockUnitId: 9,
    });
  });

  it('takes the write-in name as the product name', () => {
    expect(
      proposeProduct({ lookupResult, writeInName: 'Baked beans' }, units, []),
    ).toMatchObject({ name: 'Baked beans' });
  });

  it('proposes no unit and the factor one when the stock unit has no match', () => {
    expect(
      proposeProduct({ lookupResult, writeInName: null }, [CAN, PACK], []),
    ).toEqual({
      description: 'H J Heinz Foods UK Ltd, 415g',
      name: 'Beanz in a rich tomato sauce',
      purchaseToStockFactor: 1,
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
      purchaseToStockFactor: 1,
      purchaseUnitId: null,
      stockUnitId: null,
    });
  });
});
