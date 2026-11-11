import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { PendingScan } from '../api/next-api';
import type { QueueLists } from './use-review-queue';
import type { RowActions } from './use-row-actions';

import { PickProductDialog } from './pick-product-dialog';

// The two buttons of a row with no product, in place of the accept: Pick
// product opens the product pick dialog, and New product opens the short
// product form. The short product form comes with ticket #101.
export function ProductButtons({
  actions,
  lists,
  scan,
}: Readonly<{ actions: RowActions; lists: QueueLists; scan: PendingScan }>) {
  const [dialog, setDialog] = useState<'new' | 'pick' | null>(null);
  const close = () => {
    setDialog(null);
  };
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={actions.isBusy}
        onClick={() => {
          setDialog('pick');
        }}
      >
        Pick product
      </Button>
      <Button variant="outline" size="sm" disabled={actions.isBusy}>
        New product
      </Button>
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
