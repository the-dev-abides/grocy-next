import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { PendingScan } from '../api/next-api';
import type { PendingScanRowLists } from './pending-scan-row';

import { PendingScanRow, RejectButton } from './pending-scan-row';
import { dueDateText, nameOf, priceText } from './scan-text';

// The amount in its unit between minus and plus, and the reject button.
function AmountControls({
  onChangeAmount,
  onReject,
  quantityUnits,
  scan,
}: Readonly<{
  onChangeAmount: (delta: number) => void;
  onReject: () => void;
  quantityUnits: PendingScanRowLists['quantityUnits'];
  scan: PendingScan;
}>) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Less"
        onClick={() => {
          onChangeAmount(-1);
        }}
      >
        <Minus />
      </Button>
      <span className="w-16 text-center tabular-nums">
        {scan.amount} {nameOf(quantityUnits, scan.quantityUnitId, '')}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="More"
        onClick={() => {
          onChangeAmount(1);
        }}
      >
        <Plus />
      </Button>
      <RejectButton onReject={onReject} />
    </div>
  );
}

// One row of the Purchase session list: the location, the due date, and the
// price on the detail line, and the amount controls.
export function PurchaseRow({
  lists,
  onChangeAmount,
  onReject,
  scan,
}: Readonly<{
  lists: PendingScanRowLists;
  onChangeAmount: (delta: number) => void;
  onReject: () => void;
  scan: PendingScan;
}>) {
  return (
    <PendingScanRow
      lists={lists}
      scan={scan}
      details={[
        nameOf(lists.locations, scan.locationId, 'Product default'),
        dueDateText(scan.dueDate),
        priceText(scan),
      ]}
    >
      <AmountControls
        quantityUnits={lists.quantityUnits}
        scan={scan}
        onChangeAmount={onChangeAmount}
        onReject={onReject}
      />
    </PendingScanRow>
  );
}
