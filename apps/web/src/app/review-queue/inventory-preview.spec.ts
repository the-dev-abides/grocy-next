import type { StockEntry } from '../api/next-api';

import {
  differenceOf,
  differenceText,
  effectText,
  stockLineText,
} from './inventory-preview';

describe('the difference of an Inventory count', () => {
  it('is the count minus the own stock', () => {
    expect(differenceOf(3, { stockAmount: 6, tareWeight: null })).toBe(-3);
    expect(differenceOf(4, { stockAmount: 1, tareWeight: null })).toBe(3);
  });

  it('is zero when the count equals the own stock', () => {
    expect(differenceOf(6, { stockAmount: 6, tareWeight: null })).toBe(0);
  });

  it('takes the tare weight off the gross weight of a tare weight product', () => {
    expect(differenceOf(750, { stockAmount: 500, tareWeight: 250 })).toBe(0);
    expect(differenceOf(700, { stockAmount: 500, tareWeight: 250 })).toBe(-50);
  });

  it('rounds to three decimals, so a decimal count shows no float noise', () => {
    expect(
      differenceText(
        differenceOf(0.3, { stockAmount: 0.1, tareWeight: null }),
        'Litre',
      ),
    ).toBe('+0.2 Litre');
  });
});

describe('the words of the difference', () => {
  it('says no change for a zero difference', () => {
    expect(differenceText(0, 'Can')).toBe('no change');
  });

  it('signs an increase and a decrease with the stock unit', () => {
    expect(differenceText(3, 'Pack')).toBe('+3 Pack');
    expect(differenceText(-3, 'Can')).toBe('-3 Can');
  });
});

const plainProduct = {
  isParent: false,
  stockAmount: 6,
  stockEntries: [{}, {}, {}, {}, {}],
  tareWeight: null,
};

describe('the Grocy stock line of an Inventory row', () => {
  it('names the own stock and the count of the stock entries', () => {
    expect(stockLineText(plainProduct, 'Can')).toBe(
      'In Grocy: 6 Can in 5 stock entries',
    );
  });

  it('names no count of the stock entries for one entry or none', () => {
    expect(
      stockLineText(
        { ...plainProduct, stockAmount: 3, stockEntries: [{}] },
        'Pack',
      ),
    ).toBe('In Grocy: 3 Pack');
  });

  it('says that the count of a parent product is own stock only', () => {
    expect(
      stockLineText(
        { ...plainProduct, isParent: true, stockAmount: 0, stockEntries: [] },
        'Pack',
      ),
    ).toBe('In Grocy: 0 Pack · parent product, own stock only');
  });

  it('says that the count of a tare weight product is a gross weight', () => {
    expect(
      stockLineText(
        {
          ...plainProduct,
          stockAmount: 500,
          stockEntries: [{}],
          tareWeight: 250,
        },
        'Gram',
      ),
    ).toBe('In Grocy: 500 Gram · tare weight 250 Gram, count the gross weight');
  });
});

const locations = [
  { id: 1, name: 'Fridge' },
  { id: 2, name: 'Pantry' },
];

function entry(
  id: number,
  amount: number,
  facts: Partial<StockEntry> = {},
): StockEntry {
  return {
    amount,
    dueDate: '2026-12-01',
    id,
    locationId: 2,
    open: false,
    purchasedDate: '2026-10-01',
    ...facts,
  };
}

// The stock entries of the fixture product 1, in the Grocy consume order.
const colaEntries = [
  entry(11, 2, { dueDate: '2026-12-15', locationId: 1 }),
  entry(12, 1, { dueDate: '2027-01-01', locationId: 1 }),
  entry(14, 1, { dueDate: '2027-02-01', open: true }),
  entry(13, 1),
  entry(15, 1),
];
const cola = {
  locationId: 1,
  stockAmount: 6,
  stockEntries: colaEntries,
  tareWeight: null,
};
const noFacts = { dueDate: null, locationId: null };

describe('the words of what an Inventory accept does', () => {
  it('names the stock entries that a decrease takes from, in the Grocy order', () => {
    expect(effectText({ ...noFacts, amount: 3 }, cola, 'Can', locations)).toBe(
      'Takes 2 Can from the entry due 2026-12-15 at Fridge, 1 Can from the entry due 2027-01-01 at Fridge.',
    );
  });

  it('takes a part of an entry and marks an open entry', () => {
    expect(
      effectText({ ...noFacts, amount: 1.5 }, cola, 'Can', locations),
    ).toBe(
      'Takes 2 Can from the entry due 2026-12-15 at Fridge, 1 Can from the entry due 2027-01-01 at Fridge, 1 Can from the entry due 2027-02-01 at Pantry (open), 0.5 Can from the entry due 2026-12-01 at Pantry.',
    );
  });

  it('names an entry with no due date', () => {
    expect(
      effectText(
        { ...noFacts, amount: 0 },
        {
          ...cola,
          stockAmount: 1,
          stockEntries: [entry(20, 1, { dueDate: null })],
        },
        'Can',
        locations,
      ),
    ).toBe('Takes 1 Can from the entry with no due date at Pantry.');
  });

  it('names the new stock entry of an increase at the location of the row', () => {
    expect(
      effectText(
        { amount: 9, dueDate: '2027-03-01', locationId: 2 },
        cola,
        'Can',
        locations,
      ),
    ).toBe('Adds one stock entry of 3 Can at Pantry, due 2027-03-01.');
  });

  it('names the product defaults of an increase when the row has none', () => {
    expect(effectText({ ...noFacts, amount: 9 }, cola, 'Can', locations)).toBe(
      'Adds one stock entry of 3 Can at Fridge, due the product default.',
    );
  });

  it('says nothing on no change', () => {
    expect(
      effectText({ ...noFacts, amount: 6 }, cola, 'Can', locations),
    ).toBeNull();
  });

  it('says that Grocy refuses a gross weight below the tare weight', () => {
    expect(
      effectText(
        { ...noFacts, amount: 200 },
        { ...cola, stockAmount: 500, tareWeight: 250 },
        'Gram',
        locations,
      ),
    ).toBe('Below the tare weight. Grocy refuses this.');
  });
});
