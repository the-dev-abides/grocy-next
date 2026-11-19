import type { PendingScan } from '../api/next-api';

// The state of a review queue row, from the facts of ADR 0010. The facts are a
// product or none, an amount or none, an error or none, and on a Transfer a
// "to" location or none. The states are the filter states of the spec.
export type RowState =
  'failed' | 'needs-count' | 'needs-product' | 'needs-to-location' | 'ready';

export const stateLabel: Readonly<Record<RowState, string>> = {
  failed: 'Accept failed',
  'needs-count': 'Needs a count',
  'needs-product': 'Needs a product',
  'needs-to-location': "Needs a 'to' location",
  ready: 'Ready',
};

export function stateOf(
  scan: Pick<
    PendingScan,
    'amount' | 'bookingType' | 'error' | 'productId' | 'toLocationId'
  >,
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
  if (scan.bookingType === 'transfer' && scan.toLocationId === null) {
    return 'needs-to-location';
  }
  return 'ready';
}

// The accept is open for a ready row, and again for a failed row.
export function canAccept(state: RowState): boolean {
  return state === 'ready' || state === 'failed';
}
