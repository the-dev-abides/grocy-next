// PROTOTYPE. The bulk edit dialog and the bulk actions above the rows.
import { Check, LayoutGrid, Pencil, Table2, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { PrototypeQueue } from './use-prototype-queue';

import { BulkFields, bulkPatch, EMPTY_BULK } from './prototype-bulk-fields';
import { type BookingType, type Row, TYPE } from './prototype-data';
import { canAccept, stateOf } from './prototype-state';

// The counts of the booking types in a list of rows, such as "2 Consume, 1
// Transfer".
function typeCounts(rows: readonly Row[]): string {
  const counts = new Map<BookingType, number>();
  for (const item of rows) {
    counts.set(item.bookingType, (counts.get(item.bookingType) ?? 0) + 1);
  }
  const parts: string[] = [];
  for (const [type, count] of counts) {
    parts.push(`${String(count)} ${TYPE[type].label}`);
  }
  return parts.join(', ');
}

export function BulkEditDialog({
  onClose,
  queue,
  rows,
}: Readonly<{
  onClose: () => void;
  queue: PrototypeQueue;
  rows: null | readonly Row[];
}>) {
  const [form, setForm] = useState(EMPTY_BULK);
  const close = () => {
    setForm(EMPTY_BULK);
    onClose();
  };
  return (
    <Dialog
      open={rows !== null}
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {rows?.length ?? 0} rows</DialogTitle>
          <DialogDescription>
            {rows === null ? '' : typeCounts(rows)}. Keep leaves the field as it
            is.
          </DialogDescription>
        </DialogHeader>
        {rows !== null && <BulkFields form={form} rows={rows} set={setForm} />}
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (rows != null) {
                for (const item of rows) {
                  queue.edit([item.id], bulkPatch(form, item));
                }
              }
              close();
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The bulk actions on the checked rows. The accept acts on all shown rows
// when no row is checked.
export function BulkBar({
  onEdit,
  queue,
  shown,
}: Readonly<{
  onEdit: (rows: readonly Row[]) => void;
  queue: PrototypeQueue;
  shown: readonly Row[];
}>) {
  const checked = shown.filter((item) => queue.checked.includes(item.id));
  const target = checked.length > 0 ? checked : shown;
  const ready = target.filter((item) => canAccept(stateOf(item)));
  const label =
    checked.length > 0
      ? `${String(checked.length)} checked`
      : `all ${String(shown.length)} shown`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Button
        size="sm"
        disabled={ready.length === 0}
        onClick={() => {
          queue.acceptAll(ready.map((item) => item.id));
        }}
      >
        <Check data-icon="inline-start" /> Accept {ready.length}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={checked.length === 0}
        onClick={() => {
          onEdit(checked);
        }}
      >
        <Pencil data-icon="inline-start" /> Edit
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={checked.length === 0}
        onClick={() => {
          queue.rejectAll(checked.map((item) => item.id));
        }}
      >
        <X data-icon="inline-start" /> Reject
      </Button>
    </div>
  );
}

export function ViewSwitch({
  isTable,
  set,
}: Readonly<{ isTable: boolean; set: (isTable: boolean) => void }>) {
  return (
    <div className="flex gap-1 self-start rounded-lg border p-0.5">
      <Button
        size="sm"
        variant={isTable ? 'secondary' : 'ghost'}
        onClick={() => {
          set(true);
        }}
      >
        <Table2 data-icon="inline-start" /> Table
      </Button>
      <Button
        size="sm"
        variant={isTable ? 'ghost' : 'secondary'}
        onClick={() => {
          set(false);
        }}
      >
        <LayoutGrid data-icon="inline-start" /> Cards
      </Button>
    </div>
  );
}
