// PROTOTYPE. The row of variant A: a chip with the booking type that flips
// on a tap, the open as words, and a "Spoiled" chip on a Consume row.
import { cn } from 'cn';
import { Repeat2 } from 'lucide-react';

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

function SpoiledChip({
  row,
  session,
}: Readonly<{ row: PrototypeRow; session: PrototypeSession }>) {
  return (
    <button
      type="button"
      aria-pressed={row.spoiled}
      className={cn(
        'rounded-full border px-2 py-0.5',
        row.spoiled &&
          'border-destructive bg-destructive font-medium text-white',
      )}
      onClick={() => {
        session.update(row.id, { spoiled: !row.spoiled });
      }}
    >
      Spoiled
    </button>
  );
}

export function VariantARow({
  row,
  session,
}: Readonly<{ row: PrototypeRow; session: PrototypeSession }>) {
  const mode = MODE[row.bookingType];
  const other = otherType(row.bookingType);
  const hint = HINT_TEXT[stockHintOf(row)];
  return (
    <>
      <div className="min-w-0 flex-1">
        <RowName row={row} />
        <div
          className="
            flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs
            text-muted-foreground
          "
        >
          <button
            type="button"
            aria-label={`${mode.label}. Change to ${MODE[other].label}.`}
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
              mode.solid,
            )}
            onClick={() => {
              session.update(row.id, { bookingType: other });
            }}
          >
            {mode.label} <Repeat2 className="size-3" />
          </button>
          <span
            className={cn(isWithoutTo(row) && 'font-medium text-destructive')}
          >
            <time dateTime={row.scannedAt}>{timeOf(row.scannedAt)}</time>
            {' · '}
            {placeText(row)}
          </span>
          {hint !== '' && (
            <span className="font-medium text-foreground">{hint}</span>
          )}
          {row.bookingType === 'consume' && (
            <SpoiledChip row={row} session={session} />
          )}
        </div>
      </div>
      <AmountStepper row={row} session={session} />
      <RejectButton
        onReject={() => {
          session.reject(row.id);
        }}
      />
    </>
  );
}
