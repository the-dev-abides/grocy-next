// PROTOTYPE. The row of variant B: a colour band, an icon, badges for the
// open and the spoiled flag, and an icon button that flips the booking type.
import type { ReactNode } from 'react';

import { cn } from 'cn';
import { PackageOpen, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { PrototypeRow } from './prototype-data';
import type { PrototypeSession } from './use-prototype-session';

import { RejectButton } from '../pending-scan-row';
import { timeOf } from '../scan-text';
import {
  HINT_TEXT,
  isWithoutTo,
  MODE,
  otherType,
  placeText,
  stockHintOf,
} from './prototype-data';
import { AmountStepper, RowName } from './prototype-parts';

function Badge({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <span
      className={cn(
        `
          inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-xs
          font-medium
        `,
        className,
      )}
    >
      {children}
    </span>
  );
}

// The badges of a row: the open on consume and the spoiled flag.
function RowBadges({ row }: Readonly<{ row: PrototypeRow }>) {
  const hint = stockHintOf(row);
  return (
    <div
      className="
        flex flex-wrap gap-1
        empty:hidden
      "
    >
      {hint !== 'none' && (
        <Badge className={cn(hint === 'short' && 'text-destructive')}>
          {hint === 'opens' && <PackageOpen className="size-3" />}
          {HINT_TEXT[hint]}
        </Badge>
      )}
      {row.spoiled && (
        <Badge className="border-destructive text-destructive">
          <Trash className="size-3" /> Spoiled
        </Badge>
      )}
    </div>
  );
}

export function VariantBRow({
  row,
  session,
}: Readonly<{ row: PrototypeRow; session: PrototypeSession }>) {
  const mode = MODE[row.bookingType];
  const other = MODE[otherType(row.bookingType)];
  return (
    <>
      <mode.icon
        aria-label={mode.label}
        className={cn('size-5 shrink-0', mode.text)}
      />
      <div className="min-w-0 flex-1">
        <RowName row={row} />
        <p
          className={cn(
            'truncate text-xs text-muted-foreground',
            isWithoutTo(row) && 'font-medium text-destructive',
          )}
        >
          <time dateTime={row.scannedAt}>{timeOf(row.scannedAt)}</time>
          {' · '}
          {placeText(row)}
        </p>
        <RowBadges row={row} />
      </div>
      <AmountStepper row={row} session={session} />
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Change to ${other.label}`}
        title={`Change to ${other.label}`}
        onClick={() => {
          session.update(row.id, { bookingType: otherType(row.bookingType) });
        }}
      >
        <other.icon />
      </Button>
      <RejectButton
        onReject={() => {
          session.reject(row.id);
        }}
      />
    </>
  );
}
