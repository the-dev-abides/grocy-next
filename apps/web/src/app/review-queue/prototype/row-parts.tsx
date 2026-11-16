// PROTOTYPE. Parts of a row that every variant uses: the booking type icon,
// the state badge, the spoiled flag, the locations, the fact line, the stock
// entry lines, and the error line.
import { cn } from 'cn';
import { AlertTriangle, Trash, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { Plan } from './prototype-plan';

import {
  canFlip,
  LOCATIONS,
  nameOf,
  productOf,
  type Row,
  STORES,
  TYPE,
} from './prototype-data';
import { type RowState, STATE_LABEL, stateOf } from './prototype-state';
import {
  dueText,
  lineText,
  missingText,
  openText,
  timeText,
  toText,
} from './prototype-text';

export function TypeIcon({ row }: Readonly<{ row: Row }>) {
  const meta = TYPE[row.bookingType];
  return <meta.icon className="size-4" />;
}

// The booking type icon. On a Consume row and a Transfer row, a tap flips
// the booking type, as on the Consume and Transfer scan screen.
export function TypeButton({
  onFlip,
  row,
  size = 'icon',
}: Readonly<{ onFlip: () => void; row: Row; size?: 'icon' | 'icon-lg' }>) {
  const { label } = TYPE[row.bookingType];
  if (!canFlip(row.bookingType)) {
    return (
      <span
        title={label}
        className={cn(
          `
            inline-flex shrink-0 items-center justify-center
            text-muted-foreground
          `,
          size === 'icon' ? 'size-8' : 'size-9',
        )}
      >
        <TypeIcon row={row} />
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  const other = row.bookingType === 'consume' ? 'Transfer' : 'Consume';
  return (
    <Button
      variant="outline"
      size={size}
      className="shrink-0 text-primary"
      aria-label={`${label}. Change to ${other}.`}
      title={`${label}. Tap to change to ${other}.`}
      onClick={onFlip}
    >
      <TypeIcon row={row} />
    </Button>
  );
}

const badgeVariant: Record<RowState, 'destructive' | 'outline' | 'secondary'> =
  {
    failed: 'destructive',
    'needs-count': 'secondary',
    'needs-product': 'secondary',
    'needs-to': 'secondary',
    ready: 'outline',
  };

export function StateBadge({ row }: Readonly<{ row: Row }>) {
  const state = stateOf(row);
  return (
    <Badge
      variant={badgeVariant[state]}
      className={cn(
        'font-normal',
        state === 'ready' && 'text-muted-foreground',
      )}
    >
      {STATE_LABEL[state]}
    </Badge>
  );
}

// The spoiled flag of a Consume row: a trash can that is red when it is on.
export function SpoiledButton({
  onToggle,
  row,
}: Readonly<{ onToggle: () => void; row: Row }>) {
  if (row.bookingType !== 'consume') {
    return null;
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={row.spoiled}
      aria-label="Spoiled"
      title={row.spoiled ? 'Spoiled. Tap to clear.' : 'Mark as spoiled'}
      className={cn(
        row.spoiled &&
          `
            text-destructive
            hover:text-destructive
          `,
      )}
      onClick={onToggle}
    >
      {row.spoiled ? <Trash2 /> : <Trash />}
    </Button>
  );
}

// The locations of a row. A Transfer shows "From → To". A Consume with no
// "from" location takes from any location.
export function placeText(row: Row): string {
  const product = productOf(row.productId);
  const fallback =
    product === undefined
      ? 'Default'
      : nameOf(LOCATIONS, product.defaultLocationId);
  const from =
    row.locationId === null ? fallback : nameOf(LOCATIONS, row.locationId);
  if (row.bookingType === 'transfer') {
    return `${from} → ${toText(row)}`;
  }
  if (row.bookingType === 'consume' && row.locationId === null) {
    return 'Any location';
  }
  return from;
}

// A Transfer with no "to" location shows its locations in red.
export function Place({ row }: Readonly<{ row: Row }>) {
  const isMissing = row.bookingType === 'transfer' && row.toLocationId === null;
  return (
    <span className={cn(isMissing && 'text-destructive')}>
      {placeText(row)}
    </span>
  );
}

function factParts(row: Row): string[] {
  const purchase =
    row.bookingType === 'purchase' && row.price !== null
      ? [`${row.price.toFixed(2)} at ${nameOf(STORES, row.storeId)}`]
      : [];
  const due = row.dueDate === null ? [] : [`due ${dueText(row.dueDate)}`];
  return [
    TYPE[row.bookingType].label,
    timeText(row.scannedAt),
    ...purchase,
    ...due,
  ];
}

// The short facts of a row on one line: the booking type, the time, the
// Purchase facts, the locations, the open on consume, and spoiled.
export function FactLine({
  plan,
  row,
}: Readonly<{ plan: Plan | undefined; row: Row }>) {
  const open = row.bookingType === 'consume' ? openText(plan) : null;
  return (
    <p className="text-xs text-muted-foreground">
      {factParts(row).join(' · ')} · <Place row={row} />
      {open !== null && <> · {open}</>}
      {row.stockEntryId !== null && <> · One stock entry</>}
      {row.spoiled && <span className="text-destructive"> · Spoiled</span>}
    </p>
  );
}

// The stock entries that the accept takes, one line each, and the warning
// when the stock is too small.
export function PlanLines({
  plan,
  row,
}: Readonly<{ plan: Plan | undefined; row: Row }>) {
  if (plan === undefined) {
    return null;
  }
  const missing = missingText(plan);
  const isTransfer = row.bookingType === 'transfer';
  return (
    <ul className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
      {plan.lines.map((line) => {
        return (
          <li
            key={line.entry.id}
            className={cn(line.opensRest && 'text-foreground')}
          >
            {lineText(line, plan.unit, isTransfer)}
          </li>
        );
      })}
      {missing !== null && (
        <li className="flex items-start gap-1 text-destructive">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {missing}
        </li>
      )}
    </ul>
  );
}

export function ErrorLine({ row }: Readonly<{ row: Row }>) {
  if (row.error === null) {
    return null;
  }
  return (
    <p className="mt-0.5 flex items-start gap-1 text-xs text-destructive">
      <AlertTriangle className="mt-px size-3.5 shrink-0" />{' '}
      <span>{row.error}</span>
    </p>
  );
}
