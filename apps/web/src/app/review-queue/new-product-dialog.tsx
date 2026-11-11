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

import type { PendingScan } from '../api/next-api';
import type { Patch } from './new-product-fields';
import type { QueueLists } from './use-review-queue';

import { useCreateProductMutation } from '../api/next-api';
import { FormNotes, NameFields, ProductFields } from './new-product-fields';
import { bodyOf, formOf } from './product-form';
import { failureText } from './result-text';

// The form: the proposals of ADR 0011 as the start values, every one open
// to a change. Save sends the product create and then the update that sets
// the new product on the row, two calls behind one click, as ADR 0010
// decided. A refused create keeps the form open with the problem. The update
// reports its problem in the result panel.
function NewProductForm({
  lists,
  onClose,
  onCreated,
  scan,
}: Readonly<{
  lists: QueueLists;
  onClose: () => void;
  onCreated: (productId: number) => void;
  scan: PendingScan;
}>) {
  const proposal = formOf(scan, lists.quantityUnits);
  const [form, setForm] = useState(proposal);
  const [problem, setProblem] = useState<null | string>(null);
  const [createProduct, creating] = useCreateProductMutation();
  const patch: Patch = (fields) => {
    setForm((current) => ({ ...current, ...fields }));
  };
  const body = bodyOf(form);
  const save = async (): Promise<void> => {
    if (body === null) {
      return;
    }
    try {
      const product = await createProduct({ createProduct: body }).unwrap();
      onCreated(product.id);
      onClose();
    } catch (error) {
      setProblem(failureText(error));
    }
  };

  return (
    <>
      <NameFields form={form} patch={patch} scan={scan} />
      <ProductFields form={form} lists={lists} patch={patch} />
      <FormNotes hasUnitProposal={proposal.stockUnitId !== null} scan={scan} />
      {problem !== null && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={body === null || creating.isLoading}
          onClick={() => {
            void save();
          }}
        >
          Create and use
        </Button>
      </DialogFooter>
    </>
  );
}

// The words under the title: where the product goes and where the proposals
// come from.
function NewProductDescription({ scan }: Readonly<{ scan: PendingScan }>) {
  return (
    <DialogDescription>
      The product is created in Grocy
      {scan.code !== null && (
        <>
          {' '}
          with the code <span className="font-mono">{scan.code}</span>
        </>
      )}
      , and the pending scan gets it.{' '}
      {scan.lookupResult === null
        ? 'The name is the write-in name from the scan screen.'
        : `The proposals come from ${scan.lookupResult.service}. Change any of them.`}
    </DialogDescription>
  );
}

// The short product form of ADR 0011, opened by New product on a row with
// no product. The dialog mounts the form when it opens, so the form starts
// from the proposals every time.
export function NewProductDialog({
  isOpen,
  lists,
  onClose,
  onCreated,
  scan,
}: Readonly<{
  isOpen: boolean;
  lists: QueueLists;
  onClose: () => void;
  onCreated: (productId: number) => void;
  scan: PendingScan;
}>) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <NewProductDescription scan={scan} />
        </DialogHeader>
        {isOpen && (
          <NewProductForm
            lists={lists}
            scan={scan}
            onClose={onClose}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
