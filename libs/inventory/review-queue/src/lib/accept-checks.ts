import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';

import type { StoredPendingScan } from './storage/stored-pending-scan.ts';

// The accept of a pending scan with no product is refused, as ADR 0010
// decided. The row gets a product first.
export function productIdOf(row: StoredPendingScan): number {
  if (row.productId === null) {
    throw new ProblemException(
      PROBLEM_TYPES.noProduct,
      'The pending scan has no product. Set a product first.',
    );
  }
  return row.productId;
}

// A Transfer needs a "to" location. The accept of a Transfer with none is
// refused, as the spec decided, the same as the accept with no product.
export function toLocationIdOf(row: StoredPendingScan): number {
  if (row.toLocationId === null) {
    throw new ProblemException(
      PROBLEM_TYPES.noToLocation,
      'A Transfer needs a "to" location. Set the "to" location first.',
    );
  }
  return row.toLocationId;
}

// A Purchase, a Consume, and a Transfer book an amount of more than zero. Null, zero, or
// less is the no-amount problem.
export function positiveAmountOf(
  row: StoredPendingScan,
  words: string,
): number {
  if (row.amount === null || row.amount <= 0) {
    throw new ProblemException(
      PROBLEM_TYPES.noAmount,
      `${words} needs an amount of more than zero.`,
    );
  }
  return row.amount;
}

// An Inventory pending scan arrives with no amount, and the review queue
// sets it. The accept with no amount is refused, as ADR 0010 decided.
export function inventoryAmountOf(row: StoredPendingScan): number {
  if (row.amount === null) {
    throw new ProblemException(
      PROBLEM_TYPES.noAmount,
      'An Inventory needs the new amount of the product.',
    );
  }
  return row.amount;
}
