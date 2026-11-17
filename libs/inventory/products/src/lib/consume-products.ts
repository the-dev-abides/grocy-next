import type { ConsumeStockEntry } from './consume.ts';
import type { GrocyClient } from './grocy/grocy-client.ts';
import type { GrocyStockClient } from './grocy/grocy-stock-client.ts';
import type { ProductDetails } from './product-details.ts';

// The facts of one product of the consume: the product that the row names, or a
// sub-product of it. The factor converts an amount from the stock unit of the
// row product to the stock unit of this product. Grocy converts it in the same
// way for the sub-product substitution. A product with "cannot be opened" and a
// tare weight product get no open.
export interface ConsumeProduct {
  canOpen: boolean;
  factor: number;
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
// not find gets no open. The accept of a Consume and the product read use
// this function, so the stock entry lines show the stock that the accept
// takes.
export async function readConsumeProducts(
  { grocy, stock }: Clients,
  product: ProductDetails,
  entries: readonly Pick<ConsumeStockEntry, 'productId'>[],
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
