import { Button } from '@/components/ui/button';

import type { PendingScan, UpdatePendingScan } from '../api/next-api';

import { bookingTypeIcon, isSwitchBookingType } from '../booking-types';
import { flipLabel, flippedBookingType } from './booking-flip';

// The icon of a Consume row or a Transfer row as a button: the fork and knife
// of Consume and the two arrows of Transfer. A tap sends one update with the
// other booking type. The scan screen and the review queue use it. A Purchase
// row and an Inventory row get no button.
export function FlipButton({
  onUpdate,
  scan: { bookingType },
  size = 'icon',
}: Readonly<{
  onUpdate: (patch: UpdatePendingScan) => void;
  scan: Pick<PendingScan, 'bookingType'>;
  size?: 'icon' | 'icon-lg';
}>) {
  if (!isSwitchBookingType(bookingType)) {
    return null;
  }
  const flipped = flippedBookingType(bookingType);
  const label = flipLabel(bookingType);
  const meta = { icon: bookingTypeIcon[bookingType] };
  return (
    <Button
      variant="ghost"
      size={size}
      aria-label={label}
      title={label}
      className="shrink-0 text-primary"
      onClick={() => {
        onUpdate({ bookingType: flipped });
      }}
    >
      <meta.icon aria-hidden="true" />
    </Button>
  );
}
