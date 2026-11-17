import type { PendingScan, Product } from '../api/next-api';
import type { PlanEntry } from './stock-entries';

import { isSwitchBookingType, type SwitchBookingType } from '../booking-types';
import { emptyUnitIdOf } from './row-text';
import { consumeOrder, entriesOf, isOfSubProduct } from './stock-entries';

// One stock entry that the accept takes from or changes.
// "whole": the accept takes the whole entry.
// "part": a part of a sealed entry, so the open on consume opens the rest.
// "opened": a part of an opened entry.
// "split": a Transfer of a part, which Grocy splits.
export interface PlanLine {
  amount: number;
  entry: PlanEntry;
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
  | 'subProductStockEntries'
  | 'tareWeight'
>;

// Three decimals, so that a decimal amount shows no float noise.
export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// A Consume row or a Transfer row with an amount.
type PlannedRow = PlanRow & { amount: number; bookingType: SwitchBookingType };

// The factor from the unit of the row to the stock unit, or null when the
// product has no resolved conversion between them. The empty unit is the
// unit that `emptyUnitIdOf` gives.
function stockFactorOf(row: PlannedRow, product: PlanProduct): null | number {
  const unitId = row.quantityUnitId ?? emptyUnitIdOf(row.bookingType, product);
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
  row: PlannedRow,
  product: PlanProduct,
  entries: readonly PlanEntry[],
): null | number {
  const factor = stockFactorOf(row, product);
  if (factor === null) {
    return null;
  }
  const amount = row.amount * factor;
  if (product.tareWeight === null || row.bookingType !== 'consume') {
    return round(amount);
  }
  const stock = entries
    .filter((entry) => !isOfSubProduct(entry))
    .reduce((sum, entry) => sum + entry.amount, 0);
  return round(Math.abs(amount - stock - product.tareWeight));
}

// The stock entries that the accept can take, in the Grocy consume order. A
// row that names a stock entry takes that stock entry only. A Consume with no
// "from" location takes from every location. A Transfer with no "from"
// location takes nothing, because Grocy refuses it. A Consume also takes the
// stock entries of the sub-products, as the Grocy consume form does. A
// Transfer takes the own stock entries only, as Grocy transfers them.
function candidatesOf(
  row: PlanRow,
  product: PlanProduct,
  entries: readonly PlanEntry[],
): PlanEntry[] {
  const isAtFrom = (entry: PlanEntry) => {
    return row.locationId === null
      ? row.bookingType === 'consume'
      : entry.locationId === row.locationId;
  };
  return entries
    .filter((entry) => row.bookingType === 'consume' || !isOfSubProduct(entry))
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
  entry: PlanEntry,
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
  const canOpen = isOfSubProduct(entry)
    ? entry.canBeOpened
    : product.canBeOpened && product.tareWeight === null;
  return { amount, entry, kind: 'part', opensRest: canOpen };
}

function isPlanned(row: PlanRow): row is PlannedRow {
  return row.amount !== null && isSwitchBookingType(row.bookingType);
}

// The plan of one Consume or Transfer row on the given stock entries. A row
// of another booking type, a row with no amount, and a row in a unit with no
// conversion to the stock unit have no plan.
export function planOn(
  row: PlanRow,
  product: PlanProduct,
  entries: readonly PlanEntry[],
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
export function entriesAfter(
  row: PlanRow,
  plan: Plan,
  entries: readonly PlanEntry[],
): PlanEntry[] {
  if (row.bookingType === 'transfer' && row.toLocationId === null) {
    return [...entries];
  }
  const after: PlanEntry[] = [];
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
  return planOn(row, product, entriesOf(product), unit);
}
