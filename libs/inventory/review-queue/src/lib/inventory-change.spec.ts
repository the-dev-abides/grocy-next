import { isNoChange } from './inventory-change.ts';

// The count of an Inventory pending scan is compared with the own stock of
// the product. For a tare weight product the count is a gross weight, so
// the comparison is with the own stock plus the tare weight.
describe('the no-change rule of the Inventory accept', () => {
  const cans = { stockAmount: 6, tareWeight: null };
  const riceJar = { stockAmount: 500, tareWeight: 250 };

  it('treats a count equal to the own stock as no change', () => {
    expect(isNoChange(6, cans)).toBe(true);
  });

  it('treats a count other than the own stock as a change', () => {
    expect(isNoChange(5, cans)).toBe(false);
    expect(isNoChange(7, cans)).toBe(false);
  });

  it('treats a gross weight equal to the own stock plus the tare weight as no change', () => {
    expect(isNoChange(750, riceJar)).toBe(true);
  });

  it('treats a gross weight equal to the own stock of a tare weight product as a change', () => {
    expect(isNoChange(500, riceJar)).toBe(false);
  });
});
