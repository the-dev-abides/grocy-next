import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { PendingScan, Product, UpdatePendingScan } from '../api/next-api';
import type { PendingScanRowLists } from './pending-scan-row';

import { numberOf } from '../review-queue/bulk-edit';
import { IdSelect } from '../review-queue/id-select';
import { unitChoices } from '../review-queue/row-form';
import { defaultUnitLabel } from '../review-queue/row-text';
import { TextField } from '../review-queue/text-field';

interface FormProperties {
  lists: PendingScanRowLists;
  onReject: () => void;
  onUpdate: (patch: UpdatePendingScan) => void;
  product: Product | undefined;
  scan: PendingScan;
}

// The field for a typed amount, such as 0.5 or 0,5. Enter or a tap outside the
// field stores the amount. A text that is not an amount above zero puts the
// amount of the row back.
function AmountField({
  onUpdate,
  scan,
}: Readonly<Pick<FormProperties, 'onUpdate' | 'scan'>>) {
  const rowText = scan.amount === null ? '' : String(scan.amount);
  const [text, setText] = useState(rowText);
  const store = () => {
    const amount = numberOf(text.replace(',', '.'));
    if (amount !== undefined && amount > 0) {
      if (amount !== scan.amount) {
        onUpdate({ amount });
      }
    } else {
      setText(rowText);
    }
  };
  return (
    <TextField
      label="Amount"
      inputMode="decimal"
      value={text}
      onBlur={store}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          store();
        }
      }}
    />
  );
}

// The unit of the amount. The empty unit is the consume unit on a Consume and
// the stock unit on a Transfer.
function UnitSelect({
  lists,
  onUpdate,
  product,
  scan,
}: Readonly<Omit<FormProperties, 'onReject'>>) {
  return (
    <IdSelect
      label="Unit"
      none={defaultUnitLabel(scan.bookingType, product, lists.quantityUnits)}
      rows={unitChoices(product, lists.quantityUnits)}
      value={scan.quantityUnitId}
      onChange={(quantityUnitId) => {
        onUpdate({ quantityUnitId });
      }}
    />
  );
}

// The form under a Consume row and a Transfer row of the scan screen. The
// user types an amount, picks a unit, and changes the "from" location and on
// a Transfer the "to" location. Each change sends one update. The form has
// the Reject button.
export function ConsumeTransferForm({
  lists,
  onReject,
  onUpdate,
  product,
  scan,
}: Readonly<FormProperties>) {
  return (
    <div className="flex flex-col gap-3 pt-1 pb-3">
      <div
        className="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <AmountField key={scan.amount} scan={scan} onUpdate={onUpdate} />
        <UnitSelect
          lists={lists}
          product={product}
          scan={scan}
          onUpdate={onUpdate}
        />
        <IdSelect
          label="From"
          none="Product default"
          rows={lists.locations}
          value={scan.locationId}
          onChange={(locationId) => {
            onUpdate({ locationId });
          }}
        />
        {scan.bookingType === 'transfer' && (
          <IdSelect
            label="To"
            none="Not set"
            rows={lists.locations}
            value={scan.toLocationId}
            onChange={(toLocationId) => {
              onUpdate({ toLocationId });
            }}
          />
        )}
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="ml-auto"
        onClick={onReject}
      >
        <Trash2 data-icon="inline-start" /> Reject
      </Button>
    </div>
  );
}
