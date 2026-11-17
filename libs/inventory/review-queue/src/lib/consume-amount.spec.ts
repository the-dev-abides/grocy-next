import { consumeAmountOf } from './consume-amount.ts';

// The product facts that the rule reads. The quick consume amount is in the
// stock unit 3. The consume unit is 5.
const PRODUCT = { quickConsumeAmount: 0.5, stockUnitId: 3 };
const OFF = { defaultConsumeAmount: 2, useQuickConsumeAmount: false };
const ON = { defaultConsumeAmount: 2, useQuickConsumeAmount: true };
const NO_BARCODE = { amount: null, quantityUnitId: null };

describe('the amount of a new Consume pending scan', () => {
  it('takes the default consume amount in the consume unit when the quick consume amount setting is off', () => {
    expect(consumeAmountOf({}, NO_BARCODE, PRODUCT, OFF)).toEqual({
      amount: 2,
      quantityUnitId: null,
    });
  });

  it('takes the quick consume amount in the stock unit when the setting is on', () => {
    expect(consumeAmountOf({}, NO_BARCODE, PRODUCT, ON)).toEqual({
      amount: 0.5,
      quantityUnitId: 3,
    });
  });

  it('takes the default consume amount for a code with no product when the setting is on', () => {
    expect(consumeAmountOf({}, NO_BARCODE, null, ON)).toEqual({
      amount: 2,
      quantityUnitId: null,
    });
  });

  it('takes the product barcode amount and unit over the settings', () => {
    expect(
      consumeAmountOf({}, { amount: 4, quantityUnitId: 7 }, PRODUCT, ON),
    ).toEqual({ amount: 4, quantityUnitId: 7 });
  });

  it('takes the product barcode unit with the default consume amount', () => {
    expect(
      consumeAmountOf({}, { amount: null, quantityUnitId: 7 }, PRODUCT, OFF),
    ).toEqual({ amount: 2, quantityUnitId: 7 });
  });

  it('takes the amount and the unit of the body over everything', () => {
    expect(
      consumeAmountOf(
        { amount: 6, quantityUnitId: 8 },
        { amount: 4, quantityUnitId: 7 },
        PRODUCT,
        ON,
      ),
    ).toEqual({ amount: 6, quantityUnitId: 8 });
  });
});
