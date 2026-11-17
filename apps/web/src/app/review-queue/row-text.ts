import type { PendingScan, Product } from '../api/next-api';

import { nameOf, transferLocationsText } from '../scan/scan-text';

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
  consume: 'Consume',
  inventory: 'Inventory',
  purchase: 'Purchase',
  transfer: 'Transfer',
};

// The unit of the amount of a row, as ADR 0010 decided. A Purchase amount is in
// the scanned unit. When the row has no scanned unit, the amount is in the
// purchase unit of the product. An Inventory amount is in the stock unit of the
// product. A Consume amount with no scanned unit is in the consume unit, which
// the product read does not give, so it has no words. A Transfer amount with no
// scanned unit is in the stock unit. No words while the product read has not
// answered.
export function unitOf(
  scan: Pick<PendingScan, 'bookingType' | 'quantityUnitId'>,
  product: ProductUnits | undefined,
  quantityUnits: readonly Named[] | undefined,
): string {
  if (
    scan.bookingType === 'inventory' ||
    (scan.bookingType === 'transfer' && scan.quantityUnitId === null)
  ) {
    return product === undefined
      ? ''
      : nameOf(quantityUnits, product.stockUnitId, '');
  }
  if (scan.quantityUnitId !== null) {
    return nameOf(quantityUnits, scan.quantityUnitId, '');
  }
  if (scan.bookingType === 'consume') {
    return '';
  }
  return product === undefined
    ? ''
    : nameOf(quantityUnits, product.purchaseUnitId, '');
}

// The location column of a row: the location, or "From → To" on a Transfer.
export function locationText(
  scan: Pick<PendingScan, 'bookingType' | 'locationId' | 'toLocationId'>,
  locations: readonly Named[] | undefined,
): string {
  return scan.bookingType === 'transfer'
    ? transferLocationsText(scan, locations)
    : nameOf(locations, scan.locationId, 'Product default');
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
