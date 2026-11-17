import type { PendingScan, Product } from '../api/next-api';

interface Named {
  id: number;
  name: string;
}

// This function returns the name of the master data row with the id. It returns
// the fallback when the id is null. It returns the id itself while the list has
// not loaded yet.
export function nameOf(
  rows: readonly Named[] | undefined,
  id: null | number,
  fallback: string,
): string {
  return id === null
    ? fallback
    : (rows?.find((row) => row.id === id)?.name ?? `#${String(id)}`);
}

// The time of a scan in the time zone of the browser, as the browser locale
// writes hours and minutes.
export function timeOf(timestamp: string): string {
  return Temporal.Instant.from(timestamp).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// The price of a row as entered, with its price type, or the words for none.
export function priceText(
  scan: Pick<PendingScan, 'price' | 'priceType'>,
): string {
  return scan.price === null
    ? 'no price'
    : `${String(scan.price)} ${scan.priceType}`;
}

// The due date of a row, or the words for the Grocy product default.
export function dueDateText(dueDate: null | string): string {
  return dueDate ?? 'default due';
}

// The detail of a Consume row: the booking type and the "from" location. The
// server sets the location of a known product, so only a code with no product
// has none.
export function consumeDetailText(
  scan: Pick<PendingScan, 'locationId'>,
  locations: readonly Named[] | undefined,
): string {
  return `Consume from ${nameOf(locations, scan.locationId, 'the product default')}`;
}

// The two locations of a Transfer: "From → To". The words name a missing
// "to" location, because the accept needs one.
export function transferLocationsText(
  scan: Pick<PendingScan, 'locationId' | 'toLocationId'>,
  locations: readonly Named[] | undefined,
): string {
  const from = nameOf(locations, scan.locationId, 'Product default');
  const to = nameOf(locations, scan.toLocationId, 'No "to" location');
  return `${from} → ${to}`;
}

// The detail of a Transfer row: the booking type and both locations.
export function transferDetailText(
  scan: Pick<PendingScan, 'locationId' | 'toLocationId'>,
  locations: readonly Named[] | undefined,
): string {
  return `Transfer ${transferLocationsText(scan, locations)}`;
}

// The strip under the camera of the Consume and Transfer scan screen names
// the booking type of the next scan, and on a Transfer the "to" location.
export function nextScanText(
  bookingType: PendingScan['bookingType'],
  toLocationId: null | number,
  locations: readonly Named[] | undefined,
): string {
  if (bookingType !== 'transfer') {
    return 'The next scan is a Consume';
  }
  return toLocationId === null
    ? 'The next scan is a Transfer with no "to" location'
    : `The next scan is a Transfer to ${nameOf(locations, toLocationId, '')}`;
}

// The Grocy stock of the product of an Inventory row, in the stock unit of the
// product. While the product read has not answered, the function returns the
// words.
export function stockText(
  product: Pick<Product, 'stockAmount' | 'stockUnitId'> | undefined,
  quantityUnits: readonly Named[] | undefined,
): string {
  if (product === undefined) {
    return 'The stock loads';
  }
  const unit = nameOf(quantityUnits, product.stockUnitId, '');
  return `In Grocy: ${String(product.stockAmount)} ${unit}`.trim();
}
