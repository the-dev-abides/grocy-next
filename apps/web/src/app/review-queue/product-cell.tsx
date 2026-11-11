import type { ReactNode } from 'react';

import { cn } from 'cn';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';

import type { PendingScan } from '../api/next-api';
import type { QueueLists } from './use-review-queue';

import { dueDateText, nameOf, priceText, timeOf } from '../scan/scan-text';
import { type RowState, stateLabel } from './row-state';
import { bookingTypeLabel } from './row-text';

// The state of a row as a badge. The accept failed badge is the destructive
// one, a ready row the quiet outline, and a row that needs something the
// secondary one.
const badgeVariant: Readonly<
  Record<RowState, 'destructive' | 'outline' | 'secondary'>
> = {
  failed: 'destructive',
  'needs-count': 'secondary',
  'needs-product': 'secondary',
  ready: 'outline',
};

export function StateBadge({ state }: Readonly<{ state: RowState }>) {
  return (
    <Badge
      variant={badgeVariant[state]}
      className={cn(
        'font-normal',
        state === 'ready' && 'text-muted-foreground',
      )}
    >
      {stateLabel[state]}
    </Badge>
  );
}

// The name of a row: the product name, the write-in name, or the lookup name
// in a medium weight, or the bare code in the monospace font.
export function RowName({
  name,
  scan,
}: Readonly<{ name: string; scan: PendingScan }>) {
  const isCode =
    scan.productId === null &&
    scan.writeInName === null &&
    scan.lookupResult === null;
  return (
    <span
      className={isCode ? 'font-mono text-muted-foreground' : 'font-medium'}
    >
      {name}
    </span>
  );
}

// The second line under the name: the code when the row has a product, the
// service of a lookup result as a link to the product page for the
// attribution of ADR 0011, and the note.
export function RowMeta({ scan }: Readonly<{ scan: PendingScan }>) {
  return (
    <span
      className="
        flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground
      "
    >
      {scan.code !== null && scan.productId !== null && (
        <span className="font-mono">{scan.code}</span>
      )}
      {scan.lookupResult !== null && (
        <a
          href={scan.lookupResult.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {scan.lookupResult.service}
        </a>
      )}
      {scan.note !== null && <span className="truncate">{scan.note}</span>}
    </span>
  );
}

// The facts of a row that the hidden columns hold below their breakpoint:
// the booking type and the time always, the location below `md`, and the
// due date and the price below `xl`.
function RowFacts({
  lists,
  scan,
}: Readonly<{ lists: QueueLists; scan: PendingScan }>) {
  const price = scan.bookingType === 'purchase' ? ` · ${priceText(scan)}` : '';
  return (
    <p className="text-xs text-muted-foreground">
      {bookingTypeLabel[scan.bookingType]} ·{' '}
      <time dateTime={scan.scannedAt}>{timeOf(scan.scannedAt)}</time>
      <span className="md:hidden">
        {' · '}
        {nameOf(lists.locations, scan.locationId, 'Product default')}
      </span>
      <span className="xl:hidden">
        {' · '}
        {dueDateText(scan.dueDate)}
        {price}
      </span>
    </p>
  );
}

// The Grocy message of the last failed accept.
export function ErrorLine({ error }: Readonly<{ error: null | string }>) {
  if (error === null) {
    return null;
  }
  return (
    <p className="mt-0.5 flex items-start gap-1 text-xs text-destructive">
      <AlertTriangle className="mt-px size-3.5 shrink-0" /> <span>{error}</span>
    </p>
  );
}

// The product cell: the name, the meta line, the facts of the hidden
// columns, the state below `md`, the lines of the caller such as the
// Inventory facts, and the Grocy message of a failed accept.
export function ProductCell({
  children,
  lists,
  name,
  scan,
  state,
}: Readonly<{
  children?: ReactNode;
  lists: QueueLists;
  name: string;
  scan: PendingScan;
  state: RowState;
}>) {
  return (
    <TableCell className="max-w-72 whitespace-normal">
      <RowName name={name} scan={scan} />
      <RowMeta scan={scan} />
      <RowFacts lists={lists} scan={scan} />
      <div
        className="
          mt-0.5
          md:hidden
        "
      >
        <StateBadge state={state} />
      </div>
      {children}
      <ErrorLine error={scan.error} />
    </TableCell>
  );
}
