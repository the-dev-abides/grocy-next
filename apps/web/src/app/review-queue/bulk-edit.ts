import type { PendingScan, UpdatePendingScan } from '../api/next-api';

// The fields of the bulk edit dialog. Every field starts empty: an empty
// text and an undefined value keep the field as it is on the rows. A null
// value sets the field to none on the rows.
export interface BulkEdit {
  amount: string;
  dueDate: null | string | undefined;
  locationId: null | number | undefined;
  note: string;
  price: string;
  priceType: PendingScan['priceType'] | undefined;
  productGroupId: null | number | undefined;
  storeId: null | number | undefined;
}

export const EMPTY_BULK_EDIT: BulkEdit = {
  amount: '',
  dueDate: undefined,
  locationId: undefined,
  note: '',
  price: '',
  priceType: undefined,
  productGroupId: undefined,
  storeId: undefined,
};

// The typed text as a number, or undefined for a blank field or a text that
// is not a number.
export function numberOf(text: string): number | undefined {
  const value = Number(text);
  return text.trim() === '' || !Number.isFinite(value) ? undefined : value;
}

function setOf<Key extends keyof UpdatePendingScan>(
  key: Key,
  value: undefined | UpdatePendingScan[Key],
): Partial<UpdatePendingScan> {
  return value === undefined ? {} : { [key]: value };
}

// The merge patch of the bulk edit: only the fields that the user set, as
// the spec decided. The dialog sends the same patch to every checked row.
export function bulkEditBody(edit: BulkEdit): UpdatePendingScan {
  const note = edit.note.trim();
  return {
    ...setOf('amount', numberOf(edit.amount)),
    ...setOf('dueDate', edit.dueDate === '' ? undefined : edit.dueDate),
    ...setOf('locationId', edit.locationId),
    ...setOf('note', note === '' ? undefined : note),
    ...setOf('price', numberOf(edit.price)),
    ...setOf('priceType', edit.priceType),
    ...setOf('productGroupId', edit.productGroupId),
    ...setOf('storeId', edit.storeId),
  };
}
