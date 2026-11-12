import { proposePurchaseUnit } from './purchase-unit-proposal';

const CAN = { id: 1, name: 'Can' };
const PACK = { id: 2, name: 'Pack' };
const GRAM = { id: 4, name: 'Gram' };
const BOTTLE = { id: 7, name: 'Bottle' };
const BAG = { id: 9, name: 'Bag' };

describe('the purchase unit proposal of the short product form', () => {
  it('proposes the household unit of the package word on the label', () => {
    expect(proposePurchaseUnit('750 ml bottle', [], [PACK, BOTTLE])).toBe(7);
    expect(proposePurchaseUnit('6 x 330 ml cans', [], [PACK, CAN])).toBe(1);
  });

  // The lookup of UPC 196633911698: the label says 4.45kg, and the
  // packaging of Open Food Facts has the shape en:bag.
  it('proposes the household unit of the package shape when the label names no package', () => {
    expect(proposePurchaseUnit('4.45kg', ['en:bag'], [PACK, BAG])).toBe(9);
  });

  it('takes the package word on the label before the package shape', () => {
    expect(
      proposePurchaseUnit('750 ml bottle', ['en:box'], [BOTTLE, BAG, PACK]),
    ).toBe(7);
  });

  it('proposes the pack when neither the label nor the package shape names a package of the household', () => {
    expect(proposePurchaseUnit('4.45kg', ['en:bag'], [CAN, PACK])).toBe(2);
    expect(proposePurchaseUnit('4.45kg', ['en:film'], [BAG, PACK])).toBe(2);
  });

  it('proposes the pack when the label names no package', () => {
    expect(proposePurchaseUnit('415g', [], [CAN, PACK])).toBe(2);
    expect(proposePurchaseUnit(null, [], [CAN, PACK])).toBe(2);
  });

  it('proposes nothing when the household has no unit of the package list', () => {
    expect(proposePurchaseUnit('415g', [], [CAN, GRAM])).toBeNull();
    expect(proposePurchaseUnit('415g', [], undefined)).toBeNull();
  });
});
