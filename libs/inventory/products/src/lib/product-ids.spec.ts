import { unknownIdOf } from './product-ids.ts';

// The fixture household: the Fridge and the Pantry, the product group
// Dairy, and the Can and the Pack.
const MASTER_DATA = {
  locations: [
    { id: 1, name: 'Fridge' },
    { id: 2, name: 'Pantry' },
  ],
  productGroups: [{ id: 1, name: 'Dairy' }],
  quantityUnits: [
    { id: 1, name: 'Can' },
    { id: 2, name: 'Pack' },
  ],
};

const PRODUCT = {
  defaultDueDays: 0,
  locationId: 1,
  minStockAmount: 0,
  name: 'Milk 1 l',
  productGroupId: 1,
  purchaseToStockFactor: 1,
  purchaseUnitId: 2,
  stockUnitId: 2,
};

describe('the id check of a product create', () => {
  it('passes a product whose ids all name an active row', () => {
    expect(unknownIdOf(PRODUCT, MASTER_DATA)).toBeNull();
  });

  it('passes a product with no product group', () => {
    const { productGroupId, ...product } = PRODUCT;

    expect(productGroupId).toBe(1);
    expect(unknownIdOf(product, MASTER_DATA)).toBeNull();
  });

  it('names the location that no active row has', () => {
    expect(unknownIdOf({ ...PRODUCT, locationId: 4 }, MASTER_DATA)).toBe(
      'No location has the id 4.',
    );
  });

  it('names the product group that no active row has', () => {
    expect(unknownIdOf({ ...PRODUCT, productGroupId: 9 }, MASTER_DATA)).toBe(
      'No product group has the id 9.',
    );
  });

  it('names the stock unit or the purchase unit that no active row has', () => {
    expect(unknownIdOf({ ...PRODUCT, stockUnitId: 9 }, MASTER_DATA)).toBe(
      'No quantity unit has the id 9.',
    );
    expect(unknownIdOf({ ...PRODUCT, purchaseUnitId: 7 }, MASTER_DATA)).toBe(
      'No quantity unit has the id 7.',
    );
  });

  it('names the first unknown id in the order location, product group, units', () => {
    expect(
      unknownIdOf({ ...PRODUCT, locationId: 4, stockUnitId: 9 }, MASTER_DATA),
    ).toBe('No location has the id 4.');
  });
});
