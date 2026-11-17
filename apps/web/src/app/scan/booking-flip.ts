import type { PendingScan } from '../api/next-api';

type BookingType = PendingScan['bookingType'];

const LABEL: Readonly<Record<'consume' | 'transfer', string>> = {
  consume: 'Consume',
  transfer: 'Transfer',
};

// The booking type after a flip, as the spec of milestone 3 decided. A row
// flips between Consume and Transfer only. A Purchase and an Inventory have
// no flip.
export function flippedBookingType(
  bookingType: BookingType,
): 'consume' | 'transfer' | undefined {
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
export function flipLabel(bookingType: 'consume' | 'transfer'): string {
  const other = bookingType === 'consume' ? 'transfer' : 'consume';
  return `${LABEL[bookingType]}. Change to ${LABEL[other]}.`;
}
