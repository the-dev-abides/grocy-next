import { isHouseholdResolved } from './household-conversion';

const GRAM = 4;
const KILOGRAM = 5;
const OUNCE = 6;
const BAG = 7;

const kilogramToGram = {
  factor: 1000,
  fromQuantityUnitId: KILOGRAM,
  toQuantityUnitId: GRAM,
};
const ounceToGram = {
  factor: 28.349523125,
  fromQuantityUnitId: OUNCE,
  toQuantityUnitId: GRAM,
};

describe('whether the household conversions resolve a pair of units', () => {
  it('is true for a household conversion from the one unit to the other', () => {
    expect(isHouseholdResolved(KILOGRAM, GRAM, [kilogramToGram])).toBe(true);
  });

  it('is true for a household conversion in the other direction', () => {
    expect(isHouseholdResolved(GRAM, KILOGRAM, [kilogramToGram])).toBe(true);
  });

  // 1 kg = 1000 g, and 1 oz = 28.349523125 g. Thus the Gram joins the
  // Kilogram and the Ounce.
  it('is true for a chain of household conversions', () => {
    expect(
      isHouseholdResolved(KILOGRAM, OUNCE, [kilogramToGram, ounceToGram]),
    ).toBe(true);
  });

  it('is false when no household conversion joins the two units', () => {
    expect(isHouseholdResolved(BAG, GRAM, [kilogramToGram, ounceToGram])).toBe(
      false,
    );
  });

  it('is false for one unit, and while the household conversions have not loaded', () => {
    expect(isHouseholdResolved(GRAM, GRAM, [kilogramToGram])).toBe(false);
    expect(isHouseholdResolved(KILOGRAM, GRAM, undefined)).toBe(false);
  });
});
