import { Pencil } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { PendingScan, Product } from '../api/next-api';
import type { QueueLists } from './use-review-queue';
import type { RowActions } from './use-row-actions';

import { PickProductDialog } from './pick-product-dialog';
import { RowFormDialog } from './row-form-dialog';

// The Edit button of a row. It opens the full form of the row. Change the
// product closes the form and opens the product pick dialog.
export function RowEditButton({
  actions,
  lists,
  name,
  product,
  scan,
}: Readonly<{
  actions: RowActions;
  lists: QueueLists;
  name: string;
  product: Product | undefined;
  scan: PendingScan;
}>) {
  const [dialog, setDialog] = useState<'form' | 'pick' | null>(null);
  const close = () => {
    setDialog(null);
  };
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Edit"
        disabled={actions.isBusy}
        onClick={() => {
          setDialog('form');
        }}
      >
        <Pencil />
      </Button>
      <RowFormDialog
        isOpen={dialog === 'form'}
        lists={lists}
        name={name}
        product={product}
        scan={scan}
        onClose={close}
        onPick={() => {
          setDialog('pick');
        }}
        onSave={actions.save}
      />
      <PickProductDialog
        isOpen={dialog === 'pick'}
        products={lists.products}
        scan={scan}
        onClose={close}
        onPick={actions.setProduct}
      />
    </>
  );
}
