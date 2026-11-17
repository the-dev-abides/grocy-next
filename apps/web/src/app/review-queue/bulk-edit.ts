import type { PendingScan, UpdatePendingScan } from '../api/next-api';

type BookingType = PendingScan['bookingType'];

// The fields of the bulk edit dialog. Every field starts empty: an empty
// text and an undefined value keep the field as it is on the rows. A null
// value sets the field to none on the rows.
export interface BulkEdit {
  amount: string;
  bookingType: 'consume' | 'transfer' | undefined;
  dueDate: null | string | undefined;
  locationId: null | number | undefined;
  note: string;
  price: string;
  priceType: PendingScan['priceType'] | undefined;
  productGroupId: null | number | undefined;
  spoiled: boolean | undefined;
  storeId: null | number | undefined;
  toLocationId: null | number | undefined;
}

export const EMPTY_BULK_EDIT: BulkEdit = {
  amount: '',
  bookingType: undefined,
  dueDate: undefined,
  locationId: undefined,
  note: '',
  price: '',
  priceType: undefined,
  productGroupId: undefined,
  spoiled: undefined,
  storeId: undefined,
  toLocationId: undefined,
};

// The fields of the bulk edit dialog, as the user sees them.
export type BulkField =
  | 'amount'
  | 'bookingType'
  | 'dueDate'
  | 'location'
  | 'note'
  | 'price'
  | 'priceType'
  | 'productGroup'
  | 'spoiled'
  | 'store'
  | 'toLocation';

type RowFacts = Pick<PendingScan, 'bookingType'>;

const ALL_TYPES: readonly BookingType[] = [
  'purchase',
  'inventory',
  'consume',
  'transfer',
];

// The booking types that each field applies to. The row form uses the same rule.
// The Inventory accept sends the store and the price to Grocy, as the Grocy inventory form has them.
// Only the Purchase accept uses the price type.
// The booking type, the "to" location, and spoiled use the booking type
// after the change of the bulk edit.
const FIELD_TYPES: Readonly<Record<BulkField, readonly BookingType[]>> = {
  amount: ALL_TYPES,
  bookingType: ['consume', 'transfer'],
  dueDate: ['purchase', 'inventory'],
  location: ALL_TYPES,
  note: ALL_TYPES,
  price: ['purchase', 'inventory'],
  priceType: ['purchase'],
  productGroup: ALL_TYPES,
  spoiled: ['consume'],
  store: ['purchase', 'inventory'],
  toLocation: ['transfer'],
};

// The booking type of a row after the bulk edit. Only a Consume row and a
// Transfer row can change the booking type.
function typeAfter(edit: BulkEdit, scan: RowFacts): BookingType {
  return edit.bookingType !== undefined &&
    FIELD_TYPES.bookingType.includes(scan.bookingType)
    ? edit.bookingType
    : scan.bookingType;
}

// True when the field applies to a row of the booking type.
export function isFieldOfType(
  field: BulkField,
  bookingType: BookingType,
): boolean {
  return FIELD_TYPES[field].includes(bookingType);
}

function isFieldOf(field: BulkField, edit: BulkEdit, scan: RowFacts): boolean {
  return isFieldOfType(field, typeAfter(edit, scan));
}

// The count of the checked rows that each field changes.
export function bulkFieldCounts(
  edit: BulkEdit,
  rows: readonly RowFacts[],
): Record<BulkField, number> {
  const countOf = (field: BulkField) =>
    rows.filter((scan) => isFieldOf(field, edit, scan)).length;
  return {
    amount: countOf('amount'),
    bookingType: countOf('bookingType'),
    dueDate: countOf('dueDate'),
    location: countOf('location'),
    note: countOf('note'),
    price: countOf('price'),
    priceType: countOf('priceType'),
    productGroup: countOf('productGroup'),
    spoiled: countOf('spoiled'),
    store: countOf('store'),
    toLocation: countOf('toLocation'),
  };
}

// The label of a bulk edit field. When the field changes only a part of the
// checked rows, the label names the count, for example "To (1 of 2 rows)".
export function bulkFieldLabel(
  label: string,
  count: number,
  total: number,
): string {
  return count === total
    ? label
    : `${label} (${String(count)} of ${String(total)} rows)`;
}

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

// The merge patch of the bulk edit for one row: only the fields that the user
// set, and only the fields that apply to the booking type of the row, as the
// spec decided.
export function bulkEditBody(
  edit: BulkEdit,
  scan: RowFacts,
): UpdatePendingScan {
  const hasField = (field: BulkField) => isFieldOf(field, edit, scan);
  const note = edit.note.trim();
  return {
    ...setOf('amount', numberOf(edit.amount)),
    ...(hasField('bookingType') && setOf('bookingType', edit.bookingType)),
    ...(hasField('dueDate') &&
      setOf('dueDate', edit.dueDate === '' ? undefined : edit.dueDate)),
    ...setOf('locationId', edit.locationId),
    ...setOf('note', note === '' ? undefined : note),
    ...(hasField('price') && setOf('price', numberOf(edit.price))),
    ...(hasField('priceType') && setOf('priceType', edit.priceType)),
    ...setOf('productGroupId', edit.productGroupId),
    ...(hasField('spoiled') && setOf('spoiled', edit.spoiled)),
    ...(hasField('store') && setOf('storeId', edit.storeId)),
    ...(hasField('toLocation') && setOf('toLocationId', edit.toLocationId)),
  };
}
