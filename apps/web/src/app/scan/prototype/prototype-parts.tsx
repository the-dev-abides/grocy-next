// PROTOTYPE. Small controls that the variants share. No layout is shared.
import { cn } from 'cn';
import { Check, Minus, Plus } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { FeedbackKind } from '../feedback';
import type { ScannerHandle } from '../use-scanner';
import type { PrototypeRow } from './prototype-data';
import type { PrototypeFeedback } from './use-prototype-feedback';
import type { PrototypeSession } from './use-prototype-session';

import { TypeCodeField } from '../type-code-field';
import { amountText, LOCATIONS, MODE, productOf } from './prototype-data';

export interface VariantProperties {
  feedback: PrototypeFeedback;
  onCode: (code: string) => void;
  onDone: () => void;
  scanner: ScannerHandle;
  session: PrototypeSession;
}

const NONE = 'none';

// A location select with its label on the same line.
export function InlineSelect({
  className,
  label,
  none,
  onChange,
  value,
}: Readonly<{
  className?: string;
  label: string;
  none: string;
  onChange: (id: null | number) => void;
  value: null | number;
}>) {
  const id = useId();
  const items: Record<string, string> = { [NONE]: none };
  for (const location of LOCATIONS) {
    items[String(location.id)] = location.name;
  }
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select
        items={items}
        value={value === null ? NONE : String(value)}
        onValueChange={(next) => {
          onChange(next === NONE || next === null ? null : Number(next));
        }}
      >
        <SelectTrigger id={id} className="min-w-0 flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{none}</SelectItem>
          {LOCATIONS.map((location) => {
            return (
              <SelectItem key={location.id} value={String(location.id)}>
                {location.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

// The name of a row: the product, or the bare code of an unknown code.
export function RowName({ row }: Readonly<{ row: PrototypeRow }>) {
  const product = productOf(row.productId);
  return product === null ? (
    <span className="font-mono text-muted-foreground">{row.code}</span>
  ) : (
    <span className="font-medium">{product.name}</span>
  );
}

// The amount in its unit between minus and plus. One step is the amount of
// one scan.
export function AmountStepper({
  row,
  session,
}: Readonly<{ row: PrototypeRow; session: PrototypeSession }>) {
  const product = productOf(row.productId);
  const step =
    product === null || row.bookingType === 'transfer' ? 1 : product.scanAmount;
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Less"
        onClick={() => {
          session.update(row.id, { amount: Math.max(step, row.amount - step) });
        }}
      >
        <Minus />
      </Button>
      <span className="w-16 text-center tabular-nums">{amountText(row)}</span>
      <Button
        variant="outline"
        size="icon"
        aria-label="More"
        onClick={() => {
          session.update(row.id, { amount: row.amount + step });
        }}
      >
        <Plus />
      </Button>
    </div>
  );
}

// The footer of variants A and B: the typed code field on a phone, the count,
// and Done.
export function PrototypeFooter({
  count,
  onCode,
  onDone,
}: Readonly<{
  count: number;
  onCode: (code: string) => void;
  onDone: () => void;
}>) {
  return (
    <footer className="sticky bottom-0 flex flex-col border-t bg-background">
      <div className="lg:hidden">
        <TypeCodeField onSubmit={onCode} />
      </div>
      <div className="flex h-12 items-center gap-2 px-3">
        <span className="flex-1">
          {count} {count === 1 ? 'scan' : 'scans'} in the review queue
        </span>
        <Button onClick={onDone}>
          <Check data-icon="inline-start" /> Done
        </Button>
      </div>
    </footer>
  );
}

// The colour of a banner: red for an unknown code, else the colour of the
// booking type of the scan.
export function bannerColour(
  kind: FeedbackKind,
  bookingType: PrototypeRow['bookingType'],
): string {
  return kind === 'unknown' ? 'bg-red-600 text-white' : MODE[bookingType].solid;
}
