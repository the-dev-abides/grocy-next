import type { PendingScan, Product, UpdatePendingScan } from '../api/next-api';

import { isFieldOfType, numberOf } from './bulk-edit';

interface Named {
  id: number;
  name: string;
}

// The fields of the full form of one row. The numbers, the due date, and
// the note are the typed text, so the user can clear a field and type again.
export interface RowForm {
  amount: string;
  bookingType: PendingScan['bookingType'];
  dueDate: string;
  locationId: null | number;
  note: string;
  price: string;
  priceType: PendingScan['priceType'];
  productGroupId: null | number;
  quantityUnitId: null | number;
  spoiled: boolean;
  stockEntryId: null | string;
  storeId: null | number;
  toLocationId: null | number;
}

type FormFacts = Pick<
  PendingScan,
  | 'amount'
  | 'bookingType'
  | 'dueDate'
  | 'locationId'
  | 'note'
  | 'price'
  | 'priceType'
  | 'productGroupId'
  | 'quantityUnitId'
  | 'spoiled'
  | 'stockEntryId'
  | 'storeId'
  | 'toLocationId'
>;

function textOf(value: null | number | string): string {
  return value === null ? '' : String(value);
}

// The form as it opens: the fields of the row.
export function rowFormOf(scan: FormFacts): RowForm {
  return {
    amount: textOf(scan.amount),
    bookingType: scan.bookingType,
    dueDate: textOf(scan.dueDate),
    locationId: scan.locationId,
    note: textOf(scan.note),
    price: textOf(scan.price),
    priceType: scan.priceType,
    productGroupId: scan.productGroupId,
    quantityUnitId: scan.quantityUnitId,
    spoiled: scan.spoiled,
    stockEntryId: scan.stockEntryId,
    storeId: scan.storeId,
    toLocationId: scan.toLocationId,
  };
}

function textOrNull(text: string): null | string {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

// The update of the full form: every field of the form. An empty text, and a
// text that is not a number in a number field, saves null. The booking type
// changes only between Consume and Transfer, so the form of a Purchase row
// and of an Inventory row sends the booking type of the row.
export function rowFormBody(form: RowForm): UpdatePendingScan {
  return {
    amount: numberOf(form.amount) ?? null,
    bookingType: form.bookingType,
    dueDate: textOrNull(form.dueDate),
    locationId: form.locationId,
    note: textOrNull(form.note),
    price: numberOf(form.price) ?? null,
    priceType: form.priceType,
    productGroupId: form.productGroupId,
    quantityUnitId: form.quantityUnitId,
    spoiled: form.spoiled,
    stockEntryId: form.stockEntryId,
    storeId: form.storeId,
    toLocationId: form.toLocationId,
  };
}

// The units of the amount of a row, as in the prototype. They are the
// purchase unit, the stock unit, the consume unit, and the units of the
// conversions of the product. They come in the order of the unit list. A row
// with no product offers every unit.
export function unitChoices<Unit extends Named>(
  product:
    | Pick<
        Product,
        'consumeUnitId' | 'conversions' | 'purchaseUnitId' | 'stockUnitId'
      >
    | undefined,
  units: readonly Unit[] | undefined,
): Unit[] {
  if (product === undefined) {
    return [...(units ?? [])];
  }
  const ids = new Set([
    product.consumeUnitId,
    product.purchaseUnitId,
    product.stockUnitId,
  ]);
  for (const conversion of product.conversions) {
    ids.add(conversion.fromQuantityUnitId);
    ids.add(conversion.toQuantityUnitId);
  }
  return (units ?? []).filter((unit) => ids.has(unit.id));
}

// The fields of the full form that depend on the booking type. The map of
// the bulk edit holds the rule. A Purchase row and an Inventory row have the
// due date, the store, and the price. Only a Purchase row has the price
// type. A Consume row and a Transfer row have the booking type. A Consume
// row has the spoiled flag, and a Transfer row has the "to" location.
export function rowFormFieldsOf(bookingType: PendingScan['bookingType']): {
  hasBookingType: boolean;
  hasDueDate: boolean;
  hasPrice: boolean;
  hasPriceType: boolean;
  hasSpoiled: boolean;
  hasStore: boolean;
  hasToLocation: boolean;
} {
  return {
    hasBookingType: isFieldOfType('bookingType', bookingType),
    hasDueDate: isFieldOfType('dueDate', bookingType),
    hasPrice: isFieldOfType('price', bookingType),
    hasPriceType: isFieldOfType('priceType', bookingType),
    hasSpoiled: isFieldOfType('spoiled', bookingType),
    hasStore: isFieldOfType('store', bookingType),
    hasToLocation: isFieldOfType('toLocation', bookingType),
  };
}
