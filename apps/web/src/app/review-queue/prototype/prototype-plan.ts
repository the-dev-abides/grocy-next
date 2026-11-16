// PROTOTYPE. What the accept of a row does to the Grocy stock, as the research
// ticket "Grocy API calls behind consume, open, and transfer" found it and as
// ADR 0017 decided the open on consume. The rows of one product chain: each
// row sees the stock after the older rows.
import {
  type Product,
  productOf,
  type Row,
  type StockEntry,
  stockUnit,
} from './prototype-data';
import { STOCK } from './prototype-rows';

export type StockMap = ReadonlyMap<number, readonly StockEntry[]>;

export function initialStock(): Map<number, StockEntry[]> {
  const map = new Map<number, StockEntry[]>();
  for (const { productId, ...entry } of STOCK) {
    map.set(productId, [...(map.get(productId) ?? []), entry]);
  }
  return map;
}

// One stock entry that the accept takes from or changes. "whole": the accept
// takes the whole entry. "part": a part of a sealed entry, so the open on
// consume opens the rest. "opened": a part of an opened entry. "split": a
// Transfer of a part, which Grocy splits.
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

export function factorOf(product: Product, unit: string): number {
  return product.units.find((item) => item.name === unit)?.factor ?? 1;
}

// The consume order of Grocy: the default consume location first, then
// opened, then the earliest due date.
function consumeOrder(product: Product) {
  const home = (entry: StockEntry) =>
    entry.locationId === product.defaultLocationId ? 0 : 1;
  return (a: StockEntry, b: StockEntry) => {
    return (
      home(a) - home(b) ||
      Number(b.isOpened) - Number(a.isOpened) ||
      a.dueDate.localeCompare(b.dueDate)
    );
  };
}

function candidates(
  row: Row,
  product: Product,
  entries: readonly StockEntry[],
) {
  if (row.stockEntryId !== null) {
    return entries.filter((entry) => entry.id === row.stockEntryId);
  }
  const from =
    row.bookingType === 'transfer'
      ? (row.locationId ?? product.defaultLocationId)
      : row.locationId;
  return entries
    .filter((entry) => from === null || entry.locationId === from)
    .toSorted(consumeOrder(product));
}

function lineOf(
  row: Row,
  product: Product,
  entry: StockEntry,
  take: number,
): PlanLine {
  const isWhole = take >= entry.amount;
  if (row.bookingType === 'transfer') {
    const kind = isWhole ? 'whole' : 'split';
    return { amount: take, entry, kind, opensRest: false };
  }
  if (entry.isOpened) {
    const kind = isWhole ? 'whole' : 'opened';
    return { amount: take, entry, kind, opensRest: false };
  }
  const canOpen = product.tareWeight === null && product.canOpen;
  return {
    amount: take,
    entry,
    kind: isWhole ? 'whole' : 'part',
    opensRest: !isWhole && canOpen,
  };
}

function isMove(row: Row): boolean {
  return row.bookingType === 'consume' || row.bookingType === 'transfer';
}

// The plan of one Consume or Transfer row on the given stock.
export function planOf(row: Row, stock: StockMap): null | Plan {
  const product = productOf(row.productId);
  if (product === undefined || row.amount === null || !isMove(row)) {
    return null;
  }
  const entries = stock.get(product.id) ?? [];
  let left = row.amount * factorOf(product, row.unit);
  const lines: PlanLine[] = [];
  for (const entry of candidates(row, product, entries)) {
    if (left <= 0) {
      break;
    }
    const take = Math.min(left, entry.amount);
    lines.push(lineOf(row, product, entry, take));
    left -= take;
  }
  return { lines, missing: Math.max(0, left), unit: stockUnit(product) };
}

function copyOf(stock: StockMap): Map<number, StockEntry[]> {
  const next = new Map<number, StockEntry[]>();
  for (const [id, list] of stock) {
    next.set(id, [...list]);
  }
  return next;
}

function lastId(stock: StockMap): number {
  let id = 0;
  for (const list of stock.values()) {
    for (const entry of list) {
      id = Math.max(id, entry.id);
    }
  }
  return id;
}

// The entries after a Consume or a Transfer. A Transfer of a part leaves the
// rest and makes a new entry at the "to" location.
function movedEntries(
  row: Row,
  plan: Plan,
  entries: readonly StockEntry[],
  firstId: number,
) {
  let id = firstId;
  const result: StockEntry[] = [];
  for (const entry of entries) {
    const line = plan.lines.find((item) => item.entry.id === entry.id);
    const rest = entry.amount - (line?.amount ?? 0);
    const isMoved = line !== undefined && row.bookingType === 'transfer';
    if (isMoved) {
      id += 1;
      const locationId = row.toLocationId ?? entry.locationId;
      result.push({ ...entry, amount: line.amount, id, locationId });
    }
    const isOpened = entry.isOpened || line?.opensRest === true;
    result.push(...(rest > 0 ? [{ ...entry, amount: rest, isOpened }] : []));
  }
  return result;
}

// The stock after the accept of a row.
export function applyRow(row: Row, stock: StockMap): Map<number, StockEntry[]> {
  const next = copyOf(stock);
  const product = productOf(row.productId);
  if (product === undefined || row.amount === null) {
    return next;
  }
  const entries = next.get(product.id) ?? [];
  if (row.bookingType === 'purchase') {
    next.set(product.id, [
      ...entries,
      {
        amount: row.amount * factorOf(product, row.unit),
        dueDate: row.dueDate ?? '2026-12-31',
        id: lastId(stock) + 1,
        isOpened: false,
        locationId: row.locationId ?? product.defaultLocationId,
      },
    ]);
    return next;
  }
  const plan = planOf(row, stock);
  if (plan !== null) {
    next.set(product.id, movedEntries(row, plan, entries, lastId(stock)));
  }
  return next;
}

// The plans of all rows. The oldest row books first, so each row sees the
// stock after the older rows of the same product.
export function plansOf(
  rows: readonly Row[],
  stock: StockMap,
): Map<number, Plan> {
  const plans = new Map<number, Plan>();
  let current: StockMap = stock;
  for (const item of rows.toReversed()) {
    const plan = planOf(item, current);
    if (plan !== null) {
      plans.set(item.id, plan);
    }
    if (item.error === null) {
      current = applyRow(item, current);
    }
  }
  return plans;
}
