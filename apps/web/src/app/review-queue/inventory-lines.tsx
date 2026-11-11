import { cn } from 'cn';

import type { PendingScan, Product } from '../api/next-api';
import type { QueueLists } from './use-review-queue';

import {
  differenceOf,
  differenceText,
  effectText,
  stockLineText,
} from './inventory-preview';

// The difference as a badge: green for an increase, red for a decrease, and
// muted words for no change, as the prototype showed it.
function DifferenceBadge({
  difference,
  unit,
}: Readonly<{ difference: number; unit: string }>) {
  return (
    <span
      className={cn(
        'rounded-sm px-1.5 font-medium tabular-nums',
        difference > 0 &&
          `
            bg-green-600/15 text-green-700
            dark:text-green-400
          `,
        difference < 0 &&
          `
            bg-red-600/15 text-red-700
            dark:text-red-400
          `,
      )}
    >
      {differenceText(difference, unit)}
    </span>
  );
}

// The Inventory facts of a row, under the name. The first line is the Grocy
// stock with the parent and tare weight notes. When the count is set, the lines
// also show the difference and what the accept does.
export function InventoryLines({
  lists,
  product,
  scan,
  unit,
}: Readonly<{
  lists: QueueLists;
  product: Product | undefined;
  scan: PendingScan;
  unit: string;
}>) {
  if (product === undefined || scan.bookingType !== 'inventory') {
    return null;
  }
  const effect =
    scan.amount === null
      ? null
      : effectText(
          { ...scan, amount: scan.amount },
          product,
          unit,
          lists.locations,
        );
  const isBelowTare =
    scan.amount !== null &&
    product.tareWeight !== null &&
    scan.amount < product.tareWeight;
  return (
    <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
      <p>
        {stockLineText(product, unit)}
        {scan.amount !== null && (
          <>
            {' '}
            <DifferenceBadge
              difference={differenceOf(scan.amount, product)}
              unit={unit}
            />
          </>
        )}
      </p>
      {effect !== null && (
        <p className={cn(isBelowTare && 'text-destructive')}>{effect}</p>
      )}
    </div>
  );
}
