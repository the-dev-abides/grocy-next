import { skipToken } from '@reduxjs/toolkit/query';
import { cn } from 'cn';
import { Check, RotateCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';

import type { PendingScan, Product } from '../api/next-api';
import type { ResultLine } from './result-panel';
import type { QueueLists } from './use-review-queue';
import type { RowActions } from './use-row-actions';

import { useGetProductQuery } from '../api/next-api';
import { dueDateText, nameOf, priceText, timeOf } from '../scan/scan-text';
import { ProductButtons } from './product-buttons';
import { ProductCell, StateBadge } from './product-cell';
import { type RowState, stateOf } from './row-state';
import { amountText, rowName } from './row-text';
import { useRowActions } from './use-row-actions';

// The reject button on every row. The accept button on a ready row, and the
// Accept again button on a failed row. A row that needs a product shows Pick
// product and New product in place of the accept. A row that needs a count
// has no accept.
function RowButtons({
  actions,
  lists,
  scan,
  state,
}: Readonly<{
  actions: RowActions;
  lists: QueueLists;
  scan: PendingScan;
  state: RowState;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reject"
        disabled={actions.isBusy}
        onClick={actions.reject}
      >
        <Trash2 />
      </Button>
      {state === 'ready' && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Accept"
          disabled={actions.isBusy}
          onClick={actions.accept}
        >
          <Check />
        </Button>
      )}
      {state === 'failed' && (
        <Button
          variant="outline"
          size="sm"
          disabled={actions.isBusy}
          onClick={actions.accept}
        >
          <RotateCw data-icon="inline-start" /> Accept again
        </Button>
      )}
      {state === 'needs-product' && (
        <ProductButtons actions={actions} lists={lists} scan={scan} />
      )}
    </div>
  );
}

// The columns that hide below a breakpoint: the location and the state from
// `md`, the due date and the price from `xl`, the store and the time from
// `2xl`.
const FROM_MD = 'hidden md:table-cell';
const FROM_XL = 'hidden xl:table-cell';
const FROM_2XL = 'hidden 2xl:table-cell';

// The fact cells after the product: the amount, the location, the due date,
// the price and the store of a Purchase row, the time, and the state.
function FactCells({
  lists,
  product,
  scan,
  state,
}: Readonly<{
  lists: QueueLists;
  product: Product | undefined;
  scan: PendingScan;
  state: RowState;
}>) {
  const isPurchase = scan.bookingType === 'purchase';
  return (
    <>
      <TableCell
        className="
          w-20 text-right whitespace-normal tabular-nums
          md:w-36
        "
      >
        {amountText(scan, product, lists.quantityUnits)}
      </TableCell>
      <TableCell className={FROM_MD}>
        {nameOf(lists.locations, scan.locationId, 'Product default')}
      </TableCell>
      <TableCell className={FROM_XL}>{dueDateText(scan.dueDate)}</TableCell>
      <TableCell className={cn(FROM_XL, 'text-right')}>
        {isPurchase && priceText(scan)}
      </TableCell>
      <TableCell className={FROM_2XL}>
        {isPurchase && nameOf(lists.stores, scan.storeId, 'None')}
      </TableCell>
      <TableCell className={cn(FROM_2XL, 'text-muted-foreground')}>
        {timeOf(scan.scannedAt)}
      </TableCell>
      <TableCell className={FROM_MD}>
        <StateBadge state={state} />
      </TableCell>
    </>
  );
}

// One row of the review queue table. The columns of the prototype: the
// product with its facts, the amount, the location from `md`, the due date
// and the price from `xl`, the store and the time from `2xl`, the state from
// `md`, and the buttons. A failed row has the expired row colour of ADR 0013.
export function QueueRow({
  lists,
  onChanged,
  onResult,
  scan,
}: Readonly<{
  lists: QueueLists;
  onChanged: () => void;
  onResult: (line: Omit<ResultLine, 'key'>) => void;
  scan: PendingScan;
}>) {
  const product = useGetProductQuery(
    scan.productId === null ? skipToken : { id: scan.productId },
  ).data;
  const state = stateOf(scan);
  // The product read names a product that the product list does not hold
  // yet, such as a product that the short product form created.
  const name = product?.name ?? rowName(scan, lists.products);
  const actions = useRowActions({
    locations: lists.locations,
    name,
    onChanged,
    onResult,
    scan,
    stockUnit:
      product === undefined
        ? ''
        : nameOf(lists.quantityUnits, product.stockUnitId, ''),
  });
  return (
    <TableRow
      className={cn(
        state === 'failed' &&
          `
            bg-row-expired
            hover:bg-row-expired
          `,
        actions.isBusy && 'opacity-50',
      )}
    >
      <ProductCell lists={lists} name={name} scan={scan} state={state} />
      <FactCells lists={lists} product={product} scan={scan} state={state} />
      <TableCell className="text-right">
        <RowButtons actions={actions} lists={lists} scan={scan} state={state} />
      </TableCell>
    </TableRow>
  );
}
