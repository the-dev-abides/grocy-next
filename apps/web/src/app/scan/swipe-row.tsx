import type { ReactNode } from 'react';

import { cn } from 'cn';
import { Trash2 } from 'lucide-react';

import { useSwipe } from './use-swipe';

// A list row that the user swipes to the left to reject. A short drag snaps
// back. A drag past a third of the row width slides the row out over the red
// layer and calls `onReject`. The row keeps the vertical scroll of the page.
// A rounded row, such as a card of the review queue, rounds the red layer
// too.
export function SwipeRow({
  children,
  className,
  isRounded = false,
  onReject,
}: Readonly<{
  children: ReactNode;
  className?: string;
  isRounded?: boolean;
  onReject: () => void;
}>) {
  const { dragX, handlers, isGone } = useSwipe(onReject);

  return (
    <li className={cn('relative overflow-hidden', isRounded && 'rounded-lg')}>
      <div
        aria-hidden="true"
        className="
          absolute inset-0 flex items-center justify-end gap-2 bg-destructive
          pr-4 text-sm font-medium text-white
        "
      >
        <Trash2 className="size-4" /> Reject
      </div>
      <div
        className={cn(
          'relative touch-pan-y',
          className,
          (dragX === 0 || isGone) && 'transition-transform duration-150',
        )}
        style={{ transform: `translateX(${String(dragX)}px)` }}
        {...handlers}
      >
        {children}
      </div>
    </li>
  );
}
