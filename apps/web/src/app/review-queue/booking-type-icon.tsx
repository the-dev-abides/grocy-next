import { cn } from 'cn';
import {
  ArrowRightLeft,
  ClipboardList,
  type LucideIcon,
  ScanBarcode,
  Utensils,
} from 'lucide-react';

import type { PendingScan, UpdatePendingScan } from '../api/next-api';

import { FlipButton } from '../scan/flip-button';
import { bookingTypeLabel } from './row-text';

// The icon of each booking type. The icons are the icons of the scan screens:
// the barcode of Purchase, the clipboard of Inventory, the fork and knife of
// Consume, and the two arrows of Transfer.
const bookingTypeIcon: Readonly<
  Record<PendingScan['bookingType'], { icon: LucideIcon }>
> = {
  consume: { icon: Utensils },
  inventory: { icon: ClipboardList },
  purchase: { icon: ScanBarcode },
  transfer: { icon: ArrowRightLeft },
};

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
  if (bookingType === 'consume' || bookingType === 'transfer') {
    return <FlipButton scan={{ bookingType }} size={size} onUpdate={onSave} />;
  }
  const meta = bookingTypeIcon[bookingType];
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
