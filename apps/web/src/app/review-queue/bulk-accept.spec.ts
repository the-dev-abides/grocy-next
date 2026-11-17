import {
  acceptConfirmText,
  bulkAcceptPlan,
  rejectConfirmText,
  skippedText,
} from './bulk-accept';

const purchase = {
  amount: 1,
  bookingType: 'purchase' as const,
  error: null,
  id: 1,
  productId: 1,
  toLocationId: null,
};

describe('the plan of Accept all', () => {
  it('books a Purchase row with a product and an Inventory row with a product and a count', () => {
    const inventory = {
      ...purchase,
      amount: 3,
      bookingType: 'inventory' as const,
      id: 2,
    };

    const plan = bulkAcceptPlan([purchase, inventory]);

    expect(plan.bookable.map(({ id }) => id)).toEqual([1, 2]);
    expect(plan.skipped).toEqual([]);
  });

  it('skips a row with no product and an Inventory row with no count', () => {
    const noProduct = { ...purchase, id: 2, productId: null };
    const noCount = {
      ...purchase,
      amount: null,
      bookingType: 'inventory' as const,
      id: 3,
    };

    const plan = bulkAcceptPlan([purchase, noProduct, noCount]);

    expect(plan.bookable.map(({ id }) => id)).toEqual([1]);
    expect(plan.skipped.map(({ id }) => id)).toEqual([2, 3]);
  });

  it('books a Consume row and a Transfer row with a "to" location, and skips a Transfer with no "to" location', () => {
    const consume = { ...purchase, bookingType: 'consume' as const, id: 2 };
    const transfer = {
      ...purchase,
      bookingType: 'transfer' as const,
      id: 3,
      toLocationId: 2,
    };
    const noTo = { ...transfer, id: 4, toLocationId: null };

    const plan = bulkAcceptPlan([consume, transfer, noTo]);

    expect(plan.bookable.map(({ id }) => id)).toEqual([2, 3]);
    expect(plan.skipped.map(({ id }) => id)).toEqual([4]);
  });

  it('books a failed row with a product again', () => {
    const failed = { ...purchase, error: 'Location does not exist' };

    expect(bulkAcceptPlan([failed]).bookable).toEqual([failed]);
  });
});

describe('the words of the bulk actions', () => {
  it('names the count of rows and the count of skipped rows in the accept confirm', () => {
    expect(acceptConfirmText(3, 0)).toBe(
      'One booking per row, 3 rows. A booking can be undone in Grocy.',
    );
    expect(acceptConfirmText(1, 2)).toBe(
      'One booking per row, 1 row. 2 rows have no product, no count, or no "to" location and are skipped. A booking can be undone in Grocy.',
    );
    expect(acceptConfirmText(2, 1)).toBe(
      'One booking per row, 2 rows. 1 row has no product, no count, or no "to" location and is skipped. A booking can be undone in Grocy.',
    );
  });

  it('names the count of rows in the reject confirm', () => {
    expect(rejectConfirmText(1)).toBe(
      '1 pending scan is deleted. The queue keeps no history.',
    );
    expect(rejectConfirmText(4)).toBe(
      '4 pending scans are deleted. The queue keeps no history.',
    );
  });

  it('says why the accept skipped a row', () => {
    const facts = { bookingType: 'inventory' as const, toLocationId: null };
    expect(skippedText({ ...facts, amount: 1, productId: null })).toBe(
      'Skipped. The row has no product.',
    );
    expect(skippedText({ ...facts, amount: null, productId: 1 })).toBe(
      'Skipped. The row has no count.',
    );
    expect(
      skippedText({
        amount: 1,
        bookingType: 'transfer',
        productId: 1,
        toLocationId: null,
      }),
    ).toBe('Skipped. The Transfer has no "to" location.');
  });
});
