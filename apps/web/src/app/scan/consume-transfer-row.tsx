import { skipToken } from '@reduxjs/toolkit/query';
import { ArrowRightLeft, Minus, Plus, Utensils } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { PendingScan, Product, UpdatePendingScan } from '../api/next-api';
import type { PendingScanRowLists } from './pending-scan-row';

import { useGetProductQuery } from '../api/next-api';
import { unitOf } from '../review-queue/row-text';
import { ConsumeTransferForm } from './consume-transfer-form';
import { PendingScanRow } from './pending-scan-row';
import { consumeDetailText, transferDetailText } from './scan-text';
import { SpoiledButton } from './spoiled-button';
import { WriteInNameField } from './write-in-name-field';

// The icon of the booking type: the fork and knife of Consume and the two
// arrows of Transfer. The icon has the name of the booking type for a screen
// reader.
function BookingIcon({
  bookingType,
}: Readonly<{ bookingType: PendingScan['bookingType'] }>) {
  const className = 'size-5 shrink-0 text-primary';
  return bookingType === 'transfer' ? (
    <ArrowRightLeft role="img" aria-label="Transfer" className={className} />
  ) : (
    <Utensils role="img" aria-label="Consume" className={className} />
  );
}

// The amount in its unit between minus and plus. One tap changes the amount
// by one. Minus stops at one, so the amount stays above zero.
function AmountStepper({
  amount,
  onAmount,
  unit,
}: Readonly<{
  amount: null | number;
  onAmount: (amount: number) => void;
  unit: string;
}>) {
  const current = amount ?? 0;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Less"
        disabled={current <= 1}
        onClick={() => {
          onAmount(current - 1);
        }}
      >
        <Minus />
      </Button>
      <span className="min-w-12 text-center tabular-nums">
        {`${String(amount ?? '')} ${unit}`.trim()}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="More"
        onClick={() => {
          onAmount(current + 1);
        }}
      >
        <Plus />
      </Button>
    </div>
  );
}

// The controls on the right of a row. A row with no product and no lookup
// result has the write-in name field, as on the other scan screens. The amount
// has minus and plus. A Consume row has the trash can that sets the spoiled
// flag. A Transfer row has an empty place of the same size.
function RowControls({
  lists,
  onUpdate,
  product,
  scan,
}: Readonly<{
  lists: PendingScanRowLists;
  onUpdate: (patch: UpdatePendingScan) => void;
  product: Product | undefined;
  scan: PendingScan;
}>) {
  return (
    <>
      {scan.productId === null && scan.lookupResult === null && (
        <WriteInNameField
          name={scan.writeInName}
          onSubmit={(writeInName) => {
            onUpdate({ writeInName });
          }}
        />
      )}
      <AmountStepper
        amount={scan.amount}
        unit={unitOf(scan, product, lists.quantityUnits)}
        onAmount={(amount) => {
          onUpdate({ amount });
        }}
      />
      {scan.bookingType === 'transfer' ? (
        <span aria-hidden="true" className="size-8 shrink-0" />
      ) : (
        <SpoiledButton
          isSpoiled={scan.spoiled}
          onToggle={() => {
            onUpdate({ spoiled: !scan.spoiled });
          }}
        />
      )}
    </>
  );
}

// One row of the Consume and Transfer session list. The row starts with the
// icon of its booking type. The detail line shows the time, the booking type,
// the locations, and "Spoiled". A Transfer row with no "to" location shows the
// line in red. A tap on the name opens the row form under the row, with the
// Reject button. The empty unit is the consume unit on a Consume and the stock
// unit on a Transfer.
export function ConsumeTransferRow({
  lists,
  onReject,
  onUpdate,
  scan,
}: Readonly<{
  lists: PendingScanRowLists;
  onReject: () => void;
  onUpdate: (patch: UpdatePendingScan) => void;
  scan: PendingScan;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const product = useGetProductQuery(
    scan.productId === null ? skipToken : { id: scan.productId },
  ).data;
  const isTransfer = scan.bookingType === 'transfer';
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-h-12 items-center gap-2">
        <BookingIcon bookingType={scan.bookingType} />
        <PendingScanRow
          form={{
            isOpen,
            onToggle: () => {
              setIsOpen((open) => !open);
            },
          }}
          isWarning={isTransfer && scan.toLocationId === null}
          lists={lists}
          scan={scan}
          details={[
            isTransfer
              ? transferDetailText(scan, lists.locations)
              : consumeDetailText(scan, lists.locations),
          ]}
        >
          <RowControls
            lists={lists}
            product={product}
            scan={scan}
            onUpdate={onUpdate}
          />
        </PendingScanRow>
      </div>
      {isOpen && (
        <ConsumeTransferForm
          lists={lists}
          product={product}
          scan={scan}
          onReject={onReject}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
