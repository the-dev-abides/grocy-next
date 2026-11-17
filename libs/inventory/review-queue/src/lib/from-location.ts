import type {
  ConsumeStockEntry,
  ProductDetails,
} from '@grocy-next/inventory-products';

import type { FormDefaults } from './pending-scan-to-store.ts';
import type { BookingType, CreatePendingScan } from './pending-scan.ts';

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
// pending scan, as the Grocy forms set it. The form has one default. When the
// default has stock, it wins. Else the location of the first stock entry with
// stock wins. The stock entries are in the Grocy consume order. When the
// product has no stock, the default applies, so the row still shows a
// location.
export function fromLocationOf(
  formDefault: null | number,
  entries: readonly LocatedStock[],
): null | number {
  if (formDefault !== null && hasStockAt(entries, formDefault)) {
    return formDefault;
  }
  const first = entries.find(
    (entry) => entry.locationId !== null && entry.amount > 0,
  );
  return first?.locationId ?? formDefault;
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

// The defaults of a row that names one stock entry, as the Grocy consume form
// and the Grocy transfer form set them after a scan of a stock entry
// Grocycode. The "from" location is the location of the stock entry, because
// the accept can take the stock entry at its location only. A Consume also
// takes the amount of the stock entry, when the body has no amount. Grocy
// stores that amount in the stock unit, so the row takes the stock unit.
export function stockEntryDefaultsOf(
  body: Pick<CreatePendingScan, 'amount' | 'bookingType'>,
  defaults: FormDefaults,
  entry: Pick<ConsumeStockEntry, 'amount' | 'locationId'>,
  product: Pick<ProductDetails, 'stockUnitId'>,
): FormDefaults {
  const located = { ...defaults, locationId: entry.locationId };
  return body.bookingType === 'consume' && body.amount === undefined
    ? {
        ...located,
        amount: entry.amount,
        quantityUnitId: product.stockUnitId,
      }
    : located;
}

// The "from" location of the Grocy form of a new Consume or Transfer. A
// location in the body wins. Else the one default of the Grocy form applies
// when it has stock, else the first location with stock, as `fromLocationOf`
// decides. The stock entries include the stock entries of the sub-products,
// because a Consume can take them. A Transfer counts the stock entries of the
// product only.
export function formLocationOf(
  body: Pick<CreatePendingScan, 'bookingType' | 'locationId'>,
  product: Pick<ProductDetails, 'consumeLocationId' | 'id' | 'locationId'>,
  entries: readonly ConsumeStockEntry[],
): null | number {
  if (body.locationId !== undefined) {
    return body.locationId;
  }
  return fromLocationOf(
    formDefaultOf(body.bookingType, product),
    body.bookingType === 'consume'
      ? entries
      : entries.filter((entry) => entry.productId === product.id),
  );
}
