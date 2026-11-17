import type { PendingScan } from '../api/next-api';

import { bookingTypeLabel, type SwitchBookingType } from '../booking-types';

type BookingType = PendingScan['bookingType'];

// The booking type after a flip, as the spec of milestone 3 decided. A row
// flips between Consume and Transfer only. A Purchase and an Inventory have
// no flip.
export function flippedBookingType(
  bookingType: BookingType,
): SwitchBookingType | undefined {
  if (bookingType === 'consume') {
    return 'transfer';
  }
  if (bookingType === 'transfer') {
    return 'consume';
  }
  return undefined;
}

// The name of the flip button for a screen reader: the booking type of the
// row, and the booking type after a tap.
export function flipLabel(bookingType: SwitchBookingType): string {
  const other = bookingType === 'consume' ? 'transfer' : 'consume';
  return `${bookingTypeLabel[bookingType]}. Change to ${bookingTypeLabel[other]}.`;
}
