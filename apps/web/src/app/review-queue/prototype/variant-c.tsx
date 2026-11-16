// PROTOTYPE. Variant C: the rows grouped by product. Each group shows the
// Grocy stock entries of the product and what the rows do to each entry, in
// the order that the accept books them. The rows of all four booking types
// sit together in the group. Chips filter by booking type. Each group has an
// accept for all its ready rows.
import { cn } from 'cn';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { PrototypeQueue } from './use-prototype-queue';

import { BulkBar, BulkEditDialog } from './prototype-bulk-edit';
import {
  BOOKING_TYPES,
  type BookingType,
  canFlip,
  productOf,
  type Row,
  TYPE,
} from './prototype-data';
import { ResultPanel } from './prototype-result-panel';
import { RowFormDialog } from './prototype-row-form';
import { canAccept, stateOf } from './prototype-state';
import { amountText, takenOf } from './prototype-text';
import { GroupRow, StockEntries } from './variant-c-group';

function TypeChips({
  set,
  types,
}: Readonly<{
  set: (types: BookingType[]) => void;
  types: readonly BookingType[];
}>) {
  return (
    <div className="flex flex-wrap gap-2">
      {BOOKING_TYPES.map((type) => {
        const isOn = types.includes(type);
        const meta = TYPE[type];
        return (
          <Button
            key={type}
            size="sm"
            variant={isOn ? 'secondary' : 'outline'}
            aria-pressed={isOn}
            className={cn(!isOn && 'text-muted-foreground')}
            onClick={() => {
              set(
                isOn ? types.filter((item) => item !== type) : [...types, type],
              );
            }}
          >
            <meta.icon data-icon="inline-start" /> {meta.label}
          </Button>
        );
      })}
    </div>
  );
}

interface Group {
  key: string;
  productId: null | number;
  rows: Row[];
}

function groupsOf(rows: readonly Row[]): Group[] {
  const groups: Group[] = [];
  for (const row of rows) {
    const key =
      row.productId === null
        ? `code:${row.code}`
        : `product:${String(row.productId)}`;
    const group = groups.find((item) => item.key === key);
    if (group === undefined) {
      groups.push({ key, productId: row.productId, rows: [row] });
    } else {
      group.rows.push(row);
    }
  }
  return groups;
}

function stockTotal(queue: PrototypeQueue, productId: number): number {
  const entries = queue.stock.get(productId);
  if (entries === undefined) {
    return 0;
  }
  let sum = 0;
  for (const entry of entries) {
    sum += entry.amount;
  }
  return sum;
}

// The stock after the accept of all rows of the group. The oldest row books
// first. An Inventory row sets the stock.
function stockAfter(queue: PrototypeQueue, group: Group, start: number) {
  let sum = start;
  for (const row of group.rows.toReversed()) {
    const plan = queue.plans.get(row.id);
    if (row.bookingType === 'inventory') {
      sum = row.amount ?? sum;
    } else if (row.bookingType === 'purchase') {
      sum += row.amount ?? 0;
    } else if (plan !== undefined && row.bookingType === 'consume') {
      sum -= takenOf(plan);
    }
  }
  return Math.max(0, sum);
}

function GroupHeader({
  group,
  queue,
}: Readonly<{ group: Group; queue: PrototypeQueue }>) {
  const product = productOf(group.productId);
  const ready = group.rows.filter((row) => canAccept(stateOf(row)));
  const unit = product?.units[0]?.name ?? '';
  const now = product === undefined ? 0 : stockTotal(queue, product.id);
  return (
    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2
        className={cn(
          'text-base font-medium',
          product === undefined && 'font-mono text-muted-foreground',
        )}
      >
        {product?.name ?? group.rows[0]?.code}
      </h2>
      {product !== undefined && (
        <span className="text-sm text-muted-foreground tabular-nums">
          In stock {amountText(now, unit)}. After the accept{' '}
          {amountText(stockAfter(queue, group, now), unit)}.
        </span>
      )}
      <Button
        size="sm"
        className="ml-auto"
        disabled={ready.length === 0}
        onClick={() => {
          queue.acceptAll(ready.map((row) => row.id));
        }}
      >
        <Check data-icon="inline-start" /> Accept {ready.length}
      </Button>
    </header>
  );
}

function GroupCard({
  group,
  onEdit,
  queue,
}: Readonly<{
  group: Group;
  onEdit: (row: Row) => void;
  queue: PrototypeQueue;
}>) {
  const hasMoves = group.rows.some((row) => canFlip(row.bookingType));
  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <GroupHeader group={group} queue={queue} />
      <ul className="flex flex-col divide-y rounded-md border">
        {group.rows.map((row) => {
          return (
            <GroupRow
              key={row.id}
              queue={queue}
              row={row}
              onEdit={() => {
                onEdit(row);
              }}
            />
          );
        })}
      </ul>
      {group.productId !== null && hasMoves && (
        <details open className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Stock entries in Grocy
          </summary>
          <div className="mt-1.5">
            <StockEntries
              productId={group.productId}
              queue={queue}
              rows={group.rows}
            />
          </div>
        </details>
      )}
    </section>
  );
}

export function VariantC({ queue }: Readonly<{ queue: PrototypeQueue }>) {
  const [types, setTypes] = useState<BookingType[]>([...BOOKING_TYPES]);
  const [editRow, setEditRow] = useState<null | Row>(null);
  const [bulkRows, setBulkRows] = useState<null | readonly Row[]>(null);
  const shown = queue.rows.filter((row) => types.includes(row.bookingType));
  return (
    <>
      <TypeChips types={types} set={setTypes} />
      <BulkBar queue={queue} shown={shown} onEdit={setBulkRows} />
      <ResultPanel queue={queue} />
      <div className="flex flex-col gap-3">
        {groupsOf(shown).map((group) => {
          return (
            <GroupCard
              key={group.key}
              group={group}
              queue={queue}
              onEdit={setEditRow}
            />
          );
        })}
      </div>
      <RowFormDialog
        queue={queue}
        row={editRow}
        onClose={() => {
          setEditRow(null);
        }}
      />
      <BulkEditDialog
        queue={queue}
        rows={bulkRows}
        onClose={() => {
          setBulkRows(null);
        }}
      />
    </>
  );
}
