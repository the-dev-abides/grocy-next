import type {
  ConsumeStockEntry,
  ProductDetails,
} from '@grocy-next/inventory-products';

import type { BookingType } from './pending-scan.ts';

type LocatedStock = Pick<ConsumeStockEntry, 'amount' | 'locationId'>;

function hasStockAt(
  entries: readonly LocatedStock[],
  locationId: number,
): boolean {
  return entries.some(
    (entry) => entry.locationId === locationId && entry.amount > 0,
  );
}

// This function returns the "from" location of a new Consume or Transfer
// pending scan, as the Grocy forms set it. The defaults come in order. The
// first default that has stock wins. When no default has stock, the location
// of the first stock entry with stock wins. The stock entries are in the
// Grocy consume order. When the product has no stock, the first default
// applies, so the row still shows a location.
export function fromLocationOf(
  defaults: readonly (null | number)[],
  entries: readonly LocatedStock[],
): null | number {
  const locations = defaults.filter((id) => id !== null);
  const withStock = locations.find((id) => hasStockAt(entries, id));
  if (withStock !== undefined) {
    return withStock;
  }
  const first = entries.find(
    (entry) => entry.locationId !== null && entry.amount > 0,
  );
  return first?.locationId ?? locations[0] ?? null;
}

// The one default of the Grocy form of the booking type. The Grocy consume
// form uses the default consume location when the product has one, else the
// default location. It never tries the default location after the default
// consume location (Grocy 4.7.1, consume.js, lines 381 to 434). The Grocy
// transfer form uses the default location.
export function formDefaultOf(
  bookingType: BookingType,
  product: Pick<ProductDetails, 'consumeLocationId' | 'locationId'>,
): null | number {
  return bookingType === 'consume'
    ? (product.consumeLocationId ?? product.locationId)
    : product.locationId;
}
