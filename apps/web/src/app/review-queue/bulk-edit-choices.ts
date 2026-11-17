import type { BulkEdit } from './bulk-edit';

import { KEEP, NONE } from './keep-choices';

// The choices of the bulk edit selects, and the values of the fields that
// they set. A KEEP value keeps the field as it is on the rows.
export const KEEP_TEXT = 'Keep as is';

export const KEEP_CHOICE = { label: KEEP_TEXT, value: KEEP };

// The value of the due date select for a fixed date.
export const DATE = 'date';

export const DUE_CHOICES = [
  KEEP_CHOICE,
  { label: 'Product default', value: NONE },
  { label: 'Fixed date', value: DATE },
];

export const PRICE_TYPE_CHOICES = [
  KEEP_CHOICE,
  { label: 'per unit', value: 'unit' },
  { label: 'in total', value: 'total' },
];

export const BOOKING_TYPE_CHOICES = [
  KEEP_CHOICE,
  { label: 'Consume', value: 'consume' },
  { label: 'Transfer', value: 'transfer' },
];

export const SPOILED_CHOICES = [
  KEEP_CHOICE,
  { label: 'Spoiled', value: 'on' },
  { label: 'Not spoiled', value: 'off' },
];

export function dueValueOf(dueDate: BulkEdit['dueDate']): string {
  if (dueDate === undefined) {
    return KEEP;
  }
  return dueDate === null ? NONE : DATE;
}

export function dueDateOfValue(value: string): BulkEdit['dueDate'] {
  if (value === KEEP) {
    return undefined;
  }
  return value === NONE ? null : '';
}

export function priceTypeOf(value: string): BulkEdit['priceType'] {
  return value === 'unit' || value === 'total' ? value : undefined;
}

export function bookingTypeOf(value: string): BulkEdit['bookingType'] {
  return value === 'consume' || value === 'transfer' ? value : undefined;
}

export function spoiledValueOf(spoiled: BulkEdit['spoiled']): string {
  if (spoiled === undefined) {
    return KEEP;
  }
  return spoiled ? 'on' : 'off';
}

export function spoiledOf(value: string): BulkEdit['spoiled'] {
  return value === KEEP ? undefined : value === 'on';
}
