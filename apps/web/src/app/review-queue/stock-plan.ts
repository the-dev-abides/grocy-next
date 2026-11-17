import type { PendingScan, Product, StockEntry } from '../api/next-api';

// One stock entry that the accept takes from or changes.
// "whole": the accept takes the whole entry.
// "part": a part of a sealed entry, so the open on consume opens the rest.
// "opened": a part of an opened entry.
// "split": a Transfer of a part, which Grocy splits.
export interface PlanLine {
  amount: number;
  entry: StockEntry;
  kind: 'opened' | 'part' | 'split' | 'whole';
  opensRest: boolean;
}

// `missing` is the amount above the stock. The server refuses the accept.
export interface Plan {
  lines: PlanLine[];
  missing: number;
  unit: string;
}

// The facts of a row that the stock entry lines need.
export type PlanRow = Pick<
  PendingScan,
  | 'amount'
  | 'bookingType'
  | 'error'
  | 'id'
  | 'locationId'
  | 'quantityUnitId'
  | 'stockEntryId'
  | 'toLocationId'
>;

// The facts of the product read that the stock entry lines need.
export type PlanProduct = Pick<
  Product,
  | 'canBeOpened'
  | 'consumeLocationId'
  | 'consumeUnitId'
  | 'conversions'
  | 'stockAmount'
  | 'stockEntries'
  | 'stockUnitId'
  | 'tareWeight'
>;

// Grocy stores the due date 2999-12-31 for a stock entry with no due date.
const NO_DUE_DATE = '2999-12-31';

// Three decimals, so that a decimal amount shows no float noise.
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function dueOf(entry: StockEntry): string {
  return entry.dueDate ?? NO_DUE_DATE;
}

function boughtOf(entry: StockEntry): string {
  return entry.purchasedDate ?? NO_DUE_DATE;
}

// The Grocy consume order of the view `stock_next_use` (Grocy 4.7.1,
// migration 0200): the stock entries at the default consume location first,
// then the opened entries, then the earliest due date, then the earliest
// purchase date. The sort is stable, so equal entries keep the Grocy order.
function consumeOrder(
  consumeLocationId: null | number,
): (first: StockEntry, second: StockEntry) => number {
  const home = (entry: StockEntry) =>
    entry.locationId === consumeLocationId ? 0 : 1;
  return (first, second) => {
    return (
      home(first) - home(second) ||
      Number(second.open) - Number(first.open) ||
      dueOf(first).localeCompare(dueOf(second)) ||
      boughtOf(first).localeCompare(boughtOf(second))
    );
  };
}

// The factor from the unit of the row to the stock unit, or null when the
// product has no resolved conversion between them. The empty unit is the
// consume unit on a Consume and the stock unit on a Transfer.
function stockFactorOf(row: PlanRow, product: PlanProduct): null | number {
  const unitId =
    row.quantityUnitId ??
    (row.bookingType === 'consume'
      ? product.consumeUnitId
      : product.stockUnitId);
  if (unitId === product.stockUnitId) {
    return 1;
  }
  const conversion = product.conversions.find((item) => {
    return (
      item.fromQuantityUnitId === unitId &&
      item.toQuantityUnitId === product.stockUnitId
    );
  });
  return conversion?.factor ?? null;
}

// The amount that the accept takes, in the stock unit. The amount of a tare
// weight product is the gross weight, so Grocy takes the difference to the
// stock plus the tare weight.
function takenAmountOf(
  row: PlanRow & { amount: number },
  product: PlanProduct,
  entries: readonly StockEntry[],
): null | number {
  const factor = stockFactorOf(row, product);
  if (factor === null) {
    return null;
  }
  const amount = row.amount * factor;
  if (product.tareWeight === null || row.bookingType !== 'consume') {
    return round(amount);
  }
  const stock = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return round(Math.abs(amount - stock - product.tareWeight));
}

// The stock entries that the accept can take, in the Grocy consume order. A
// row that names a stock entry takes that stock entry only. A Consume with no
// "from" location takes from every location. A Transfer with no "from"
// location takes nothing, because Grocy refuses it.
function candidatesOf(
  row: PlanRow,
  product: PlanProduct,
  entries: readonly StockEntry[],
): StockEntry[] {
  const isAtFrom = (entry: StockEntry) => {
    return row.locationId === null
      ? row.bookingType === 'consume'
      : entry.locationId === row.locationId;
  };
  return entries
    .filter((entry) => isAtFrom(entry))
    .filter(
      (entry) =>
        row.stockEntryId === null || entry.stockId === row.stockEntryId,
    )
    .toSorted(consumeOrder(product.consumeLocationId));
}

function lineOf(
  row: PlanRow,
  product: PlanProduct,
  entry: StockEntry,
  amount: number,
): PlanLine {
  const isWhole = amount >= entry.amount;
  if (row.bookingType === 'transfer') {
    return {
      amount,
      entry,
      kind: isWhole ? 'whole' : 'split',
      opensRest: false,
    };
  }
  if (isWhole) {
    return { amount, entry, kind: 'whole', opensRest: false };
  }
  if (entry.open) {
    return { amount, entry, kind: 'opened', opensRest: false };
  }
  const canOpen = product.canBeOpened && product.tareWeight === null;
  return { amount, entry, kind: 'part', opensRest: canOpen };
}

function isPlanned(
  row: PlanRow,
): row is PlanRow & { amount: number; bookingType: 'consume' | 'transfer' } {
  return (
    row.amount !== null &&
    (row.bookingType === 'consume' || row.bookingType === 'transfer')
  );
}

// The plan of one Consume or Transfer row on the given stock entries. A row
// of another booking type, a row with no amount, and a row in a unit with no
// conversion to the stock unit have no plan.
function planOn(
  row: PlanRow,
  product: PlanProduct,
  entries: readonly StockEntry[],
  unit: string,
): null | Plan {
  if (!isPlanned(row)) {
    return null;
  }
  const amount = takenAmountOf(row, product, entries);
  if (amount === null) {
    return null;
  }
  let left = amount;
  const lines: PlanLine[] = [];
  for (const entry of candidatesOf(row, product, entries)) {
    if (left <= 0) {
      break;
    }
    const take = round(Math.min(left, entry.amount));
    lines.push(lineOf(row, product, entry, take));
    left = round(left - take);
  }
  return { lines, missing: Math.max(0, left), unit };
}

// The stock entries after the accept of a row. A Consume takes the amount of
// each line, and the rest of a line that opens the rest is open. A Transfer
// moves the amount of each line to the "to" location. A Transfer with no "to"
// location cannot book, so it changes nothing.
function entriesAfter(
  row: PlanRow,
  plan: Plan,
  entries: readonly StockEntry[],
): StockEntry[] {
  if (row.bookingType === 'transfer' && row.toLocationId === null) {
    return [...entries];
  }
  const after: StockEntry[] = [];
  for (const entry of entries) {
    const line = plan.lines.find((item) => item.entry === entry);
    if (line === undefined) {
      after.push(entry);
      continue;
    }
    const rest = round(entry.amount - line.amount);
    if (row.bookingType === 'transfer') {
      after.push({
        ...entry,
        amount: line.amount,
        locationId: row.toLocationId,
      });
    }
    if (rest > 0) {
      after.push({
        ...entry,
        amount: rest,
        open: entry.open || line.opensRest,
      });
    }
  }
  return after;
}

// The plan of one Consume or Transfer row on the stock entries of the product
// read.
export function planOfRow(
  row: PlanRow,
  product: PlanProduct,
  unit: string,
): null | Plan {
  return planOn(row, product, product.stockEntries, unit);
}

// The plans of the rows of one product, oldest first. Each row sees the stock
// after the older rows, so two rows do not show the same pack twice. A row
// with an error did not book, so it changes no stock. The unit is the name of
// the stock unit.
export function plansOf(
  rows: readonly PlanRow[],
  product: PlanProduct,
  unit: string,
): Map<number, Plan> {
  const plans = new Map<number, Plan>();
  let entries: readonly StockEntry[] = product.stockEntries;
  for (const row of rows) {
    const plan = planOn(row, product, entries, unit);
    if (plan === null) {
      continue;
    }
    plans.set(row.id, plan);
    if (row.error === null) {
      entries = entriesAfter(row, plan, entries);
    }
  }
  return plans;
}
