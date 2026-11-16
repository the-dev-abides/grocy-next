// PROTOTYPE. The row form in a dialog.
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

import type { Row } from './prototype-data';
import type { StockMap } from './prototype-plan';
import type { PrototypeQueue } from './use-prototype-queue';

import { RowFields } from './prototype-row-fields';
import { nameOfRow } from './prototype-text';

function RowFormBody({
  onClose,
  onSave,
  row,
  stock,
}: Readonly<{
  onClose: () => void;
  onSave: (row: Row) => void;
  row: Row;
  stock: StockMap;
}>) {
  const [form, setForm] = useState(row);
  return (
    <>
      <RowFields
        row={form}
        stock={stock}
        patch={(fields) => {
          setForm((current) => ({ ...current, ...fields }));
        }}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onSave(form);
            onClose();
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

export function RowFormDialog({
  onClose,
  queue,
  row,
}: Readonly<{ onClose: () => void; queue: PrototypeQueue; row: null | Row }>) {
  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row === null ? '' : nameOfRow(row)}</DialogTitle>
          <DialogDescription>
            The changes stay on the pending scan until the accept.
          </DialogDescription>
        </DialogHeader>
        {row !== null && (
          <RowFormBody
            row={row}
            stock={queue.stock}
            onClose={onClose}
            onSave={(next) => {
              const { id, ...patch } = next;
              queue.edit([id], patch);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
