import { cn } from 'cn';
import {
  ArrowRightLeft,
  ClipboardList,
  type LucideIcon,
  ScanBarcode,
  Utensils,
} from 'lucide-react';

import type { PendingScan } from '../api/next-api';

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
// booking type for a screen reader. A tap on it does nothing.
export function BookingTypeIcon({
  bookingType,
  size = 'icon',
}: Readonly<{
  bookingType: PendingScan['bookingType'];
  size?: 'icon' | 'icon-lg';
}>) {
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
