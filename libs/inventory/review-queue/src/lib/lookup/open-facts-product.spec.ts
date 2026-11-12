import { OPEN_FACTS_FIELDS, toLookupHit } from './open-facts-product.ts';

const SOURCE = {
  fetchedAt: '2026-11-12T10:00:00.000Z',
  service: 'Open Food Facts',
  sourceUrl: 'https://world.openfoodfacts.org/product/196633911698',
};

// The live v3 record of UPC 196633911698, Kirkland Signature whole grain
// rolled oats, with the fields of the lookup result. The field names of Open
// Facts are snake_case, so the record is built from entries.
const OATS_WITHOUT_PACKAGINGS: Record<string, unknown> = Object.fromEntries([
  ['brands', 'Kirkland Signature'],
  ['product_name', 'Whole grain rolled oats'],
  ['product_quantity', 4450],
  ['product_quantity_unit', 'g'],
  ['quantity', '4.45kg'],
]);
const OATS: Record<string, unknown> = {
  ...OATS_WITHOUT_PACKAGINGS,
  packagings: [Object.fromEntries([['shape', { id: 'en:bag' }]])],
};

describe('the lookup result of an Open Facts record', () => {
  it('requests the packagings of the product', () => {
    expect(OPEN_FACTS_FIELDS).toContain('packagings');
  });

  it('holds the package shapes of the packagings', () => {
    expect(toLookupHit(OATS, SOURCE)?.lookupResult).toEqual({
      brand: 'Kirkland Signature',
      imageUrl: null,
      name: 'Whole grain rolled oats',
      netQuantity: 4450,
      netQuantityUnit: 'g',
      packageShapes: ['en:bag'],
      quantityText: '4.45kg',
      service: 'Open Food Facts',
      sourceUrl: 'https://world.openfoodfacts.org/product/196633911698',
    });
  });

  // The v2 read gives the shape as text, and the v3 read as an object with
  // an id. A component with no shape gives no shape.
  it('takes a shape as text or as an object with an id, and skips a component with no shape', () => {
    const record = {
      ...OATS,
      packagings: [
        { shape: 'en:bottle' },
        { material: { id: 'en:plastic' } },
        { shape: { id: 'en:cap' } },
      ],
    };

    expect(toLookupHit(record, SOURCE)?.lookupResult.packageShapes).toEqual([
      'en:bottle',
      'en:cap',
    ]);
  });

  it('holds no package shape when the record has no packagings', () => {
    expect(
      toLookupHit(OATS_WITHOUT_PACKAGINGS, SOURCE)?.lookupResult.packageShapes,
    ).toEqual([]);
  });
});
