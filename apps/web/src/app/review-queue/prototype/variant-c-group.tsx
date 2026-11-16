// PROTOTYPE. One product group of variant C: the rows of the product and the
// Grocy stock entries with what the rows do to each entry.
import { cn } from 'cn';
import { Check, Pencil, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import type { PlanLine } from './prototype-plan';
import type { PrototypeQueue } from './use-prototype-queue';

import { LOCATIONS, nameOf, productOf, type Row, TYPE } from './prototype-data';
import { canAccept, stateOf } from './prototype-state';
import {
  amountOf,
  amountText,
  dueText,
  missingText,
  nameOfRow,
  timeText,
  toText,
} from './prototype-text';
import {
  ErrorLine,
  Place,
  SpoiledButton,
  StateBadge,
  TypeButton,
} from './row-parts';

// What one row does to one stock entry, such as "18:58 Consume 0.4 l".
function effectText(line: PlanLine, row: Row, unit: string): string {
  const head = `${timeText(row.scannedAt)} `;
  const amount = amountText(line.amount, unit);
  if (row.bookingType === 'transfer') {
    const split = line.kind === 'split' ? ', a split' : '';
    return `${head}Transfer ${amount} to ${toText(row)}${split}`;
  }
  const verb = row.spoiled ? 'Consume as spoiled' : 'Consume';
  if (line.kind === 'whole') {
    return `${head}${verb} ${amount}, all of it`;
  }
  const open = line.opensRest ? ', then open the rest' : '';
  return `${head}${verb} ${amount}${open}`;
}

// The stock entries of a product, each with the rows that take from it, in
// the order that the accept books them.
export function StockEntries({
  productId,
  queue,
  rows,
}: Readonly<{
  productId: number;
  queue: PrototypeQueue;
  rows: readonly Row[];
}>) {
  const product = productOf(productId);
  const entries = queue.stock.get(productId) ?? [];
  const unit = product?.units[0]?.name ?? '';
  const effectsOf = (entryId: number) => {
    return rows.toReversed().flatMap((row) => {
      const line = queue.plans
        .get(row.id)
        ?.lines.find((item) => item.entry.id === entryId);
      return line === undefined ? [] : effectText(line, row, unit);
    });
  };
  return (
    <ul className="flex flex-col divide-y rounded-md border text-xs">
      {entries.map((entry) => {
        const effects = effectsOf(entry.id);
        const state = entry.isOpened ? 'opened' : 'sealed';
        return (
          <li
            key={entry.id}
            className={cn(
              `
                flex flex-col gap-0.5 px-2 py-1.5
                sm:flex-row sm:gap-3
              `,
              effects.length === 0 && 'text-muted-foreground',
            )}
          >
            <span className="w-56 shrink-0 tabular-nums">
              {amountText(entry.amount, unit)} {state},{' '}
              {nameOf(LOCATIONS, entry.locationId)}, due{' '}
              {dueText(entry.dueDate)}
            </span>
            <span className="flex flex-col">
              {effects.length === 0
                ? 'Not touched'
                : effects.map((text) => <span key={text}>{text}</span>)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RowText({
  queue,
  row,
}: Readonly<{ queue: PrototypeQueue; row: Row }>) {
  const missing = missingText(queue.plans.get(row.id));
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm">
        <span className="font-medium tabular-nums">{amountOf(row)}</span>{' '}
        <span className="text-muted-foreground">
          {TYPE[row.bookingType].label} · <Place row={row} />
          {row.stockEntryId !== null && ' · One stock entry'}
          {row.spoiled && <span className="text-destructive"> · Spoiled</span>}
        </span>
      </p>
      {missing !== null && (
        <p className="text-xs text-destructive">{missing}</p>
      )}
      <ErrorLine row={row} />
    </div>
  );
}

function RowButtons({
  onEdit,
  queue,
  row,
}: Readonly<{ onEdit: () => void; queue: PrototypeQueue; row: Row }>) {
  return (
    <div className="flex items-center justify-end gap-1">
      <StateBadge row={row} />
      <SpoiledButton
        row={row}
        onToggle={() => {
          queue.toggleSpoiled(row.id);
        }}
      />
      <Button variant="ghost" size="icon" aria-label="Edit" onClick={onEdit}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reject"
        onClick={() => {
          queue.rejectAll([row.id]);
        }}
      >
        <X />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Accept"
        disabled={!canAccept(stateOf(row))}
        onClick={() => {
          queue.acceptAll([row.id]);
        }}
      >
        <Check />
      </Button>
    </div>
  );
}

export function GroupRow({
  onEdit,
  queue,
  row,
}: Readonly<{ onEdit: () => void; queue: PrototypeQueue; row: Row }>) {
  return (
    <li
      className={cn(
        `
          flex flex-col gap-1 px-2 py-1.5
          sm:flex-row sm:items-center sm:gap-2
        `,
        row.error !== null && 'bg-row-expired',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Checkbox
          aria-label={`Check ${nameOfRow(row)}`}
          checked={queue.checked.includes(row.id)}
          onCheckedChange={() => {
            queue.toggleChecked(row.id);
          }}
        />
        <TypeButton
          row={row}
          onFlip={() => {
            queue.flip([row.id]);
          }}
        />
        <RowText queue={queue} row={row} />
      </div>
      <RowButtons queue={queue} row={row} onEdit={onEdit} />
    </li>
  );
}
