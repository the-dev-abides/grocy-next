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
import { AmountCell } from './amount-cell';
import { InventoryLines } from './inventory-lines';
import { ProductButtons } from './product-buttons';
import { ProductCell, StateBadge } from './product-cell';
import { type RowState, stateOf } from './row-state';
import { amountText, rowName, unitOf } from './row-text';
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

// The fact cells after the product: the amount with the count field of an
// Inventory row from `md`, the location, the due date,
// the price and the store of a Purchase row, the time, and the state.
function FactCells({
  lists,
  onCount,
  product,
  scan,
  state,
}: Readonly<{
  lists: QueueLists;
  onCount: (amount: null | number) => void;
  product: Product | undefined;
  scan: PendingScan;
  state: RowState;
}>) {
  const isPurchase = scan.bookingType === 'purchase';
  const text = amountText(scan, product, lists.quantityUnits);
  return (
    <>
      <TableCell
        className="
          w-20 text-right whitespace-normal tabular-nums
          md:w-36
        "
      >
        <span className="md:hidden">{text}</span>
        <span
          className="
            hidden
            md:block
          "
        >
          <AmountCell
            product={product}
            scan={scan}
            text={text}
            unit={unitOf(scan, product, lists.quantityUnits)}
            onCount={onCount}
          />
        </span>
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

// The stock unit of the product, in which the result line names a booking.
function stockUnitOf(
  product: Product | undefined,
  quantityUnits: QueueLists['quantityUnits'],
): string {
  return product === undefined
    ? ''
    : nameOf(quantityUnits, product.stockUnitId, '');
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
  const unit = unitOf(scan, product, lists.quantityUnits);
  // The product read names a product that the product list does not hold
  // yet, such as a product that the short product form created.
  const name = product?.name ?? rowName(scan, lists.products);
  const actions = useRowActions({
    locations: lists.locations,
    name,
    onChanged,
    onResult,
    scan,
    stockUnit: stockUnitOf(product, lists.quantityUnits),
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
      <ProductCell lists={lists} name={name} scan={scan} state={state}>
        <InventoryLines
          lists={lists}
          product={product}
          scan={scan}
          unit={unit}
        />
      </ProductCell>
      <FactCells
        lists={lists}
        product={product}
        scan={scan}
        state={state}
        onCount={actions.setCount}
      />
      <TableCell className="text-right">
        <RowButtons actions={actions} lists={lists} scan={scan} state={state} />
      </TableCell>
    </TableRow>
  );
}
