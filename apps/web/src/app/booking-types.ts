// The booking types that a row can flip between, Consume and Transfer. The
// switch of the Consume and Transfer scan screen sets one of them.
export type SwitchBookingType = 'consume' | 'transfer';

// True when the booking type is Consume or Transfer.
export function isSwitchBookingType(
  bookingType: string,
): bookingType is SwitchBookingType {
  return bookingType === 'consume' || bookingType === 'transfer';
}
