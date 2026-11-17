import { fromLocationOf } from './from-location.ts';

// The Fridge is 1, the Pantry is 2, the Freezer is 3. The stock entries are in
// the Grocy consume order.
const PANTRY_THEN_FREEZER = [
  { amount: 1, locationId: 2 },
  { amount: 2, locationId: 3 },
];

describe('the "from" location of a new Consume or Transfer pending scan', () => {
  it('takes the first default that has stock', () => {
    expect(fromLocationOf([1, 3], PANTRY_THEN_FREEZER)).toBe(3);
  });

  it('takes the first location with stock when no default has stock', () => {
    expect(fromLocationOf([1], PANTRY_THEN_FREEZER)).toBe(2);
  });

  it('skips an empty default', () => {
    expect(fromLocationOf([null, 3], PANTRY_THEN_FREEZER)).toBe(3);
  });

  it('takes the first default when the product has no stock', () => {
    expect(fromLocationOf([null, 1], [])).toBe(1);
  });

  it('gives no location when the product has no stock and no default', () => {
    expect(fromLocationOf([null], [])).toBeNull();
  });
});
