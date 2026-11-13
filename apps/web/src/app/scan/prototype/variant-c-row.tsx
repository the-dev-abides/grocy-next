// PROTOTYPE. The row of variant C. The row is one quiet line. A tap opens
// it. The open row has the booking type, the amount, the locations, and the
// spoiled flag.
import { cn } from 'cn';
import { ChevronDown, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { PrototypeRow } from './prototype-data';
import type { PrototypeSession } from './use-prototype-session';

import { timeOf } from '../scan-text';
import {
  amountText,
  BOOKING_TYPES,
  HINT_TEXT,
  isWithoutTo,
  MODE,
  placeText,
  stockHintOf,
} from './prototype-data';
import { AmountStepper, InlineSelect, RowName } from './prototype-parts';

type RowProperties = Readonly<{ row: PrototypeRow; session: PrototypeSession }>;

function TypeRadio({ row, session }: RowProperties) {
  return (
    <div
      role="radiogroup"
      aria-label="Booking type"
      className="flex flex-1 overflow-hidden rounded-md border"
    >
      {BOOKING_TYPES.map((type) => {
        const isOn = row.bookingType === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={isOn}
            className={cn(
              'h-8 flex-1 font-medium',
              isOn ? MODE[type].solid : 'text-muted-foreground',
            )}
            onClick={() => {
              session.update(row.id, { bookingType: type });
            }}
          >
            {MODE[type].label}
          </button>
        );
      })}
    </div>
  );
}

function RowLocations({ row, session }: RowProperties) {
  return (
    <div
      className="
        grid gap-2
        sm:grid-cols-2
      "
    >
      <InlineSelect
        label="From"
        none="Product default"
        value={row.fromLocationId}
        onChange={(fromLocationId) => {
          session.update(row.id, { fromLocationId });
        }}
      />
      {row.bookingType === 'transfer' && (
        <InlineSelect
          label="To"
          none="Not set"
          value={row.toLocationId}
          onChange={(toLocationId) => {
            session.update(row.id, { toLocationId });
          }}
        />
      )}
    </div>
  );
}

// The booking type and the fields of an open row.
function RowPanel({ row, session }: RowProperties) {
  return (
    <div className="flex flex-col gap-2 pt-1 pb-2">
      <div className="flex items-center gap-2">
        <TypeRadio row={row} session={session} />
        <AmountStepper row={row} session={session} />
      </div>
      <RowLocations row={row} session={session} />
      <div className="flex items-center gap-2">
        {row.bookingType === 'consume' && (
          <label className="flex h-8 flex-1 items-center gap-2">
            <input
              type="checkbox"
              className="size-4"
              checked={row.spoiled}
              onChange={(event) => {
                session.update(row.id, { spoiled: event.target.checked });
              }}
            />
            Spoiled
          </label>
        )}
        <Button
          variant="destructive"
          size="sm"
          className="ml-auto"
          onClick={() => {
            session.reject(row.id);
          }}
        >
          <Trash2 data-icon="inline-start" /> Reject
        </Button>
      </div>
    </div>
  );
}

export function VariantCRow({
  isOpen,
  onToggle,
  row,
  session,
}: Readonly<{
  isOpen: boolean;
  onToggle: () => void;
  row: PrototypeRow;
  session: PrototypeSession;
}>) {
  const mode = MODE[row.bookingType];
  const hint = HINT_TEXT[stockHintOf(row)];
  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        className="flex min-h-14 w-full items-center gap-2 py-1 text-left"
        onClick={onToggle}
      >
        <span
          className={cn(
            'w-18 shrink-0 rounded-sm py-0.5 text-center text-xs font-medium',
            mode.solid,
          )}
        >
          {mode.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <RowName row={row} />
            <span className="tabular-nums">{amountText(row)}</span>
          </span>
          <span
            className={cn(
              'block truncate text-xs text-muted-foreground',
              isWithoutTo(row) && 'font-medium text-destructive',
            )}
          >
            <time dateTime={row.scannedAt}>{timeOf(row.scannedAt)}</time>
            {' · '}
            {placeText(row)}
            {hint !== '' && ` · ${hint}`}
            {row.spoiled && ' · Spoiled'}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen && <RowPanel row={row} session={session} />}
    </>
  );
}
