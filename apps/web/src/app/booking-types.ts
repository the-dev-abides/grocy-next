import {
  ArrowRightLeft,
  ClipboardList,
  type LucideIcon,
  ScanBarcode,
  Utensils,
} from 'lucide-react';

import type { PendingScan } from './api/next-api';

type BookingType = PendingScan['bookingType'];

// The booking types that a row can flip between, Consume and Transfer. The
// switch of the Consume and Transfer scan screen sets one of them.
export type SwitchBookingType = 'consume' | 'transfer';

// The four booking types, in the order of the menu.
export const BOOKING_TYPES: readonly BookingType[] = [
  'purchase',
  'inventory',
  'consume',
  'transfer',
];

export const SWITCH_BOOKING_TYPES: readonly SwitchBookingType[] = [
  'consume',
  'transfer',
];

export const bookingTypeLabel: Readonly<Record<BookingType, string>> = {
  consume: 'Consume',
  inventory: 'Inventory',
  purchase: 'Purchase',
  transfer: 'Transfer',
};

// The icon of each booking type, as on the scan screens. Purchase has the
// barcode, and Inventory has the clipboard. Consume has the fork and knife, and
// Transfer has the two arrows.
export const bookingTypeIcon: Readonly<Record<BookingType, LucideIcon>> = {
  consume: Utensils,
  inventory: ClipboardList,
  purchase: ScanBarcode,
  transfer: ArrowRightLeft,
};

// The choices of a select of the booking type: the label and the value of
// each booking type.
export function bookingTypeChoices<Type extends BookingType>(
  types: readonly Type[],
): { label: string; value: Type }[] {
  return types.map((type) => ({ label: bookingTypeLabel[type], value: type }));
}

// True when the booking type is Consume or Transfer.
export function isSwitchBookingType(
  bookingType: string,
): bookingType is SwitchBookingType {
  return bookingType === 'consume' || bookingType === 'transfer';
}
