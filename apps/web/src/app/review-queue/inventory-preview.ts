import type { PendingScan, Product, StockEntry } from '../api/next-api';

import { nameOf } from '../scan/scan-text';

interface Named {
  id: number;
  name: string;
}

// Three decimals, so that a decimal count shows no float noise.
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// The difference that an Inventory accept books: the count minus the own
// stock. The count of a tare weight product is a gross weight, so the tare
// weight comes off first.
export function differenceOf(
  amount: number,
  product: Pick<Product, 'stockAmount' | 'tareWeight'>,
): number {
  return round(amount - (product.tareWeight ?? 0) - product.stockAmount);
}

// The difference as the row shows it: "no change", or the signed amount in
// the stock unit.
export function differenceText(difference: number, unit: string): string {
  if (difference === 0) {
    return 'no change';
  }
  const sign = difference > 0 ? '+' : '';
  return `${sign}${String(difference)} ${unit}`;
}

interface StockFacts {
  isParent: boolean;
  stockAmount: number;
  stockEntries: readonly unknown[];
  tareWeight: null | number;
}

// The Grocy stock of an Inventory row. It is the own stock in the stock unit,
// and the count of the stock entries when there are two or more. It also has
// the notes for a parent product and a tare weight product.
export function stockLineText(product: StockFacts, unit: string): string {
  const count = product.stockEntries.length;
  const entries = count > 1 ? ` in ${String(count)} stock entries` : '';
  const parts = [`In Grocy: ${String(product.stockAmount)} ${unit}${entries}`];
  if (product.isParent) {
    parts.push('parent product, own stock only');
  }
  if (product.tareWeight !== null) {
    parts.push(
      `tare weight ${String(product.tareWeight)} ${unit}, count the gross weight`,
    );
  }
  return parts.join(' · ');
}

interface Take {
  entry: StockEntry;
  take: number;
}

// What a decrease takes from each stock entry. Grocy consumes the stock
// entries in the order of the product read and takes the whole entry
// before the next one.
function consumePlan(entries: readonly StockEntry[], amount: number): Take[] {
  const plan: Take[] = [];
  let left = amount;
  for (const entry of entries) {
    if (left <= 0) {
      break;
    }
    const take = round(Math.min(entry.amount, left));
    plan.push({ entry, take });
    left = round(left - take);
  }
  return plan;
}

function takeText(
  { entry, take }: Take,
  unit: string,
  locations: readonly Named[] | undefined,
): string {
  const due =
    entry.dueDate === null ? 'with no due date' : `due ${entry.dueDate}`;
  const location = nameOf(locations, entry.locationId, 'no location');
  const open = entry.open ? ' (open)' : '';
  return `${String(take)} ${unit} from the entry ${due} at ${location}${open}`;
}

type EffectProduct = Pick<
  Product,
  'locationId' | 'stockAmount' | 'stockEntries' | 'tareWeight'
>;

// What the accept of an Inventory count does, before the tap. A decrease takes
// from stock entries in the Grocy order. An increase adds one stock entry, at
// the location and with the due date of the row or the product defaults. A
// gross weight below the tare weight is a Grocy refusal. No change says
// nothing, because the difference says it.
export function effectText(
  scan: Pick<PendingScan, 'dueDate' | 'locationId'> & { amount: number },
  product: EffectProduct,
  unit: string,
  locations: readonly Named[] | undefined,
): null | string {
  if (product.tareWeight !== null && scan.amount < product.tareWeight) {
    return 'Below the tare weight. Grocy refuses this.';
  }
  const difference = differenceOf(scan.amount, product);
  if (difference < 0) {
    const takes = consumePlan(product.stockEntries, -difference);
    return `Takes ${takes.map((take) => takeText(take, unit, locations)).join(', ')}.`;
  }
  if (difference > 0) {
    const location = nameOf(
      locations,
      scan.locationId ?? product.locationId,
      'the product default location',
    );
    const due = scan.dueDate ?? 'the product default';
    return `Adds one stock entry of ${String(difference)} ${unit} at ${location}, due ${due}.`;
  }
  return null;
}
