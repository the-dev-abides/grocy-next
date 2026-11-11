import type { Booking } from '../api/next-api';
import {
  bookingText,
  failureText,
  isGrocyRefused,
  summaryText,
} from './result-text';

const locations = [
  { id: 1, name: 'Fridge' },
  { id: 2, name: 'Pantry' },
];

function booking(rows: Booking['bookings']): Booking {
  return {
    bookingType: 'purchase',
    bookings: rows,
    pendingScanId: 7,
    productId: 1,
    transactionId: rows.length === 0 ? null : '69131a2b3c4e6',
  };
}

const row: Booking['bookings'][number] = {
  amount: 1,
  dueDate: '2027-01-01',
  id: 101,
  locationId: 1,
  note: null,
  price: 0.85,
  purchasedDate: '2026-11-10',
  stockEntryId: null,
  storeId: null,
  transactionType: 'purchase',
};

describe('the result line of an accept', () => {
  it('writes the booking facts that Grocy stored, in the stock unit', () => {
    expect(bookingText(booking([row]), 'Can', locations)).toBe(
      'Booked 1 Can at Fridge, due 2027-01-01, price 0.85 per Can, purchase.',
    );
  });

  it('writes the words for no location, no due date, and no price', () => {
    expect(
      bookingText(
        booking([{ ...row, dueDate: null, locationId: null, price: null }]),
        'Can',
        locations,
      ),
    ).toBe(
      'Booked 1 Can at the product default location, due the product default, no price, purchase.',
    );
  });

  it('writes one sentence per stock log row', () => {
    expect(
      bookingText(
        booking([
          { ...row, amount: -2, transactionType: 'inventory-correction' },
          { ...row, amount: -1, id: 102, locationId: 2 },
        ]),
        'Can',
        locations,
      ),
    ).toBe(
      'Booked -2 Can at Fridge, due 2027-01-01, price 0.85 per Can, inventory-correction. ' +
        'Booked -1 Can at Pantry, due 2027-01-01, price 0.85 per Can, purchase.',
    );
  });

  it('writes no change when Grocy was not called', () => {
    expect(bookingText(booking([]), 'Can', locations)).toBe(
      'No change. Grocy was not called.',
    );
  });
});

describe('the failure line of an accept', () => {
  const problem = {
    data: {
      detail:
        'The product has no conversion from the quantity unit 2 to the stock unit 1.',
      instance: '/api/v2/bookings',
      status: 422,
      title: 'The product has no conversion to the stock unit',
      type: '/problems/no-conversion',
    },
    status: 422,
  };

  it('writes the title and the detail of a problem', () => {
    expect(failureText(problem)).toBe(
      'The product has no conversion to the stock unit. The product has no conversion from the quantity unit 2 to the stock unit 1.',
    );
  });

  it('writes that the API was not reached when the error holds no problem', () => {
    expect(
      failureText({
        error: 'TypeError: Failed to fetch',
        status: 'FETCH_ERROR',
      }),
    ).toBe('The API did not answer.');
    expect(failureText(undefined)).toBe('The API did not answer.');
  });

  it('knows a grocy-refused problem, whose message the row shows', () => {
    expect(
      isGrocyRefused({
        data: { ...problem.data, type: '/problems/grocy-refused' },
        status: 422,
      }),
    ).toBe(true);
    expect(isGrocyRefused(problem)).toBe(false);
    expect(isGrocyRefused(undefined)).toBe(false);
  });
});

describe('the summary of the result panel', () => {
  it('counts the booked rows, the failed rows, and the skipped rows', () => {
    expect(summaryText({ booked: 1, failed: 0, skipped: 0 })).toBe('1 booked');
    expect(summaryText({ booked: 2, failed: 1, skipped: 0 })).toBe(
      '2 booked, 1 failed',
    );
    expect(summaryText({ booked: 0, failed: 1, skipped: 0 })).toBe(
      '0 booked, 1 failed',
    );
    expect(summaryText({ booked: 2, failed: 0, skipped: 3 })).toBe(
      '2 booked, 3 skipped',
    );
    expect(summaryText({ booked: 1, failed: 1, skipped: 1 })).toBe(
      '1 booked, 1 failed, 1 skipped',
    );
  });
});
