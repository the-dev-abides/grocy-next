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

import type { PendingScan, Product, UpdatePendingScan } from '../api/next-api';
import type { QueueLists } from './use-review-queue';

import { rowFormBody, rowFormOf } from './row-form';
import { RowFormFields } from './row-form-fields';

interface FormProperties {
  lists: QueueLists;
  onClose: () => void;
  onPick: () => void;
  onSave: (body: UpdatePendingScan) => void;
  product: Product | undefined;
  scan: PendingScan;
}

// The form of the dialog. The dialog mounts it when it opens, so the form
// starts from the fields of the row every time.
function RowFormBody({
  lists,
  onClose,
  onPick,
  onSave,
  product,
  scan,
}: Readonly<FormProperties>) {
  const [form, setForm] = useState(() => rowFormOf(scan));
  return (
    <>
      <RowFormFields
        form={form}
        lists={lists}
        patch={(fields) => {
          setForm((current) => ({ ...current, ...fields }));
        }}
        product={product}
        scan={scan}
      />
      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" onClick={onPick}>
          {scan.productId === null ? 'Pick a product' : 'Change the product'}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(rowFormBody(form));
              onClose();
            }}
          >
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

// The full form of one row, as in the prototype: every field of the row and
// Change the product, which opens the product pick dialog. Save sends one
// update with every field.
export function RowFormDialog({
  isOpen,
  name,
  ...props
}: Readonly<FormProperties & { isOpen: boolean; name: string }>) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          props.onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            {props.scan.bookingType === 'inventory'
              ? 'Inventory. The accept sets the stock to the count.'
              : 'Purchase. The accept adds one stock entry.'}
          </DialogDescription>
        </DialogHeader>
        {isOpen && <RowFormBody {...props} />}
      </DialogContent>
    </Dialog>
  );
}
