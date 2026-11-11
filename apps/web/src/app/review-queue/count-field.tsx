import type { KeyboardEvent } from 'react';

import { useState } from 'react';

import { Input } from '@/components/ui/input';

// The keys of the count field: Enter leaves the field, so the loss of the
// focus sends the count. Escape puts the last count back and closes the field
// with no update.
function onCountKey(
  event: KeyboardEvent<HTMLInputElement>,
  cancel: () => void,
): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    cancel();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

// The field takes the focus when the user opens it.
function focusField(node: HTMLInputElement | null): void {
  node?.focus();
}

// The text of the field as a count: an empty field is no count, and a text
// that is not a number is undefined.
function countOf(typed: string): null | number | undefined {
  const text = typed.trim();
  if (text === '') {
    return null;
  }
  const count = Number(text);
  return Number.isNaN(count) ? undefined : count;
}

// The count of an Inventory row, in the stock unit of the product. The field
// shows the Grocy stock as the placeholder while the row has no count. On
// Enter and on the loss of the focus, the field sends the count when it
// changed, and an empty field sends no count. Escape puts the last count
// back. The field calls onLeave, when the caller gives it, when it loses the
// focus and on Escape.
export function CountField({
  amount,
  isFocused,
  onCommit,
  onLeave,
  stockAmount,
  unit,
}: Readonly<{
  amount: null | number;
  isFocused: boolean;
  onCommit: (amount: null | number) => void;
  onLeave?: () => void;
  stockAmount: number;
  unit: string;
}>) {
  const last = amount === null ? '' : String(amount);
  const [typed, setTyped] = useState(last);
  const commit = () => {
    const count = countOf(typed);
    if (count === undefined) {
      setTyped(last);
    } else if (count !== amount) {
      onCommit(count);
    }
    onLeave?.();
  };
  return (
    <span className="flex items-center justify-end gap-1">
      <Input
        ref={isFocused ? focusField : undefined}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={`Count in ${unit}`}
        placeholder={String(stockAmount)}
        className="h-7 w-20 text-right text-[0.8rem] tabular-nums"
        value={typed}
        onBlur={commit}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
        onKeyDown={(event) => {
          onCountKey(event, () => {
            setTyped(last);
            onLeave?.();
          });
        }}
      />
      <span className="w-12 truncate text-left text-xs text-muted-foreground">
        {unit}
      </span>
    </span>
  );
}
