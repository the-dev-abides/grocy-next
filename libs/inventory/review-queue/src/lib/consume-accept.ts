import type {
  BookingResult,
  ConsumeStockEntry,
  GrocyClient,
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

// The facts of one product of the consume: the product that the row names,
// or a sub-product of it. The factor converts an amount in the stock unit of
// the row product to the stock unit of this product, as Grocy converts it for
// the sub-product substitution. A product with "cannot be opened" and a tare
// weight product get no open.
export interface ConsumeProduct {
  canOpen: boolean;
  factor: number;
}

// One open after the consume: the product of the stock entry and the open.
export interface OpenOfStockEntry {
  open: Open;
  productId: number;
}

interface Clients {
  grocy: GrocyClient;
  stock: GrocyStockClient;
}

function canOpen(product: ProductDetails): boolean {
  return product.canBeOpened && product.tareWeight === null;
}

// The factor from the stock unit of the parent product to the stock unit of
// one sub-product. Grocy reads the resolved conversions of the sub-product,
// and uses the factor 1 when it finds no row.
async function factorOf(
  stock: GrocyStockClient,
  parent: ProductDetails,
  child: ProductDetails,
): Promise<number> {
  if (child.stockUnitId === parent.stockUnitId) {
    return 1;
  }
  const conversions = await stock.readResolvedConversions(child.id);
  const conversion = conversions.find((row) => {
    return (
      row.fromQuantityUnitId === parent.stockUnitId &&
      row.toQuantityUnitId === child.stockUnitId
    );
  });
  return conversion?.factor ?? 1;
}

// The facts of each product of the stock entries that the consume can take.
// The row product is known. Each sub-product needs one product read, and a
// conversion read when its stock unit differs. A sub-product that Grocy does
// not find gets no open.
export async function readConsumeProducts(
  { grocy, stock }: Clients,
  product: ProductDetails,
  entries: readonly ConsumeStockEntry[],
): Promise<Map<number, ConsumeProduct>> {
  const products = new Map<number, ConsumeProduct>([
    [product.id, { canOpen: canOpen(product), factor: 1 }],
  ]);
  const childIds = new Set(entries.map((entry) => entry.productId));
  childIds.delete(product.id);
  for (const childId of childIds) {
    const child = await grocy.readProductDetails(childId);
    products.set(
      childId,
      child === null
        ? { canOpen: false, factor: 1 }
        : {
            canOpen: canOpen(child),
            factor: await factorOf(stock, product, child),
          },
    );
  }
  return products;
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
