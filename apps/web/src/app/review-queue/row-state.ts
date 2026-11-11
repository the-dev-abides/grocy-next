import type { PendingScan } from '../api/next-api';

// The state of a review queue row, from the three facts of ADR 0010: a
// product or none, an amount or none, and an error or none. The four states
// are the filter states of the spec.
export type RowState = 'failed' | 'needs-count' | 'needs-product' | 'ready';

export const stateLabel: Readonly<Record<RowState, string>> = {
  failed: 'Accept failed',
  'needs-count': 'Needs a count',
  'needs-product': 'Needs a product',
  ready: 'Ready',
};

export function stateOf(
  scan: Pick<PendingScan, 'amount' | 'bookingType' | 'error' | 'productId'>,
): RowState {
  if (scan.error !== null) {
    return 'failed';
  }
  if (scan.productId === null) {
    return 'needs-product';
  }
  if (scan.bookingType === 'inventory' && scan.amount === null) {
    return 'needs-count';
  }
  return 'ready';
}

// The accept is open for a ready row, and again for a failed row.
export function canAccept(state: RowState): boolean {
  return state === 'ready' || state === 'failed';
}
