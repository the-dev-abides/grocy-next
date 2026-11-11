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

// One row of the session list: the name, a line with the time, the location,
// the due date, and the price, and the amount in its unit.
export function ScanRow({
  lists,
  scan,
}: Readonly<{ lists: ScanRowLists; scan: PendingScan }>) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <ScanName products={lists.products} scan={scan} />
        <p className="truncate text-xs text-muted-foreground">
          <time dateTime={scan.scannedAt}>{timeOf(scan.scannedAt)}</time>
          {` · ${nameOf(lists.locations, scan.locationId, 'Product default')}`}
          {` · ${dueDateText(scan.dueDate)}`}
          {` · ${priceText(scan)}`}
        </p>
      </div>
      <span className="w-16 text-center tabular-nums">
        {scan.amount} {nameOf(lists.quantityUnits, scan.quantityUnitId, '')}
      </span>
    </>
  );
}
