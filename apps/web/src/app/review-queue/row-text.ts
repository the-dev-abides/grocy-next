import type { PendingScan, Product } from '../api/next-api';

import { nameOf } from '../scan/scan-text';

interface Named {
  id: number;
  name: string;
}

type ProductUnits = Pick<
  Product,
  'purchaseUnitId' | 'stockAmount' | 'stockUnitId'
>;

export const bookingTypeLabel: Readonly<
  Record<PendingScan['bookingType'], string>
> = {
  inventory: 'Inventory',
  purchase: 'Purchase',
};

// The unit of the amount of a row, as ADR 0010 decided. A Purchase amount is in
// the scanned unit. When the row has no scanned unit, the amount is in the
// purchase unit of the product. An Inventory amount is in the stock unit of the
// product. No words while the product read has not answered.
export function unitOf(
  scan: Pick<PendingScan, 'bookingType' | 'quantityUnitId'>,
  product: ProductUnits | undefined,
  quantityUnits: readonly Named[] | undefined,
): string {
  if (scan.bookingType === 'inventory') {
    return product === undefined
      ? ''
      : nameOf(quantityUnits, product.stockUnitId, '');
  }
  if (scan.quantityUnitId !== null) {
    return nameOf(quantityUnits, scan.quantityUnitId, '');
  }
  return product === undefined
    ? ''
    : nameOf(quantityUnits, product.purchaseUnitId, '');
}

// The amount with its unit. An Inventory row with no count shows the Grocy
// stock as the placeholder, so the user sees what no change would be.
export function amountText(
  scan: Pick<PendingScan, 'amount' | 'bookingType' | 'quantityUnitId'>,
  product: ProductUnits | undefined,
  quantityUnits: readonly Named[] | undefined,
): string {
  const unit = unitOf(scan, product, quantityUnits);
  if (scan.amount !== null) {
    return `${String(scan.amount)} ${unit}`.trim();
  }
  if (product !== undefined && scan.bookingType === 'inventory') {
    return `— (${String(product.stockAmount)} ${unit} now)`;
  }
  return '—';
}

// The name of a row: the product, the write-in name, the lookup result, or
// the bare code, from the facts of ADR 0010.
export function rowName(
  scan: Pick<
    PendingScan,
    'code' | 'lookupResult' | 'productId' | 'writeInName'
  >,
  products: readonly Named[] | undefined,
): string {
  return scan.productId === null
    ? (scan.writeInName ?? scan.lookupResult?.name ?? scan.code ?? '')
    : nameOf(products, scan.productId, '');
}
