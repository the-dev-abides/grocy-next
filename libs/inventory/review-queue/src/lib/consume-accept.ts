import type {
  BookingResult,
  ConsumeProduct,
  ConsumeStockEntry,
  GrocyStockClient,
  Open,
  ProductDetails,
  StockLogRow,
} from '@grocy-next/inventory-products';

// The Grocy message of the Grocy consume form for an amount above the stock.
// The Grocy API books less with no error, so the accept refuses the amount
// with this message before any Grocy call.
const ABOVE_STOCK =
  'Amount to be consumed cannot be > current stock amount (if supplied, at the desired location)';

// A difference below this size is the noise of a floating point subtraction,
// not an amount.
const NOISE = 1e-9;

// One open after the consume: the product of the stock entry and the open.
export interface OpenOfStockEntry {
  open: Open;
  productId: number;
}

// The amount that the consume takes from the stock. For a tare weight
// product, the amount is the gross weight, and Grocy books the difference to
// the own stock plus the tare weight.
export function consumedAmountOf(
  amount: number,
  product: Pick<ProductDetails, 'stockAmount' | 'tareWeight'>,
): number {
  return product.tareWeight === null
    ? amount
    : Math.abs(amount - product.stockAmount - product.tareWeight);
}

// The stock that the consume can take at the "from" location, in the stock
// unit of the row product. A null location is every location.
export function stockAt(
  entries: readonly ConsumeStockEntry[],
  locationId: null | number,
  products: ReadonlyMap<number, ConsumeProduct>,
): number {
  let stock = 0;
  for (const entry of entries) {
    if (locationId === null || entry.locationId === locationId) {
      stock += entry.amount / (products.get(entry.productId)?.factor ?? 1);
    }
  }
  return stock;
}

// The stock entries that the consume can take. A row that names one stock
// entry can take that stock entry only, as the Grocy consume form limits the
// amount to it.
export function entriesOfRow(
  entries: readonly ConsumeStockEntry[],
  stockId: null | string,
): readonly ConsumeStockEntry[] {
  return stockId === null
    ? entries
    : entries.filter((entry) => entry.stockId === stockId);
}

function roundOf(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// The check of the Grocy consume form. Grocy rounds both values to two
// decimals before it compares them.
export function isAboveStock(amount: number, stock: number): boolean {
  return roundOf(amount) > roundOf(stock);
}

// The refusal of an amount above the stock, as Grocy refuses it.
export function aboveStockRefusal(): BookingResult {
  return {
    grocy: { message: ABOVE_STOCK, status: 400 },
    isRefused: true,
  };
}

// The open on consume of ADR 0017. Each stock log row of the consume names
// one stock entry by its `stock_id`. When that stock entry was sealed before
// the consume and held more than the consume took, the rest gets an open. A
// stock entry that the consume took fully, a product with "cannot be opened",
// and a tare weight product get no open.
export function opensAfterConsume(
  rows: readonly StockLogRow[],
  entries: readonly ConsumeStockEntry[],
  products: ReadonlyMap<number, ConsumeProduct>,
): OpenOfStockEntry[] {
  const opens: OpenOfStockEntry[] = [];
  for (const row of rows) {
    const entry = entries.find((item) => item.stockId === row.stockId);
    const rest = (entry?.amount ?? 0) - Math.abs(row.amount);
    if (
      entry !== undefined &&
      !entry.isOpen &&
      products.get(entry.productId)?.canOpen === true &&
      rest > NOISE
    ) {
      opens.push({
        open: { amount: Number(rest.toFixed(9)), stockId: entry.stockId },
        productId: entry.productId,
      });
    }
  }
  return opens;
}

// One open. A failed open keeps the consume, as ADR 0017 decided, so a
// refusal and a Grocy failure give no rows.
async function openOne(
  stock: GrocyStockClient,
  { open, productId }: OpenOfStockEntry,
): Promise<StockLogRow[]> {
  let result: BookingResult;
  try {
    result = await stock.open(productId, open);
  } catch {
    return [];
  }
  return result.isRefused ? [] : result.rows;
}

// The opens after the consume, one after the other. The result is the stock
// log rows of the opens that Grocy booked.
export async function openRest(
  stock: GrocyStockClient,
  opens: readonly OpenOfStockEntry[],
): Promise<StockLogRow[]> {
  const rows: StockLogRow[] = [];
  for (const item of opens) {
    rows.push(...(await openOne(stock, item)));
  }
  return rows;
}
