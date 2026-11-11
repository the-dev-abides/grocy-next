import type {
  Location,
  PendingScan,
  ProductGroup,
  ProductListItem,
  QuantityUnit,
  Store,
} from '../api/next-api';

import {
  useListLocationsQuery,
  useListPendingScansQuery,
  useListProductGroupsQuery,
  useListProductsQuery,
  useListQuantityUnitsQuery,
  useListStoresQuery,
} from '../api/next-api';
import { POLL_MS } from '../api/poll-interval';
import { queueRows } from './queue-rows';

// The master data lists that name the facts of a row and fill the selects of
// the short product form.
export interface QueueLists {
  locations: readonly Location[] | undefined;
  productGroups: readonly ProductGroup[] | undefined;
  products: readonly ProductListItem[] | undefined;
  quantityUnits: readonly QuantityUnit[] | undefined;
  stores: readonly Store[] | undefined;
}

export interface ReviewQueue {
  isError: boolean;
  isLoading: boolean;
  lists: QueueLists;
  refetch: () => void;
  rows: readonly PendingScan[] | undefined;
}

// The review queue: every pending scan of both booking types, most recent at the top, polled while the screen is open, and the lists that name a row.
// An accept and a reject refetch the list, so the row changes before the
// next poll.
export function useReviewQueue(): ReviewQueue {
  const pendingScans = useListPendingScansQuery(undefined, {
    pollingInterval: POLL_MS,
  });
  const items = pendingScans.data?.items;
  return {
    isError: pendingScans.isError,
    isLoading: pendingScans.isLoading,
    lists: {
      locations: useListLocationsQuery(undefined).data?.items,
      productGroups: useListProductGroupsQuery(undefined).data?.items,
      products: useListProductsQuery(undefined).data?.items,
      quantityUnits: useListQuantityUnitsQuery(undefined).data?.items,
      stores: useListStoresQuery(undefined).data?.items,
    },
    refetch: () => {
      void pendingScans.refetch();
    },
    rows: items === undefined ? undefined : queueRows(items),
  };
}
