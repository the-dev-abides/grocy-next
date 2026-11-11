import type { PendingScan } from '../api/next-api';

type AcceptFacts = Pick<PendingScan, 'amount' | 'bookingType' | 'productId'>;

// The rows that Accept all sends, and the rows that it skips, in the order
// of the list. As ADR 0010 decided, a row can be booked when it has a
// product and, for Inventory, a count.
export interface BulkAcceptPlan<Row extends AcceptFacts> {
  bookable: Row[];
  skipped: Row[];
}

function isBookable(scan: AcceptFacts): boolean {
  return (
    scan.productId !== null &&
    (scan.bookingType === 'purchase' || scan.amount !== null)
  );
}

export function bulkAcceptPlan<Row extends AcceptFacts>(
  rows: readonly Row[],
): BulkAcceptPlan<Row> {
  return {
    bookable: rows.filter((scan) => isBookable(scan)),
    skipped: rows.filter((scan) => !isBookable(scan)),
  };
}

function rowsText(count: number): string {
  return `${String(count)} ${count === 1 ? 'row' : 'rows'}`;
}

// The sentence of the skipped rows of the Accept all confirm.
function skippedSentence(count: number): string {
  if (count === 0) {
    return '';
  }
  const verbs =
    count === 1
      ? 'has no product or no count and is'
      : 'have no product or no count and are';
  return ` ${rowsText(count)} ${verbs} skipped.`;
}

// The body of the Accept all confirm: the count of rows that it books and
// the count of rows that it skips.
export function acceptConfirmText(
  bookableCount: number,
  skippedCount: number,
): string {
  return `One booking per row, ${rowsText(bookableCount)}.${skippedSentence(skippedCount)} A booking can be undone in Grocy.`;
}

// The body of the Reject all confirm: the count of rows that it deletes.
export function rejectConfirmText(count: number): string {
  const scans = count === 1 ? 'pending scan is' : 'pending scans are';
  return `${String(count)} ${scans} deleted. The queue keeps no history.`;
}

// The result line of a row that Accept all skipped.
export function skippedText(
  scan: Pick<PendingScan, 'amount' | 'productId'>,
): string {
  return scan.productId === null
    ? 'Skipped. The row has no product.'
    : 'Skipped. The row has no count.';
}
