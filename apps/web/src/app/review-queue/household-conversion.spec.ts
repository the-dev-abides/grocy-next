import { householdFactorOf } from './household-conversion';

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

describe('the factor between two units through the household conversions', () => {
  it('is the factor of a household conversion from the one unit to the other', () => {
    expect(householdFactorOf(KILOGRAM, GRAM, [kilogramToGram])).toBe(1000);
  });

  it('is the inverse factor of a household conversion in the other direction', () => {
    expect(householdFactorOf(GRAM, KILOGRAM, [kilogramToGram])).toBeCloseTo(
      0.001,
      9,
    );
  });

  // 1 kg = 1000 g, and 1 g = 1 / 28.349523125 oz. Thus 1 kg is about
  // 35.274 oz.
  it('follows a chain of household conversions', () => {
    expect(
      householdFactorOf(KILOGRAM, OUNCE, [kilogramToGram, ounceToGram]),
    ).toBeCloseTo(35.274, 3);
  });

  it('is nothing when no household conversion joins the two units', () => {
    expect(
      householdFactorOf(BAG, GRAM, [kilogramToGram, ounceToGram]),
    ).toBeNull();
  });

  it('is nothing for one unit, and while the household conversions have not loaded', () => {
    expect(householdFactorOf(GRAM, GRAM, [kilogramToGram])).toBeNull();
    expect(householdFactorOf(KILOGRAM, GRAM, undefined)).toBeNull();
  });
});
