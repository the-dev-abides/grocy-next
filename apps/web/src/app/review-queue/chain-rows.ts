import type { PendingScan, Product } from '../api/next-api';

import { entriesOf } from './stock-entries';

// One older row of the chain of a row, with the product read of its product.
// The read is undefined while it did not load.
export interface ChainRow {
  product: Product | undefined;
  row: PendingScan;
}

// No older rows. One shared value, so a row with no older rows keeps an equal
// prop between draws.
export const NO_ROWS: readonly ChainRow[] = [];

function isOlder(first: PendingScan, second: PendingScan): boolean {
  const byTime = first.scannedAt.localeCompare(second.scannedAt);
  return byTime === 0 ? first.id < second.id : byTime < 0;
}

// The keys that a row shares with other rows: its product, and each stock
// entry that the read of its product shows. The read of a parent product
// shows the stock entries of its sub-products too.
function keysOf(row: PendingScan, product: Product | undefined): string[] {
  const entries = product === undefined ? [] : entriesOf(product);
  return [
    `product:${String(row.productId)}`,
    ...entries.map((entry) => `stock:${entry.stockId}`),
  ];
}

// The groups of rows that share a key, directly or through other rows.
function groupsOf(
  rows: readonly PendingScan[],
  productReads: ReadonlyMap<number, Product>,
): PendingScan[][] {
  const groups: { keys: Set<string>; rows: PendingScan[] }[] = [];
  for (const row of rows) {
    if (row.productId === null) {
      continue;
    }
    const keys = keysOf(row, productReads.get(row.productId));
    const joined = groups.filter((group) =>
      keys.some((key) => group.keys.has(key)),
    );
    const merged: { keys: Set<string>; rows: PendingScan[] } = {
      keys: new Set(keys),
      rows: [],
    };
    for (const group of joined) {
      for (const key of group.keys) {
        merged.keys.add(key);
      }
      merged.rows.push(...group.rows);
    }
    merged.rows.push(row);
    for (const group of joined) {
      groups.splice(groups.indexOf(group), 1);
    }
    groups.push(merged);
  }
  return groups.map((group) => group.rows);
}

// The stock entry lines of a row see the stock after the older rows that take
// from the same stock entries. These are the older rows of the same product,
// and the rows of a parent product and of its sub-products. This function
// gives each row of the queue those older rows, oldest first, with their
// product reads. The rows are every row of the queue, also the rows that the
// filter hides. Thus a row gets only the slice that its stock entry lines
// read, not the whole list.
export function chainRowsOf(
  rows: readonly PendingScan[],
  productReads: ReadonlyMap<number, Product> = new Map(),
): ReadonlyMap<number, readonly ChainRow[]> {
  const chains = new Map<number, readonly ChainRow[]>();
  for (const group of groupsOf(rows, productReads)) {
    for (const row of group) {
      const older = group
        .filter((other) => isOlder(other, row))
        .toSorted((first, second) => (isOlder(first, second) ? -1 : 1))
        .map((other) => {
          const product =
            other.productId === null
              ? undefined
              : productReads.get(other.productId);
          return { product, row: other };
        });
      chains.set(row.id, older.length === 0 ? NO_ROWS : older);
    }
  }
  return chains;
}

// Whether two slices hold the same rows. A poll keeps the identity of each
// row that did not change, and the cache keeps the identity of each product
// read. Thus the rows and the reads compare by identity.
export function isSameRows(
  first: readonly ChainRow[],
  second: readonly ChainRow[],
): boolean {
  return (
    first.length === second.length &&
    first.every((item, index) => {
      const other = second[index];
      return item.row === other?.row && item.product === other.product;
    })
  );
}
