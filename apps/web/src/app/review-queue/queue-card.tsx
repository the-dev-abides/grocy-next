import { cn } from 'cn';
import { Check, Minus, Plus, RotateCw, Trash2 } from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import type { PendingScan, Product } from '../api/next-api';
import type { RowProperties } from './row-properties';
import type { RowState } from './row-state';
import type { QueueLists } from './use-review-queue';
import type { RowActions } from './use-row-actions';

import { dueDateText, nameOf, priceText, timeOf } from '../scan/scan-text';
import { nextAmount } from '../scan/swipe';
import { SwipeRow } from '../scan/swipe-row';
import { BookingTypeIcon } from './booking-type-icon';
import { CountField } from './count-field';
import { ProductButtons } from './product-buttons';
import { ErrorLine, RowMeta, RowName, StateBadge } from './product-cell';
import { ProductLines } from './product-lines';
import { RowEditButton } from './row-edit-button';
import { isSameRowProperties } from './row-properties';
import { RowSpoiledButton } from './row-spoiled-button';
import { amountText, bookingTypeLabel, locationText } from './row-text';
import { useRowFacts } from './use-row-facts';

// Every fact of the row on one line, as the card has no columns. The facts are
// the booking type, the time, the location, and the due date. A Purchase row
// also has the price and the store.
function CardFacts({
  lists,
  scan,
}: Readonly<{ lists: QueueLists; scan: PendingScan }>) {
  const purchase =
    scan.bookingType === 'purchase'
      ? ` · ${priceText(scan)} · ${nameOf(lists.stores, scan.storeId, 'No store')}`
      : '';
  return (
    <p className="text-xs text-muted-foreground">
      {bookingTypeLabel[scan.bookingType]} ·{' '}
      <time dateTime={scan.scannedAt}>{timeOf(scan.scannedAt)}</time>
      {' · '}
      {locationText(scan, lists.locations)}
      {' · '}
      {dueDateText(scan.dueDate)}
      {purchase}
    </p>
  );
}

// The amount of the card. An Inventory card of a known product has minus,
// the count field, and plus. Plus and minus start from the Grocy stock while
// the row has no count, and the count never goes below zero. Every other
// amount is text, because the inline edit of the other fields is a later
// milestone.
function CardAmount({
  actions,
  lists,
  product,
  scan,
  unit,
}: Readonly<{
  actions: RowActions;
  lists: QueueLists;
  product: Product | undefined;
  scan: PendingScan;
  unit: string;
}>) {
  if (product === undefined || scan.bookingType !== 'inventory') {
    return (
      <p className="tabular-nums">
        {amountText(scan, product, lists.quantityUnits)}
      </p>
    );
  }
  const step = (delta: number) => {
    actions.setCount(nextAmount(scan.amount ?? product.stockAmount, delta));
  };
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="mr-auto text-xs text-muted-foreground">Count</span>
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="Less"
        disabled={actions.isBusy}
        onClick={() => {
          step(-1);
        }}
      >
        <Minus />
      </Button>
      <CountField
        key={String(scan.amount)}
        amount={scan.amount}
        isFocused={false}
        stockAmount={product.stockAmount}
        unit={unit}
        onCommit={actions.setCount}
      />
      <Button
        variant="outline"
        size="icon-lg"
        aria-label="More"
        disabled={actions.isBusy}
        onClick={() => {
          step(1);
        }}
      >
        <Plus />
      </Button>
    </div>
  );
}

// The accept of a card in the big size. A ready card shows Accept, and a failed
// card shows Accept again. A card with no count shows a closed Set the count.
function AcceptButton({
  actions,
  state,
}: Readonly<{ actions: RowActions; state: RowState }>) {
  if (state === 'needs-count') {
    return (
      <Button size="lg" className="flex-1" disabled>
        Set the count
      </Button>
    );
  }
  return (
    <Button
      size="lg"
      className="flex-1"
      disabled={actions.isBusy}
      onClick={actions.accept}
    >
      {state === 'failed' ? (
        <RotateCw data-icon="inline-start" />
      ) : (
        <Check data-icon="inline-start" />
      )}
      {state === 'failed' ? 'Accept again' : 'Accept'}
    </Button>
  );
}

// The buttons of a card: the spoiled trash can of a Consume, the full form,
// Reject, and the accept. A card that
// needs a product shows Pick product and New product in place of the
// accept.
function CardButtons({
  actions,
  lists,
  name,
  product,
  scan,
  state,
}: Readonly<{
  actions: RowActions;
  lists: QueueLists;
  name: string;
  product: Product | undefined;
  scan: PendingScan;
  state: RowState;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RowSpoiledButton actions={actions} scan={scan} size="icon-lg" />
      <RowEditButton
        actions={actions}
        lists={lists}
        name={name}
        product={product}
        scan={scan}
      />
      <Button
        variant="outline"
        size="lg"
        className="flex-1"
        disabled={actions.isBusy}
        onClick={actions.reject}
      >
        <Trash2 data-icon="inline-start" /> Reject
      </Button>
      {state === 'needs-product' ? (
        <ProductButtons actions={actions} lists={lists} scan={scan} size="lg" />
      ) : (
        <AcceptButton actions={actions} state={state} />
      )}
    </div>
  );
}

// A failed card has the expired row colour, a checked card a ring, and a
// busy card is faded.
function cardClass(state: RowState, isChecked: boolean, isBusy: boolean) {
  return cn(
    'flex flex-col gap-2 rounded-lg border p-3',
    state === 'failed' ? 'bg-row-expired' : 'bg-card',
    isChecked && 'ring-2 ring-primary',
    isBusy && 'opacity-50',
  );
}

// One card of the review queue, with the facts and the actions of a table row in big controls. The checkbox feeds the same checked set as the table. The booking type icon comes after the checkbox.
// A swipe to the left rejects the row.
function QueueCardView({
  chainRows,
  isChecked,
  lists,
  onChanged,
  onResult,
  onToggle,
  scan,
}: Readonly<RowProperties>) {
  const facts = useRowFacts({ lists, onChanged, onResult, scan });
  const { actions, name, product, state, unit } = facts;
  return (
    <SwipeRow
      isRounded
      className={cardClass(state, isChecked, actions.isBusy)}
      onReject={actions.reject}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          aria-label={`Check ${name}`}
          checked={isChecked}
          className="mt-1"
          onCheckedChange={() => {
            onToggle(scan.id);
          }}
        />
        <BookingTypeIcon scan={scan} size="icon-lg" onSave={actions.save} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5 text-base">
            <RowName name={name} scan={scan} />
            <span className="ml-auto">
              <StateBadge state={state} />
            </span>
          </div>
          <RowMeta scan={scan} />
          <CardFacts lists={lists} scan={scan} />
        </div>
      </div>
      <ProductLines
        chainRows={chainRows}
        lists={lists}
        product={product}
        scan={scan}
        unit={unit}
      />
      <ErrorLine error={scan.error} />
      <CardAmount
        actions={actions}
        lists={lists}
        product={product}
        scan={scan}
        unit={unit}
      />
      <CardButtons {...facts} lists={lists} scan={scan} />
    </SwipeRow>
  );
}

// The memoized card. The card list imports it as `QueueCard`.
export const queueCard = memo(QueueCardView, isSameRowProperties);
