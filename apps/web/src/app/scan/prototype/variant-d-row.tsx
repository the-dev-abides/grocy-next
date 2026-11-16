// PROTOTYPE. The row of variant D.
// - The icon of the booking type is a button. A tap flips the booking type.
// - A Consume row has a trash can button for the spoiled flag.
// - The amount has minus and plus on the row.
// - A tap on the name opens the row. The open row has a field for the
//   amount, the unit, the locations, and the reject button.
import { cn } from 'cn';
import { Trash, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { PrototypeRow } from './prototype-data';
import type { PrototypeSession } from './use-prototype-session';

import { timeOf } from '../scan-text';
import {
  HINT_TEXT,
  isWithoutTo,
  MODE,
  otherType,
  placeText,
  productOf,
  stockHintOf,
} from './prototype-data';
import { AmountStepper, InlineSelect, RowName } from './prototype-parts';

type RowProperties = Readonly<{
  row: PrototypeRow;
  session: PrototypeSession;
}>;

// The icon of the booking type. A tap flips the row to the other booking
// type.
function TypeToggle({ row, session }: RowProperties) {
  const mode = MODE[row.bookingType];
  const other = otherType(row.bookingType);
  const label = `${mode.label}. Change to ${MODE[other].label}.`;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className="shrink-0 text-primary"
      onClick={() => {
        session.update(row.id, { bookingType: other });
      }}
    >
      <mode.icon />
    </Button>
  );
}

// The trash can of a Consume row. A tap sets or clears the spoiled flag. A
// Transfer row has an empty place of the same size.
function SpoiledToggle({ row, session }: RowProperties) {
  if (row.bookingType !== 'consume') {
    return <span aria-hidden="true" className="size-8 shrink-0" />;
  }
  return (
    <Button
      variant={row.spoiled ? 'destructive' : 'ghost'}
      size="icon"
      aria-label="Spoiled"
      aria-pressed={row.spoiled}
      title="Spoiled"
      className={cn('shrink-0', !row.spoiled && 'text-muted-foreground')}
      onClick={() => {
        session.update(row.id, { spoiled: !row.spoiled });
      }}
    >
      <Trash />
    </Button>
  );
}

// The name and the detail line. A tap opens or closes the row.
function Summary({
  isOpen,
  onToggle,
  row,
}: Readonly<{ isOpen: boolean; onToggle: () => void; row: PrototypeRow }>) {
  const hint = HINT_TEXT[stockHintOf(row)];
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      className="min-w-0 flex-1 py-1 text-left"
      onClick={onToggle}
    >
      <span className="block truncate">
        <RowName row={row} />
      </span>
      <span
        className={cn(
          'block text-xs text-muted-foreground',
          isWithoutTo(row) && 'font-medium text-destructive',
        )}
      >
        <time dateTime={row.scannedAt}>{timeOf(row.scannedAt)}</time>
        {' · '}
        {MODE[row.bookingType].label} {placeText(row)}
        {hint !== '' && ` · ${hint}`}
        {row.spoiled && ' · Spoiled'}
      </span>
    </button>
  );
}

// The field for a typed amount, such as 0.5. Enter or a tap outside the
// field stores the amount. A text that is not an amount above zero puts the
// old amount back.
function AmountField({ row, session }: RowProperties) {
  const id = useId();
  const [text, setText] = useState(String(row.amount));
  const store = () => {
    const amount = Number(text.replace(',', '.'));
    if (Number.isFinite(amount) && amount > 0) {
      session.update(row.id, { amount });
    } else {
      setText(String(row.amount));
    }
  };
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Amount
      </label>
      <Input
        id={id}
        inputMode="decimal"
        className="w-24"
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
    </div>
  );
}

// The unit of the amount: the default unit of the product, or one of its
// other units. An unknown code has no unit.
function UnitSelect({ row, session }: RowProperties) {
  const id = useId();
  const product = productOf(row.productId);
  if (product === null) {
    return null;
  }
  const names = [product.unit, ...product.units.map((unit) => unit.name)];
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Unit
      </label>
      <Select
        items={Object.fromEntries(names.map((name) => [name, name]))}
        value={row.unit ?? product.unit}
        onValueChange={(name) => {
          session.update(row.id, {
            unit: name === product.unit ? null : name,
          });
        }}
      >
        <SelectTrigger id={id} className="min-w-0 flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {names.map((name) => {
            return (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

// The form of an open row.
function RowForm({ row, session }: RowProperties) {
  return (
    <div className="flex flex-col gap-2 pt-1 pb-3">
      <div className="flex items-center gap-3">
        <AmountField key={row.amount} row={row} session={session} />
        <UnitSelect row={row} session={session} />
      </div>
      <div
        className="
          grid gap-2
          sm:grid-cols-2
        "
      >
        <InlineSelect
          label="From"
          none="Product default"
          value={row.fromLocationId}
          onChange={(fromLocationId) => {
            session.update(row.id, { fromLocationId });
          }}
        />
        {row.bookingType === 'transfer' && (
          <InlineSelect
            label="To"
            none="Not set"
            value={row.toLocationId}
            onChange={(toLocationId) => {
              session.update(row.id, { toLocationId });
            }}
          />
        )}
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="ml-auto"
        onClick={() => {
          session.reject(row.id);
        }}
      >
        <Trash2 data-icon="inline-start" /> Reject
      </Button>
    </div>
  );
}

export function VariantDRow({
  isOpen,
  onToggle,
  row,
  session,
}: Readonly<{
  isOpen: boolean;
  onToggle: () => void;
  row: PrototypeRow;
  session: PrototypeSession;
}>) {
  return (
    <>
      <div className="flex min-h-14 items-center gap-1">
        <TypeToggle row={row} session={session} />
        <Summary isOpen={isOpen} row={row} onToggle={onToggle} />
        <AmountStepper row={row} session={session} />
        <SpoiledToggle row={row} session={session} />
      </div>
      {isOpen && <RowForm row={row} session={session} />}
    </>
  );
}
