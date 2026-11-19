import type { PendingScan } from '../api/next-api';
import type { PlanEntry } from './stock-entries';
import type { Plan, PlanProduct, PlanRow } from './stock-plan';

import { entriesOf } from './stock-entries';
import { entriesAfter, planOn, round } from './stock-plan';

type QueueRow = PlanRow & Pick<PendingScan, 'productId' | 'scannedAt'>;

// One row of the chain with the product read of its product.
export interface ChainRow {
  product: PlanProduct;
  row: PlanRow;
}

// One part of a stock entry after the older rows of the chain. The fraction
// is the part of the amount in the product read. A fraction does not change
// with the unit, so two reads that show one stock entry in different stock
// units share it. A Transfer of a part splits a stock entry into two parts.
interface Part {
  fraction: number;
  locationId: PlanEntry['locationId'];
  open: boolean;
}

// The stock after the older rows of the chain, by the Grocy stock id.
type Stock = Map<string, readonly Part[]>;

// The stock entries of one product read after the older rows of the chain. A
// stock entry that no older row changed stays as the read shows it.
function entriesNow(base: readonly PlanEntry[], stock: Stock): PlanEntry[] {
  return base.flatMap((entry) => {
    const parts = stock.get(entry.stockId);
    if (parts === undefined) {
      return [entry];
    }
    return parts.map((part) => {
      return {
        ...entry,
        amount: round(entry.amount * part.fraction),
        locationId: part.locationId,
        open: part.open,
      };
    });
  });
}

// The parts of each stock entry of one product read after the accept of a
// row.
function keepParts(
  base: readonly PlanEntry[],
  after: readonly PlanEntry[],
  stock: Stock,
): void {
  for (const entry of base) {
    stock.set(
      entry.stockId,
      after
        .filter((item) => item.stockId === entry.stockId)
        .map((item) => {
          return {
            fraction: item.amount / entry.amount,
            locationId: item.locationId,
            open: item.open,
          };
        }),
    );
  }
}

// The plans of the rows, oldest first. Each row sees the stock after the older
// rows that share a stock entry with it. Thus two rows do not show the same
// pack two times. The rows of one product share their stock entries. A Consume
// of a parent product also shares the stock entries of its sub-products. A row
// with an error did not book, so it changes no stock. The unit is the name of
// the stock unit.
export function plansOf(
  rows: readonly ChainRow[],
  unit: string,
): Map<number, Plan> {
  const plans = new Map<number, Plan>();
  const stock: Stock = new Map();
  for (const { product, row } of rows) {
    const base = entriesOf(product);
    const entries = entriesNow(base, stock);
    const plan = planOn(row, product, entries, unit);
    if (plan === null) {
      continue;
    }
    plans.set(row.id, plan);
    if (row.error === null) {
      keepParts(base, entriesAfter(row, plan, entries), stock);
    }
  }
  return plans;
}

function byScanTime(first: QueueRow, second: QueueRow): number {
  const byTime = first.scannedAt.localeCompare(second.scannedAt);
  return byTime === 0 ? first.id - second.id : byTime;
}

// The plan of one row among the rows of the queue. The rows chain in the
// order of the scan time, oldest first, as `plansOf` decides. A row of a
// product with no read in the map does not take part.
export function planOfScan(
  scan: QueueRow,
  rows: readonly QueueRow[],
  products: ReadonlyMap<number, PlanProduct>,
  unit: string,
): null | Plan {
  const chain: ChainRow[] = [];
  const queue = [...rows.filter((row) => row.id !== scan.id), scan];
  for (const row of queue.toSorted(byScanTime)) {
    const product =
      row.productId === null ? undefined : products.get(row.productId);
    if (product !== undefined) {
      chain.push({ product, row });
    }
    if (row.id === scan.id) {
      break;
    }
  }
  return plansOf(chain, unit).get(scan.id) ?? null;
}
