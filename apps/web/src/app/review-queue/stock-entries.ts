import type {
  PendingScan,
  StockEntry,
  SubProductStockEntry,
} from '../api/next-api';
import type { PlanProduct } from './stock-plan';

// A stock entry that a row can take: an own stock entry of the product, or a
// stock entry of a sub-product of a parent product.
export type PlanEntry = StockEntry | SubProductStockEntry;

// Whether the stock entry belongs to a sub-product of a parent product.
export function isOfSubProduct(
  entry: PlanEntry,
): entry is SubProductStockEntry {
  return 'productId' in entry;
}

// Grocy stores the due date 2999-12-31 for a stock entry with no due date.
const NO_DUE_DATE = '2999-12-31';

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
export function consumeOrder(
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

// The stock entries of the product read that a row can take: the own stock
// entries and the stock entries of the sub-products.
export function entriesOf(
  product: Pick<PlanProduct, 'stockEntries' | 'subProductStockEntries'>,
): PlanEntry[] {
  return [...product.stockEntries, ...product.subProductStockEntries];
}

// The stock entries that the stock entry select lists: the stock entries at
// the "from" location in the Grocy consume order, as the Grocy consume form
// and transfer form list them. The Consume form also lists the stock entries
// of the sub-products. With no "from" location, the list has every stock
// entry.
export function stockEntriesAt(
  product: Pick<
    PlanProduct,
    'consumeLocationId' | 'stockEntries' | 'subProductStockEntries'
  >,
  locationId: null | number,
  bookingType: PendingScan['bookingType'],
): PlanEntry[] {
  const entries =
    bookingType === 'consume' ? entriesOf(product) : product.stockEntries;
  return entries
    .filter((entry) => locationId === null || entry.locationId === locationId)
    .toSorted(consumeOrder(product.consumeLocationId));
}
