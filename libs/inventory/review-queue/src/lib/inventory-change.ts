import type { ProductDetails } from '@grocy-next/inventory-products';

// The stock that an Inventory count is compared with: the own stock of the
// product in the stock unit, as ADR 0010 decided. A parent product counts
// own stock only. For a tare weight product the count is the gross weight,
// and the comparison is with own stock plus tare weight. The product read
// does not carry the tare weight yet, so the ticket that adds it changes
// this function and nothing else of the accept.
function stockToCompare(product: Pick<ProductDetails, 'stockAmount'>): number {
  return product.stockAmount;
}

// A count equal to the stock is no change. Grocy refuses that inventory, so
// the accept calls no Grocy and removes the row, as ADR 0010 decided.
export function isNoChange(
  amount: number,
  product: Pick<ProductDetails, 'stockAmount'>,
): boolean {
  return amount === stockToCompare(product);
}
