import type { ReactNode } from 'react';

import { cn } from 'cn';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type {
  Location,
  PendingScan,
  ProductListItem,
  QuantityUnit,
} from '../api/next-api';

import { nameOf, timeOf } from './scan-text';

export interface PendingScanRowLists {
  locations: readonly Location[] | undefined;
  products: readonly ProductListItem[] | undefined;
  quantityUnits: readonly QuantityUnit[] | undefined;
}

// A name with the hint that the review queue makes a new product of it.
function NewProductName({ name }: Readonly<{ name: string }>) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="truncate font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">New product</span>
    </span>
  );
}

// The name of a pending scan: the product, the write-in name, the lookup
// result, or the bare code. The words come from the facts of ADR 0010.
function ScanName({
  products,
  scan,
}: Readonly<{ products: PendingScanRowLists['products']; scan: PendingScan }>) {
  if (scan.productId !== null) {
    return (
      <span className="font-medium">
        {nameOf(products, scan.productId, '')}
      </span>
    );
  }
  if (scan.writeInName !== null) {
    return <NewProductName name={scan.writeInName} />;
  }
  if (scan.lookupResult !== null) {
    return <NewProductName name={scan.lookupResult.name} />;
  }
  return <span className="font-mono text-muted-foreground">{scan.code}</span>;
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

// The reject button of a row, from `sm` up. Below `sm` the swipe rejects.
export function RejectButton({ onReject }: Readonly<{ onReject: () => void }>) {
  return (
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
  );
}

// The row form under a row: whether it is open, and the tap on the name that
// opens or closes it.
export interface RowFormToggle {
  isOpen: boolean;
  onToggle: () => void;
}

// One row of the session list, shared by the scan screens. A row with a row
// form has its name as a button that opens or closes the form. The row shows
// the name and a line with the time. It shows the details of the screen and the
// service link of a lookup result. The controls of the screen are on the
// right. A row that needs a field before the accept shows its line in red.
export function PendingScanRow({
  children,
  details,
  form,
  isWarning = false,
  lists,
  scan,
}: Readonly<{
  children: ReactNode;
  details: readonly string[];
  form?: RowFormToggle;
  isWarning?: boolean;
  lists: PendingScanRowLists;
  scan: PendingScan;
}>) {
  const name = <ScanName products={lists.products} scan={scan} />;
  return (
    <>
      <div className="min-w-0 flex-1">
        {form === undefined ? (
          name
        ) : (
          <button
            type="button"
            aria-expanded={form.isOpen}
            className="block max-w-full text-left"
            onClick={form.onToggle}
          >
            {name}
          </button>
        )}
        <p
          className={cn(
            'truncate text-xs',
            isWarning
              ? 'font-medium text-destructive'
              : 'text-muted-foreground',
          )}
        >
          <time dateTime={scan.scannedAt}>{timeOf(scan.scannedAt)}</time>
          {details.map((detail) => ` · ${detail}`).join('')}
          <ServiceLink scan={scan} />
        </p>
      </div>
      {children}
    </>
  );
}
