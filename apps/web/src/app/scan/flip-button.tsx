import { ArrowRightLeft, Utensils } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { flipLabel, flippedBookingType } from './booking-flip';

const flipIcon = {
  consume: { icon: Utensils },
  transfer: { icon: ArrowRightLeft },
} as const;

// The icon of a Consume row or a Transfer row as a button: the fork and knife
// of Consume and the two arrows of Transfer. A tap flips the row to the other
// booking type. The scan screen and the review queue use it.
export function FlipButton({
  bookingType,
  onFlip,
  size = 'icon',
}: Readonly<{
  bookingType: 'consume' | 'transfer';
  onFlip: (bookingType: 'consume' | 'transfer') => void;
  size?: 'icon' | 'icon-lg';
}>) {
  const label = flipLabel(bookingType);
  const meta = flipIcon[bookingType];
  return (
    <Button
      variant="ghost"
      size={size}
      aria-label={label}
      title={label}
      className="shrink-0 text-primary"
      onClick={() => {
        const other = flippedBookingType(bookingType);
        if (other !== undefined) {
          onFlip(other);
        }
      }}
    >
      <meta.icon aria-hidden="true" />
    </Button>
  );
}
