import { Minus, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type {
  Location,
  PendingScan,
  ProductListItem,
  QuantityUnit,
} from '../api/next-api';

import { dueDateText, nameOf, priceText, timeOf } from './scan-text';

export interface ScanRowLists {
  locations: readonly Location[] | undefined;
  products: readonly ProductListItem[] | undefined;
  quantityUnits: readonly QuantityUnit[] | undefined;
}

// The name of a pending scan: the product, the lookup result, or the bare
// code. The words come from the three facts of ADR 0010.
function ScanName({
  products,
  scan,
}: Readonly<{ products: ScanRowLists['products']; scan: PendingScan }>) {
  if (scan.productId !== null) {
    return (
      <span className="font-medium">
        {nameOf(products, scan.productId, '')}
      </span>
    );
  }
  if (scan.lookupResult !== null) {
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="truncate font-medium">{scan.lookupResult.name}</span>
        <span className="text-xs text-muted-foreground">New product</span>
      </span>
    );
  }
  return <span className="font-mono text-muted-foreground">{scan.code}</span>;
}

// The amount in its unit between minus and plus, and a reject button from
// `sm` up. Below `sm` the swipe rejects.
function AmountControls({
  onChangeAmount,
  onReject,
  quantityUnits,
  scan,
}: Readonly<{
  onChangeAmount: (delta: number) => void;
  onReject: () => void;
  quantityUnits: ScanRowLists['quantityUnits'];
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
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reject"
        className="
          hidden
          sm:inline-flex
        "
        onClick={onReject}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

// The service name of a lookup result as a link to the product page, for
// the attribution that ADR 0011 decided.
function ServiceLink({ scan }: Readonly<{ scan: PendingScan }>) {
  if (scan.lookupResult === null) {
    return null;
  }
  return (
    <>
      {' · '}
      <a
        href={scan.lookupResult.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        {scan.lookupResult.service}
      </a>
    </>
  );
}

// One row of the session list: the name, a line with the time, the location,
// the due date, the price, and the service link of a lookup result, and the
// amount controls.
export function ScanRow({
  lists,
  onChangeAmount,
  onReject,
  scan,
}: Readonly<{
  lists: ScanRowLists;
  onChangeAmount: (delta: number) => void;
  onReject: () => void;
  scan: PendingScan;
}>) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <ScanName products={lists.products} scan={scan} />
        <p className="truncate text-xs text-muted-foreground">
          <time dateTime={scan.scannedAt}>{timeOf(scan.scannedAt)}</time>
          {` · ${nameOf(lists.locations, scan.locationId, 'Product default')}`}
          {` · ${dueDateText(scan.dueDate)}`}
          {` · ${priceText(scan)}`}
          <ServiceLink scan={scan} />
        </p>
      </div>
      <AmountControls
        quantityUnits={lists.quantityUnits}
        scan={scan}
        onChangeAmount={onChangeAmount}
        onReject={onReject}
      />
    </>
  );
}
