import type { PendingScan, Product } from '../api/next-api';

import { nameOf, transferLocationsText } from '../scan/scan-text';

interface Named {
  id: number;
  name: string;
}

type ProductUnits = Pick<
  Product,
  'consumeUnitId' | 'purchaseUnitId' | 'stockAmount' | 'stockUnitId'
>;

export const bookingTypeLabel: Readonly<
  Record<PendingScan['bookingType'], string>
> = {
  consume: 'Consume',
  inventory: 'Inventory',
  purchase: 'Purchase',
  transfer: 'Transfer',
};

// The unit of a row with no scanned unit, as ADR 0010 decided: the purchase
// unit on a Purchase, the consume unit on a Consume, and the stock unit on an
// Inventory and a Transfer.
export function defaultUnitIdOf(
  bookingType: PendingScan['bookingType'],
  product: Omit<ProductUnits, 'stockAmount'>,
): number {
  switch (bookingType) {
    case 'consume': {
      return product.consumeUnitId;
    }
    case 'purchase': {
      return product.purchaseUnitId;
    }
    default: {
      return product.stockUnitId;
    }
  }
}

// The unit of the amount of a row, as ADR 0010 decided. An Inventory amount
// is in the stock unit of the product. Every other amount is in the scanned
// unit. When the row has no scanned unit, the amount is in the default unit of
// the booking type, as Grocy shows it. No words while the product read has not
// answered.
export function unitOf(
  scan: Pick<PendingScan, 'bookingType' | 'quantityUnitId'>,
  product: ProductUnits | undefined,
  quantityUnits: readonly Named[] | undefined,
): string {
  if (scan.bookingType !== 'inventory' && scan.quantityUnitId !== null) {
    return nameOf(quantityUnits, scan.quantityUnitId, '');
  }
  return product === undefined
    ? ''
    : nameOf(quantityUnits, defaultUnitIdOf(scan.bookingType, product), '');
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
