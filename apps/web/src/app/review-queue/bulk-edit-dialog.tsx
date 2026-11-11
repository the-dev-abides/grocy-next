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

import type { PendingScan, UpdatePendingScan } from '../api/next-api';
import type { BulkEdit } from './bulk-edit';
import type { QueueLists } from './use-review-queue';

import { bulkEditBody, EMPTY_BULK_EDIT } from './bulk-edit';
import { BulkEditFields } from './bulk-edit-fields';

function fieldsText(fieldCount: number, rowCount: number): string {
  if (fieldCount === 0) {
    return 'No field set.';
  }
  const fields = fieldCount === 1 ? 'field changes' : 'fields change';
  const rows = rowCount === 1 ? 'row' : 'rows';
  return `${String(fieldCount)} ${fields} on ${String(rowCount)} ${rows}.`;
}

// The form of the dialog. The dialog mounts it when it opens, so every field
// starts empty every time.
function BulkEditForm({
  lists,
  onApply,
  onClose,
  rowCount,
}: Readonly<{
  lists: QueueLists;
  onApply: (body: UpdatePendingScan) => void;
  onClose: () => void;
  rowCount: number;
}>) {
  const [edit, setEdit] = useState<BulkEdit>(EMPTY_BULK_EDIT);
  const body = bulkEditBody(edit);
  const fieldCount = Object.keys(body).length;
  return (
    <>
      <BulkEditFields
        edit={edit}
        lists={lists}
        patch={(fields) => {
          setEdit((current) => ({ ...current, ...fields }));
        }}
      />
      <DialogFooter className="sm:items-center">
        <span className="mr-auto text-xs text-muted-foreground">
          {fieldsText(fieldCount, rowCount)}
        </span>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={fieldCount === 0}
          onClick={() => {
            onApply(body);
            onClose();
          }}
        >
          Apply
        </Button>
      </DialogFooter>
    </>
  );
}

// The bulk edit dialog of the spec: one update per checked row with only the
// fields that the user set. Every field starts empty.
export function BulkEditDialog({
  lists,
  onApply,
  onClose,
  rows,
}: Readonly<{
  lists: QueueLists;
  onApply: (body: UpdatePendingScan) => void;
  onClose: () => void;
  rows: null | readonly PendingScan[];
}>) {
  const count = rows?.length ?? 0;
  return (
    <Dialog
      open={rows !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit {count} pending {count === 1 ? 'scan' : 'scans'}
          </DialogTitle>
          <DialogDescription>
            Every field starts empty. Only a field that you set changes on the
            rows.
          </DialogDescription>
        </DialogHeader>
        {rows !== null && (
          <BulkEditForm
            lists={lists}
            rowCount={count}
            onApply={onApply}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
