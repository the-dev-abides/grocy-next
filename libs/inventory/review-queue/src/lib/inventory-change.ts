import type { ProductDetails } from '@grocy-next/inventory-products';

type StockFacts = Pick<ProductDetails, 'stockAmount' | 'tareWeight'>;

// The stock that an Inventory count is compared with: the own stock of the
// product in the stock unit, as ADR 0010 decided. A parent product counts
// own stock only, and the own stock of the product is that already. For a
// tare weight product the count is the gross weight on the scale, container
// included, so the comparison is with the own stock plus the tare weight, as
// Grocy compares it.
function stockToCompare(product: StockFacts): number {
  return product.stockAmount + (product.tareWeight ?? 0);
}

// A count equal to the stock is no change. Grocy refuses that inventory, so
// the accept calls no Grocy and removes the row, as ADR 0010 decided.
export function isNoChange(amount: number, product: StockFacts): boolean {
  return amount === stockToCompare(product);
}
