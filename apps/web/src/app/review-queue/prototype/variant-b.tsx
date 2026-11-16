// PROTOTYPE. Variant B: a tab for each booking type. Each tab has the columns
// of its booking type: the Consume tab has a "Takes from" column and a
// Spoiled column, and the Transfer tab has a "To" select in the row. The tab
// is the booking type filter. The bulk edit acts on one booking type, so it
// shows only the fields of that type. A flip moves the row to the other tab.
import { cn } from 'cn';
import { useState } from 'react';

import type { PrototypeQueue } from './use-prototype-queue';

import { BulkBar, BulkEditDialog } from './prototype-bulk-edit';
import {
  BOOKING_TYPES,
  type BookingType,
  type Row,
  TYPE,
} from './prototype-data';
import { ResultPanel } from './prototype-result-panel';
import { RowFormDialog } from './prototype-row-form';
import { stateOf } from './prototype-state';
import { TypeTable } from './variant-b-table';

function Tab({
  isCurrent,
  onClick,
  queue,
  type,
}: Readonly<{
  isCurrent: boolean;
  onClick: () => void;
  queue: PrototypeQueue;
  type: BookingType;
}>) {
  const rows = queue.rows.filter((row) => row.bookingType === type);
  const open = rows.filter((row) => stateOf(row) !== 'ready').length;
  const meta = TYPE[type];
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isCurrent}
      className={cn(
        '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm',
        isCurrent
          ? 'border-primary font-medium text-foreground'
          : 'border-transparent text-muted-foreground',
      )}
      onClick={onClick}
    >
      <meta.icon className="size-4" /> {meta.label}
      <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">
        {rows.length}
      </span>
      {open > 0 && (
        <span
          className="
            rounded-full bg-destructive/15 px-1.5 text-xs text-destructive
            tabular-nums
          "
          title="Rows that need something"
        >
          {open}
        </span>
      )}
    </button>
  );
}

export function VariantB({ queue }: Readonly<{ queue: PrototypeQueue }>) {
  const [type, setType] = useState<BookingType>('consume');
  const [editRow, setEditRow] = useState<null | Row>(null);
  const [bulkRows, setBulkRows] = useState<null | readonly Row[]>(null);
  const shown = queue.rows.filter((row) => row.bookingType === type);
  return (
    <>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b">
        {BOOKING_TYPES.map((item) => {
          return (
            <Tab
              key={item}
              isCurrent={item === type}
              queue={queue}
              type={item}
              onClick={() => {
                setType(item);
                queue.setChecked([]);
              }}
            />
          );
        })}
      </div>
      <BulkBar queue={queue} shown={shown} onEdit={setBulkRows} />
      <ResultPanel queue={queue} />
      <TypeTable queue={queue} rows={shown} type={type} onEdit={setEditRow} />
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
