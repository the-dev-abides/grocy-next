import { useCallback, useMemo } from 'react';

import type {
  Location,
  PendingScan,
  ProductGroup,
  ProductListItem,
  QuantityUnit,
  QuantityUnitConversion,
  Store,
} from '../api/next-api';

import {
  useListLocationsQuery,
  useListPendingScansQuery,
  useListProductGroupsQuery,
  useListProductsQuery,
  useListQuantityUnitConversionsQuery,
  useListQuantityUnitsQuery,
  useListStoresQuery,
} from '../api/next-api';
import { POLL_MS } from '../api/poll-interval';
import { useRowProductReads } from '../api/use-product-reads';
import { queueRows } from './queue-rows';

// The master data lists that name the facts of a row and fill the selects of
// the short product form. The household conversions take part in the stock
// unit proposal of the short product form.
export interface QueueLists {
  locations: readonly Location[] | undefined;
  productGroups: readonly ProductGroup[] | undefined;
  products: readonly ProductListItem[] | undefined;
  quantityUnitConversions: readonly QuantityUnitConversion[] | undefined;
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

const NO_ITEMS: readonly PendingScan[] = [];

// The review queue. It holds every pending scan of both booking types, most
// recent at the top, and the lists that name a row. It polls the list while the
// screen is open. An accept and a reject refetch the list, so the row changes
// before the next poll. The cache tags of `cache-tags.ts` load the list again
// when a poll was on the way during the change. The queue gives its rows only
// when every list that names a row has loaded or failed. Each list that comes
// in draws every row again, so rows that show early cost one full draw per
// list, and they show "#3" in place of the names in the meantime. The lists
// and the refetch keep their identity between draws, so a row that did not
// change does not draw again. The product reads of the rows start when the
// list arrives. They do not wait for the lists or for the first draw.
export function useReviewQueue(): ReviewQueue {
  // The hook reads only the fields that the queue uses. Thus a poll that
  // brings the same list does not draw the screen again: the fetch flag of
  // the poll changes, but the queue does not read it.
  const pendingScans = useListPendingScansQuery(undefined, {
    pollingInterval: POLL_MS,
    selectFromResult: ({ data, isError, isLoading }) => {
      return {
        data,
        isError,
        isLoading,
      };
    },
  });
  const { refetch } = pendingScans;
  const items = pendingScans.data?.items;
  useRowProductReads(items ?? NO_ITEMS);
  const masterData = useMasterDataLists();
  const isLoading = pendingScans.isLoading || masterData.isLoading;
  const rows = useMemo(
    () => (items === undefined || isLoading ? undefined : queueRows(items)),
    [isLoading, items],
  );
  return {
    isError: pendingScans.isError,
    isLoading,
    lists: masterData.lists,
    refetch: useCallback(() => {
      void refetch();
    }, [refetch]),
    rows,
  };
}

// The master data lists of the queue, and whether one of them still loads
// for the first time. A list that failed to load does not count as loading,
// so it does not hold the rows back. Its rows show the fallback names.
function useMasterDataLists(): { isLoading: boolean; lists: QueueLists } {
  const queries = {
    locations: useListLocationsQuery(undefined),
    productGroups: useListProductGroupsQuery(undefined),
    products: useListProductsQuery(undefined),
    quantityUnitConversions: useListQuantityUnitConversionsQuery(undefined),
    quantityUnits: useListQuantityUnitsQuery(undefined),
    stores: useListStoresQuery(undefined),
  };
  const locations = queries.locations.data?.items;
  const productGroups = queries.productGroups.data?.items;
  const products = queries.products.data?.items;
  const quantityUnitConversions = queries.quantityUnitConversions.data?.items;
  const quantityUnits = queries.quantityUnits.data?.items;
  const stores = queries.stores.data?.items;
  const lists = useMemo(() => {
    return {
      locations,
      productGroups,
      products,
      quantityUnitConversions,
      quantityUnits,
      stores,
    };
  }, [
    locations,
    productGroups,
    products,
    quantityUnitConversions,
    quantityUnits,
    stores,
  ]);
  return {
    isLoading: Object.values(queries).some((query) => query.isLoading),
    lists,
  };
}
