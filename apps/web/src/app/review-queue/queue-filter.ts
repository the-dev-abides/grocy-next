import type { PendingScan } from '../api/next-api';

import { type RowState, stateOf } from './row-state';

// The filter of the review queue, as the spec decided: a location, a product
// group, and a state. A null part keeps every row. The location is the location
// of the row. The product group is the product group of the row, which the scan
// screens copy from the session defaults.
export interface QueueFilter {
  locationId: null | number;
  productGroupId: null | number;
  state: null | RowState;
}

export const NO_FILTER: QueueFilter = {
  locationId: null,
  productGroupId: null,
  state: null,
};

function isMatch(scan: PendingScan, filter: QueueFilter): boolean {
  return (
    (filter.locationId === null || scan.locationId === filter.locationId) &&
    (filter.productGroupId === null ||
      scan.productGroupId === filter.productGroupId) &&
    (filter.state === null || stateOf(scan) === filter.state)
  );
}

// The rows that the filter shows, client-side over the full list, in the
// order of the list.
export function filterRows(
  rows: readonly PendingScan[],
  filter: QueueFilter,
): PendingScan[] {
  return rows.filter((scan) => isMatch(scan, filter));
}
