import type { PendingScan, Product, UpdatePendingScan } from '../api/next-api';

import { numberOf } from './bulk-edit';

interface Named {
  id: number;
  name: string;
}

// The fields of the full form of one row. The numbers, the due date, and
// the note are the typed text, so the user can clear a field and type again.
export interface RowForm {
  amount: string;
  dueDate: string;
  locationId: null | number;
  note: string;
  price: string;
  priceType: PendingScan['priceType'];
  productGroupId: null | number;
  quantityUnitId: null | number;
  storeId: null | number;
}

type FormFacts = Pick<
  PendingScan,
  | 'amount'
  | 'dueDate'
  | 'locationId'
  | 'note'
  | 'price'
  | 'priceType'
  | 'productGroupId'
  | 'quantityUnitId'
  | 'storeId'
>;

function textOf(value: null | number | string): string {
  return value === null ? '' : String(value);
}

// The form as it opens: the fields of the row.
export function rowFormOf(scan: FormFacts): RowForm {
  return {
    amount: textOf(scan.amount),
    dueDate: textOf(scan.dueDate),
    locationId: scan.locationId,
    note: textOf(scan.note),
    price: textOf(scan.price),
    priceType: scan.priceType,
    productGroupId: scan.productGroupId,
    quantityUnitId: scan.quantityUnitId,
    storeId: scan.storeId,
  };
}

function textOrNull(text: string): null | string {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

// The update of the full form: every field of the form. An empty text, and a
// text that is not a number in a number field, saves null.
export function rowFormBody(form: RowForm): UpdatePendingScan {
  return {
    amount: numberOf(form.amount) ?? null,
    dueDate: textOrNull(form.dueDate),
    locationId: form.locationId,
    note: textOrNull(form.note),
    price: numberOf(form.price) ?? null,
    priceType: form.priceType,
    productGroupId: form.productGroupId,
    quantityUnitId: form.quantityUnitId,
    storeId: form.storeId,
  };
}

// The units of the amount of a Purchase row, as in the prototype: the
// purchase unit, the stock unit, and the units of the conversions of the
// product, in the order of the unit list. A row with no product offers every
// unit.
export function unitChoices<Unit extends Named>(
  product:
    Pick<Product, 'conversions' | 'purchaseUnitId' | 'stockUnitId'> | undefined,
  units: readonly Unit[] | undefined,
): Unit[] {
  if (product === undefined) {
    return [...(units ?? [])];
  }
  const ids = new Set([product.purchaseUnitId, product.stockUnitId]);
  for (const conversion of product.conversions) {
    ids.add(conversion.fromQuantityUnitId);
    ids.add(conversion.toQuantityUnitId);
  }
  return (units ?? []).filter((unit) => ids.has(unit.id));
}
