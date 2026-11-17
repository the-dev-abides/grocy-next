import { cn } from 'cn';

import type { PendingScan, UpdatePendingScan } from '../api/next-api';

import {
  bookingTypeIcon,
  bookingTypeLabel,
  isSwitchBookingType,
} from '../booking-types';
import { FlipButton } from '../scan/flip-button';

// The booking type icon at the start of a row. The icon has the name of the
// booking type for a screen reader. On a Consume row and a Transfer row, the
// icon is a button, and a tap flips the row to the other booking type. On a
// Purchase row and an Inventory row, a tap does nothing. The flip is one
// update call with the new booking type.
export function BookingTypeIcon({
  onSave,
  scan: { bookingType },
  size = 'icon',
}: Readonly<{
  onSave: (body: UpdatePendingScan) => void;
  scan: Pick<PendingScan, 'bookingType'>;
  size?: 'icon' | 'icon-lg';
}>) {
  if (isSwitchBookingType(bookingType)) {
    return <FlipButton scan={{ bookingType }} size={size} onUpdate={onSave} />;
  }
  const meta = { icon: bookingTypeIcon[bookingType] };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-muted-foreground',
        size === 'icon' ? 'size-8' : 'size-9',
      )}
    >
      <meta.icon
        role="img"
        aria-label={bookingTypeLabel[bookingType]}
        className="size-4"
      />
    </span>
  );
}
