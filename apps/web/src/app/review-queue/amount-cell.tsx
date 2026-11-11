import { useState } from 'react';

import type { PendingScan, Product } from '../api/next-api';

import { CountField } from './count-field';

// The amount of a row from `md`. An Inventory row of a known product has the
// count field of the spec: the field is open while the row has no count, and
// a click on the count opens it again. Every other amount is text, because
// the inline edit of the other cells is a later milestone.
export function AmountCell({
  onCount,
  product,
  scan,
  text,
  unit,
}: Readonly<{
  onCount: (amount: null | number) => void;
  product: Product | undefined;
  scan: PendingScan;
  text: string;
  unit: string;
}>) {
  const [isEditing, setIsEditing] = useState(false);
  if (product === undefined || scan.bookingType !== 'inventory') {
    return <span>{text}</span>;
  }
  if (isEditing || scan.amount === null) {
    return (
      <CountField
        amount={scan.amount}
        isFocused={isEditing}
        stockAmount={product.stockAmount}
        unit={unit}
        onCommit={onCount}
        onLeave={() => {
          setIsEditing(false);
        }}
      />
    );
  }
  return (
    <button
      type="button"
      title="Click to edit"
      className="
        -mx-1 rounded-sm px-1 py-0.5 tabular-nums
        hover:bg-muted
      "
      onClick={() => {
        setIsEditing(true);
      }}
    >
      {text}
    </button>
  );
}
