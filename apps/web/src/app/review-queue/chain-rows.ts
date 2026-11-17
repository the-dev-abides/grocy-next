import type { PendingScan } from '../api/next-api';

// No older rows. One shared value, so a row with no older rows keeps an equal
// prop between draws.
export const NO_ROWS: readonly PendingScan[] = [];

function isOlder(first: PendingScan, second: PendingScan): boolean {
  const byTime = first.scannedAt.localeCompare(second.scannedAt);
  return byTime === 0 ? first.id < second.id : byTime < 0;
}

// The stock entry lines of a row see the stock after the older rows of the
// same product. This function gives each row of the queue those older rows,
// oldest first. The rows are every row of the queue, also the rows that the
// filter hides. Thus a row gets only the slice that its stock entry lines
// read, not the whole list.
export function chainRowsOf(
  rows: readonly PendingScan[],
): ReadonlyMap<number, readonly PendingScan[]> {
  const byProduct = new Map<number, PendingScan[]>();
  for (const row of rows) {
    if (row.productId !== null) {
      byProduct.set(row.productId, [
        ...(byProduct.get(row.productId) ?? []),
        row,
      ]);
    }
  }
  const chains = new Map<number, readonly PendingScan[]>();
  for (const ofProduct of byProduct.values()) {
    for (const row of ofProduct) {
      const older = ofProduct
        .filter((other) => isOlder(other, row))
        .toSorted((first, second) => (isOlder(first, second) ? -1 : 1));
      chains.set(row.id, older.length === 0 ? NO_ROWS : older);
    }
  }
  return chains;
}

// Whether two slices hold the same rows. A poll keeps the identity of each
// row that did not change, so the rows compare by identity.
export function isSameRows(
  first: readonly PendingScan[],
  second: readonly PendingScan[],
): boolean {
  return (
    first.length === second.length &&
    first.every((row, index) => row === second[index])
  );
}
