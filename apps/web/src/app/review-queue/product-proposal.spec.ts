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

describe('the stock unit proposal of the short product form', () => {
  it('proposes the household unit whose name matches g, with the net quantity', () => {
    expect(proposeStockUnit(415, 'g', [CAN, PACK, GRAM, KILOGRAM])).toEqual({
      amount: 415,
      unitId: 4,
    });
  });

  it('proposes the household unit whose name matches ml, case ignored', () => {
    expect(
      proposeStockUnit(330, 'ml', [CAN, { id: 8, name: 'MILLILITRE' }]),
    ).toEqual({ amount: 330, unitId: 8 });
  });

  it('proposes a household unit with a conversion to the net quantity unit, with the net quantity converted', () => {
    expect(proposeStockUnit(400, 'g', [CAN, KILOGRAM])).toEqual({
      amount: 0.4,
      unitId: 5,
    });
    expect(proposeStockUnit(750, 'ml', [LITRE])).toEqual({
      amount: 0.75,
      unitId: 6,
    });
  });

  it('proposes nothing when no household unit matches', () => {
    expect(proposeStockUnit(415, 'g', [CAN, PACK])).toBeNull();
  });

  it('proposes nothing when the lookup has no net quantity, no unit, or a unit outside g and ml', () => {
    expect(proposeStockUnit(null, 'g', [GRAM])).toBeNull();
    expect(proposeStockUnit(415, null, [GRAM])).toBeNull();
    expect(proposeStockUnit(2, 'pcs', [GRAM])).toBeNull();
    expect(proposeStockUnit(415, 'g', undefined)).toBeNull();
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
    expect(proposeProduct({ lookupResult, writeInName: null }, units)).toEqual({
      description: 'H J Heinz Foods UK Ltd, 415g',
      name: 'Beanz in a rich tomato sauce',
      purchaseToStockFactor: 415,
      purchaseUnitId: 2,
      stockUnitId: 4,
    });
  });

  it('takes the write-in name as the product name', () => {
    expect(
      proposeProduct({ lookupResult, writeInName: 'Baked beans' }, units),
    ).toMatchObject({ name: 'Baked beans' });
  });

  it('proposes no unit and the factor one when the stock unit has no match', () => {
    expect(
      proposeProduct({ lookupResult, writeInName: null }, [CAN, PACK]),
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
      proposeProduct({ lookupResult: null, writeInName: 'Oat milk' }, units),
    ).toEqual({
      description: '',
      name: 'Oat milk',
      purchaseToStockFactor: 1,
      purchaseUnitId: null,
      stockUnitId: null,
    });
  });
});
