import type { StockEntry } from '../api/next-api';
import type { PlanProduct, PlanRow } from './stock-plan';

import { planOfScan } from './plan-of-scan';
import { planOfRow, plansOf } from './stock-plan';

// The Fridge is 1, the Pantry is 2, and the Freezer is 3.
const FRIDGE = 1;
const PANTRY = 2;
const FREEZER = 3;

function entryOf(fields: Partial<StockEntry> & { id: number }): StockEntry {
  return {
    amount: 1,
    dueDate: '2026-12-01',
    locationId: FRIDGE,
    open: false,
    purchasedDate: '2026-10-01',
    stockId: `stock-${String(fields.id)}`,
    ...fields,
  };
}

// A bottle of milk of 1 l. The stock unit is the Litre, unit 1. The
// Millilitre, unit 2, is 0.001 l. The Fridge is the default consume location.
function productOf(
  entries: StockEntry[],
  fields: Partial<PlanProduct> = {},
): PlanProduct {
  return {
    canBeOpened: true,
    consumeLocationId: FRIDGE,
    consumeUnitId: 1,
    conversions: [
      { factor: 0.001, fromQuantityUnitId: 2, toQuantityUnitId: 1 },
    ],
    stockAmount: entries.reduce((sum, entry) => sum + entry.amount, 0),
    stockEntries: entries,
    stockUnitId: 1,
    tareWeight: null,
    ...fields,
  };
}

function rowOf(fields: Partial<PlanRow> = {}): PlanRow {
  return {
    amount: 0.1,
    bookingType: 'consume',
    error: null,
    id: 1,
    locationId: FRIDGE,
    quantityUnitId: null,
    stockEntryId: null,
    toLocationId: null,
    ...fields,
  };
}

describe('the stock entry lines of a Consume row', () => {
  it('takes a part of the opened pack first, with no open', () => {
    const sealed = entryOf({ dueDate: '2026-11-20', id: 1 });
    const opened = entryOf({ amount: 0.4, id: 2, open: true });
    const plan = planOfRow(rowOf(), productOf([sealed, opened]), 'l');
    expect(plan).toEqual({
      lines: [{ amount: 0.1, entry: opened, kind: 'opened', opensRest: false }],
      missing: 0,
      unit: 'l',
    });
  });

  it('takes a part of a sealed pack and opens the rest', () => {
    const sealed = entryOf({ id: 1 });
    const plan = planOfRow(rowOf(), productOf([sealed]), 'l');
    expect(plan?.lines).toEqual([
      { amount: 0.1, entry: sealed, kind: 'part', opensRest: true },
    ]);
  });

  it('takes a whole pack with no open, then a part of the next pack', () => {
    const first = entryOf({ dueDate: '2026-11-20', id: 1 });
    const second = entryOf({ dueDate: '2026-11-25', id: 2 });
    const plan = planOfRow(
      rowOf({ amount: 1.5 }),
      productOf([second, first]),
      'l',
    );
    expect(plan?.lines).toEqual([
      { amount: 1, entry: first, kind: 'whole', opensRest: false },
      { amount: 0.5, entry: second, kind: 'part', opensRest: true },
    ]);
  });

  it('opens no rest of a product that cannot be opened', () => {
    const sealed = entryOf({ id: 1 });
    const closed = productOf([sealed], { canBeOpened: false });
    expect(planOfRow(rowOf(), closed, 'l')?.lines).toEqual([
      { amount: 0.1, entry: sealed, kind: 'part', opensRest: false },
    ]);
  });

  it('names the amount above the stock at the "from" location as missing', () => {
    const fridge = entryOf({ id: 1 });
    const pantry = entryOf({ id: 2, locationId: PANTRY });
    const plan = planOfRow(
      rowOf({ amount: 3 }),
      productOf([fridge, pantry]),
      'l',
    );
    expect(plan).toEqual({
      lines: [{ amount: 1, entry: fridge, kind: 'whole', opensRest: false }],
      missing: 2,
      unit: 'l',
    });
  });

  it('takes the named stock entry only, from a stock entry Grocycode', () => {
    const first = entryOf({ id: 1 });
    const named = entryOf({ amount: 0.5, id: 2 });
    const plan = planOfRow(
      rowOf({ amount: 0.7, stockEntryId: named.stockId }),
      productOf([first, named]),
      'l',
    );
    expect(plan).toEqual({
      lines: [{ amount: 0.5, entry: named, kind: 'whole', opensRest: false }],
      missing: 0.2,
      unit: 'l',
    });
  });

  it('converts the amount of the row to the stock unit', () => {
    const sealed = entryOf({ id: 1 });
    const plan = planOfRow(
      rowOf({ amount: 250, quantityUnitId: 2 }),
      productOf([sealed]),
      'l',
    );
    expect(plan?.lines[0]?.amount).toBe(0.25);
  });

  it('has no plan for a unit with no conversion to the stock unit', () => {
    const plan = planOfRow(
      rowOf({ quantityUnitId: 9 }),
      productOf([entryOf({ id: 1 })]),
      'l',
    );
    expect(plan).toBeNull();
  });

  it('takes the stock entries in the Grocy consume order', () => {
    const pantry = entryOf({
      dueDate: '2026-11-01',
      id: 1,
      locationId: PANTRY,
    });
    const late = entryOf({ dueDate: '2027-01-01', id: 2 });
    const early = entryOf({
      dueDate: '2026-12-01',
      id: 3,
      purchasedDate: '2026-10-05',
    });
    const earlier = entryOf({
      dueDate: '2026-12-01',
      id: 4,
      purchasedDate: '2026-10-01',
    });
    const opened = entryOf({ dueDate: '2027-02-01', id: 5, open: true });
    const plan = planOfRow(
      rowOf({ amount: 5, locationId: null }),
      productOf([pantry, late, early, earlier, opened]),
      'l',
    );
    expect(plan?.lines.map((line) => line.entry.id)).toEqual([5, 4, 3, 2, 1]);
  });

  it('takes the gross weight of a tare weight product, with no open', () => {
    const jar = entryOf({ amount: 500, id: 1 });
    const product = productOf([jar], { canBeOpened: true, tareWeight: 250 });
    const plan = planOfRow(rowOf({ amount: 700 }), product, 'l');
    expect(plan?.lines).toEqual([
      { amount: 50, entry: jar, kind: 'part', opensRest: false },
    ]);
  });
});

describe('the stock entry lines of a Transfer row', () => {
  it('splits a part of a pack and takes a whole pack', () => {
    const sealed = entryOf({ amount: 2, id: 1 });
    const transfer = rowOf({ bookingType: 'transfer', toLocationId: FREEZER });
    expect(
      planOfRow({ ...transfer, amount: 1 }, productOf([sealed]), 'l')?.lines,
    ).toEqual([{ amount: 1, entry: sealed, kind: 'split', opensRest: false }]);
    expect(
      planOfRow({ ...transfer, amount: 2 }, productOf([sealed]), 'l')?.lines,
    ).toEqual([{ amount: 2, entry: sealed, kind: 'whole', opensRest: false }]);
  });

  it('takes nothing with no "from" location', () => {
    const plan = planOfRow(
      rowOf({ bookingType: 'transfer', locationId: null }),
      productOf([entryOf({ id: 1 })]),
      'l',
    );
    expect(plan).toEqual({ lines: [], missing: 0.1, unit: 'l' });
  });
});

describe('the stock entry lines of the rows of one product', () => {
  it('chains two Consume rows, so the second row sees the stock after the first', () => {
    const opened = entryOf({ amount: 0.2, id: 1, open: true });
    const sealed = entryOf({ id: 2 });
    const product = productOf([sealed, opened]);
    const plans = plansOf(
      [rowOf({ amount: 0.2, id: 7 }), rowOf({ amount: 0.2, id: 8 })],
      product,
      'l',
    );
    expect(plans.get(7)?.lines).toEqual([
      { amount: 0.2, entry: opened, kind: 'whole', opensRest: false },
    ]);
    expect(plans.get(8)?.lines).toEqual([
      { amount: 0.2, entry: sealed, kind: 'part', opensRest: true },
    ]);
  });

  it('sees the opened rest after an older row opened a pack', () => {
    const sealed = entryOf({ id: 1 });
    const plans = plansOf(
      [rowOf({ amount: 0.3, id: 7 }), rowOf({ amount: 0.3, id: 8 })],
      productOf([sealed]),
      'l',
    );
    expect(plans.get(8)?.lines).toEqual([
      {
        amount: 0.3,
        entry: { ...sealed, amount: 0.7, open: true },
        kind: 'opened',
        opensRest: false,
      },
    ]);
  });

  it('sees the stock that an older Transfer row moved away', () => {
    const sealed = entryOf({ amount: 2, id: 1 });
    const plans = plansOf(
      [
        rowOf({
          amount: 1,
          bookingType: 'transfer',
          id: 7,
          toLocationId: FREEZER,
        }),
        rowOf({ amount: 2, id: 8 }),
      ],
      productOf([sealed]),
      'l',
    );
    expect(plans.get(8)).toEqual({
      lines: [
        {
          amount: 1,
          entry: { ...sealed, amount: 1 },
          kind: 'whole',
          opensRest: false,
        },
      ],
      missing: 1,
      unit: 'l',
    });
  });

  it('does not take the stock of an older row with an error', () => {
    const sealed = entryOf({ id: 1 });
    const plans = plansOf(
      [
        rowOf({ amount: 1, error: 'Grocy refused', id: 7 }),
        rowOf({ amount: 1, id: 8 }),
      ],
      productOf([sealed]),
      'l',
    );
    expect(plans.get(8)?.missing).toBe(0);
  });
});

describe('the stock entry lines of one row of the review queue', () => {
  it('chains the rows of the same product by scan time, and skips other products', () => {
    const opened = entryOf({ amount: 0.2, id: 1, open: true });
    const sealed = entryOf({ id: 2 });
    const older = {
      ...rowOf({ amount: 0.2, id: 9 }),
      productId: 1,
      scannedAt: '2026-11-17T08:00:00Z',
    };
    const newer = {
      ...rowOf({ amount: 0.2, id: 3 }),
      productId: 1,
      scannedAt: '2026-11-17T09:00:00Z',
    };
    const other = {
      ...rowOf({ amount: 5, id: 4 }),
      productId: 2,
      scannedAt: '2026-11-17T07:00:00Z',
    };
    const plan = planOfScan(
      newer,
      [newer, older, other],
      productOf([sealed, opened]),
      'l',
    );
    expect(plan?.lines).toEqual([
      { amount: 0.2, entry: sealed, kind: 'part', opensRest: true },
    ]);
  });
});
