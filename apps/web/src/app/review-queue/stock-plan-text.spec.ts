import type { StockEntry } from '../api/next-api';
import type { Plan, PlanLine } from './stock-plan';

import {
  ANY_STOCK_ENTRY,
  lineText,
  missingText,
  openText,
  stockEntryChoices,
  stockEntryText,
} from './stock-plan-text';

const locations = [
  { id: 1, name: 'Fridge' },
  { id: 2, name: 'Pantry' },
];

const sealed: StockEntry = {
  amount: 1,
  dueDate: '2026-11-22',
  id: 11,
  locationId: 1,
  open: false,
  purchasedDate: '2026-10-20',
  stockId: '69131a2b3c619',
};

const opened: StockEntry = {
  ...sealed,
  id: 12,
  open: true,
  stockId: '69131a2b3c73b',
};

function lineOf(fields: Partial<PlanLine>): PlanLine {
  return {
    amount: 0.1,
    entry: sealed,
    kind: 'part',
    opensRest: true,
    ...fields,
  };
}

function planOf(lines: PlanLine[], missing = 0): Plan {
  return { lines, missing, unit: 'l' };
}

const consume = { isTransfer: false, locale: 'en-GB', locations, unit: 'l' };
const transfer = { ...consume, isTransfer: true };

describe('the words of a stock entry line', () => {
  it('says that a part of a new pack opens the rest', () => {
    expect(lineText(lineOf({}), consume)).toBe(
      '0.1 l from a new pack in Fridge, due 22 Nov. Opens the rest.',
    );
  });

  it('names the opened pack', () => {
    const line = lineOf({ entry: opened, kind: 'opened', opensRest: false });
    expect(lineText(line, consume)).toBe(
      '0.1 l from the opened pack in Fridge, due 22 Nov',
    );
  });

  it('names a whole sealed pack', () => {
    const line = lineOf({ amount: 1, kind: 'whole', opensRest: false });
    expect(lineText(line, consume)).toBe(
      '1 l, all of a sealed pack in Fridge, due 22 Nov',
    );
  });

  it('says that the rest of a pack that cannot be opened stays sealed', () => {
    expect(lineText(lineOf({ opensRest: false }), consume)).toBe(
      '0.1 l from a sealed pack in Fridge, due 22 Nov. The rest stays sealed.',
    );
  });

  it('says that Grocy splits the pack of a Transfer of a part', () => {
    const line = lineOf({ kind: 'split', opensRest: false });
    expect(lineText(line, transfer)).toBe(
      '0.1 l of a sealed pack in Fridge, due 22 Nov. Grocy splits the pack.',
    );
  });

  it('names a stock entry with no due date', () => {
    const line = lineOf({ entry: { ...sealed, dueDate: '2999-12-31' } });
    expect(lineText(line, consume)).toBe(
      '0.1 l from a new pack in Fridge, no due date. Opens the rest.',
    );
  });
});

describe('the words of the open on consume on the scan screen', () => {
  it('says "Opens a new pack" when a line opens the rest', () => {
    const plan = planOf([lineOf({})]);
    expect(openText(plan)).toBe('Opens a new pack');
  });

  it('says "From the opened pack" when every line takes an opened pack', () => {
    const line = lineOf({ entry: opened, kind: 'opened', opensRest: false });
    expect(openText(planOf([line]))).toBe('From the opened pack');
  });

  it('says nothing for a whole sealed pack and for no plan', () => {
    const line = lineOf({ kind: 'whole', opensRest: false });
    expect(openText(planOf([line]))).toBeNull();
    expect(openText(null)).toBeNull();
  });
});

describe('the warning of a Consume above the stock', () => {
  it('names the stock that Grocy has', () => {
    const line = lineOf({ amount: 1, kind: 'whole', opensRest: false });
    expect(missingText(planOf([line], 2))).toBe(
      'Grocy has only 1 l for this Consume. The accept fails.',
    );
  });

  it('says nothing when the stock is enough', () => {
    const plan = planOf([lineOf({})]);
    expect(missingText(plan)).toBeNull();
  });
});

describe('the words of a stock entry in the stock entry select', () => {
  it('writes the amount, the dates, and the open state as Grocy does', () => {
    expect(stockEntryText(opened)).toBe(
      'Amount: 1; Due on 2026-11-22; Bought on 2026-10-20; Opened',
    );
  });
});

describe('the choices of the stock entry select', () => {
  const pantry: StockEntry = { ...sealed, id: 13, locationId: 2, stockId: 'p' };
  const product = {
    consumeLocationId: 1,
    stockEntries: [sealed, pantry, opened],
    subProductStockEntries: [],
  };

  it('lists the stock entries at the "from" location in the Grocy consume order', () => {
    expect(stockEntryChoices(product, 1, null, 'consume')).toEqual([
      { label: 'Next in the Grocy consume order', value: ANY_STOCK_ENTRY },
      {
        label: 'Amount: 1; Due on 2026-11-22; Bought on 2026-10-20; Opened',
        value: opened.stockId,
      },
      {
        label: 'Amount: 1; Due on 2026-11-22; Bought on 2026-10-20; Not opened',
        value: sealed.stockId,
      },
    ]);
  });

  it('keeps the stock entry of the row when the list does not hold it', () => {
    const choices = stockEntryChoices(product, 2, 'gone', 'consume');
    expect(choices.map((choice) => choice.value)).toEqual([
      ANY_STOCK_ENTRY,
      'p',
      'gone',
    ]);
  });

  // The Grocy consume form lists the stock entries of the sub-products of a
  // parent product. The Grocy transfer form lists the own stock entries only.
  it('lists the stock entries of the sub-products on a Consume only', () => {
    const child = { ...sealed, canBeOpened: true, productId: 6, stockId: 'c' };
    const parent = { ...product, subProductStockEntries: [child] };
    const valuesOf = (bookingType: 'consume' | 'transfer') => {
      return stockEntryChoices(parent, 1, null, bookingType).map(
        (choice) => choice.value,
      );
    };
    expect(valuesOf('consume')).toEqual([
      ANY_STOCK_ENTRY,
      opened.stockId,
      sealed.stockId,
      'c',
    ]);
    expect(valuesOf('transfer')).toEqual([
      ANY_STOCK_ENTRY,
      opened.stockId,
      sealed.stockId,
    ]);
  });
});
