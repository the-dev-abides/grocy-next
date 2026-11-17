import { bookingTypeLabel, type SwitchBookingType } from '../booking-types';

// The booking type after a flip, as the spec of milestone 3 decided. A row
// flips between Consume and Transfer only. A Purchase and an Inventory have
// no flip, so the caller checks `isSwitchBookingType` first.
export function flippedBookingType(
  bookingType: SwitchBookingType,
): SwitchBookingType {
  return bookingType === 'consume' ? 'transfer' : 'consume';
}

// The name of the flip button for a screen reader: the booking type of the
// row, and the booking type after a tap.
export function flipLabel(bookingType: SwitchBookingType): string {
  const other = flippedBookingType(bookingType);
  return `${bookingTypeLabel[bookingType]}. Change to ${bookingTypeLabel[other]}.`;
}
