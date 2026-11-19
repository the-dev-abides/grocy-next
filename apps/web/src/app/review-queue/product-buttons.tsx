import { Button } from '@/components/ui/button';

import type { PendingScan } from '../api/next-api';
import type { QueueLists } from './use-review-queue';
import type { RowActions } from './use-row-actions';

import { NewProductDialog } from './new-product-dialog';
import { PickProductDialog } from './pick-product-dialog';
import { useRowDialogs } from './use-row-dialogs';

// The two buttons of a row with no product, in place of the accept. Pick
// product opens the product pick dialog, and New product opens the short
// product form. Both set the product on the row through the same update. A card
// gives the big size. Each dialog draws only after its first open.
export function ProductButtons({
  actions,
  lists,
  scan,
  size = 'sm',
}: Readonly<{
  actions: RowActions;
  lists: QueueLists;
  scan: PendingScan;
  size?: 'lg' | 'sm';
}>) {
  const { close, dialog, isDrawn, open } = useRowDialogs<'new' | 'pick'>();
  return (
    <>
      <Button
        variant="outline"
        size={size}
        disabled={actions.isBusy}
        onClick={() => {
          open('pick');
        }}
      >
        Pick product
      </Button>
      <Button
        variant="outline"
        size={size}
        disabled={actions.isBusy}
        onClick={() => {
          open('new');
        }}
      >
        New product
      </Button>
      {isDrawn('pick') && (
        <PickProductDialog
          isOpen={dialog === 'pick'}
          products={lists.products}
          scan={scan}
          onClose={close}
          onPick={actions.setProduct}
        />
      )}
      {isDrawn('new') && (
        <NewProductDialog
          isOpen={dialog === 'new'}
          lists={lists}
          scan={scan}
          onClose={close}
          onCreated={actions.setProduct}
        />
      )}
    </>
  );
}
