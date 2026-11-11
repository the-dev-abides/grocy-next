import type { PendingScan } from '../api/next-api';

interface Named {
  id: number;
  name: string;
}

// This function returns the name of the master data row with the id, the
// fallback when the id is null, and the id itself while the list has not
// loaded yet.
export function nameOf(
  rows: readonly Named[] | undefined,
  id: null | number,
  fallback: string,
): string {
  return id === null
    ? fallback
    : (rows?.find((row) => row.id === id)?.name ?? `#${String(id)}`);
}

// The time of a scan in the time zone of the browser, as the browser locale
// writes hours and minutes.
export function timeOf(timestamp: string): string {
  return Temporal.Instant.from(timestamp).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// The price of a row as entered, with its price type, or the words for none.
export function priceText(
  scan: Pick<PendingScan, 'price' | 'priceType'>,
): string {
  return scan.price === null
    ? 'no price'
    : `${String(scan.price)} ${scan.priceType}`;
}

// The due date of a row, or the words for the Grocy product default.
export function dueDateText(dueDate: null | string): string {
  return dueDate ?? 'default due';
}
