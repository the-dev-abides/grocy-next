import { canAccept, stateLabel, stateOf } from './row-state';

describe('the state of a review queue row', () => {
  it('is ready for a Purchase row with a product', () => {
    expect(
      stateOf({
        amount: 1,
        bookingType: 'purchase',
        error: null,
        productId: 1,
        toLocationId: null,
      }),
    ).toBe('ready');
  });

  it('is ready for an Inventory row with a product and a count', () => {
    expect(
      stateOf({
        amount: 4,
        bookingType: 'inventory',
        error: null,
        productId: 1,
        toLocationId: null,
      }),
    ).toBe('ready');
  });

  it('needs a count for an Inventory row with a product and no amount', () => {
    expect(
      stateOf({
        amount: null,
        bookingType: 'inventory',
        error: null,
        productId: 1,
        toLocationId: null,
      }),
    ).toBe('needs-count');
  });

  it('needs a product for a row with no product', () => {
    expect(
      stateOf({
        amount: 1,
        bookingType: 'purchase',
        error: null,
        productId: null,
        toLocationId: null,
      }),
    ).toBe('needs-product');
  });

  it('needs a "to" location for a Transfer row with a product and no "to" location', () => {
    expect(
      stateOf({
        amount: 1,
        bookingType: 'transfer',
        error: null,
        productId: 1,
        toLocationId: null,
      }),
    ).toBe('needs-to-location');
  });

  it('is ready for a Transfer row with a "to" location', () => {
    expect(
      stateOf({
        amount: 1,
        bookingType: 'transfer',
        error: null,
        productId: 1,
        toLocationId: 3,
      }),
    ).toBe('ready');
  });

  it('is failed for a row with a Grocy error, whatever else it has', () => {
    expect(
      stateOf({
        amount: 1,
        bookingType: 'purchase',
        error: 'Location does not exist',
        productId: 1,
        toLocationId: null,
      }),
    ).toBe('failed');
  });

  it('allows the accept of a ready row and of a failed row only', () => {
    expect(canAccept('ready')).toBe(true);
    expect(canAccept('failed')).toBe(true);
    expect(canAccept('needs-count')).toBe(false);
    expect(canAccept('needs-product')).toBe(false);
    expect(canAccept('needs-to-location')).toBe(false);
  });

  it('names every state with the words of the spec', () => {
    expect(stateLabel).toEqual({
      failed: 'Accept failed',
      'needs-count': 'Needs a count',
      'needs-product': 'Needs a product',
      'needs-to-location': "Needs a 'to' location",
      ready: 'Ready',
    });
  });
});
