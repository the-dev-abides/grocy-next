import type { ReactNode } from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';

import type { PendingScan } from '../api/next-api';

import { cachedApi } from '../api/cache-tags';
import { useReviewQueue } from './use-review-queue';

// The review queue shows its rows only when every list that names a row has
// loaded or failed. Before, the queue showed the rows at once, and each list
// that came later made the screen draw every row again. With some dozen rows
// that took seconds on a slow device, and the rows showed "#3" in the
// meantime. The test has no API, so a list that is not in the cache fails to
// load.

function scan(id: number): PendingScan {
  return {
    amount: 1,
    bookingType: 'purchase',
    code: null,
    createdAt: '2026-11-17T10:00:00.000Z',
    dueDate: null,
    error: null,
    id,
    lastLookupAt: null,
    locationId: null,
    lookupResult: null,
    note: null,
    price: null,
    priceType: 'unit',
    productBarcodeId: null,
    productGroupId: null,
    productId: 3,
    quantityUnitId: null,
    scannedAt: '2026-11-17T10:00:00.000Z',
    spoiled: false,
    stockEntryId: null,
    storeId: null,
    toLocationId: null,
    updatedAt: '2026-11-17T10:00:00.000Z',
    writeInName: null,
  };
}

// A new store with the API slice of the app for each test.
function storeForTest() {
  return configureStore({
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(cachedApi.middleware),
    reducer: { [cachedApi.reducerPath]: cachedApi.reducer },
  });
}

type TestStore = ReturnType<typeof storeForTest>;

function wrapperOf(store: TestStore) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <Provider store={store}>{children}</Provider>;
  };
}

// The pending scans and the master data lists, put into the cache of the API
// slice. The quantity units and the stores come in only when the test asks.
async function putLists(store: TestStore, rows: PendingScan[]) {
  const { upsertQueryData } = cachedApi.util;
  await act(async () => {
    await store.dispatch(
      upsertQueryData('listPendingScans', undefined, { items: rows }),
    );
    await store.dispatch(
      upsertQueryData('listLocations', undefined, { items: [] }),
    );
    await store.dispatch(
      upsertQueryData('listProductGroups', undefined, { items: [] }),
    );
    await store.dispatch(
      upsertQueryData('listProducts', undefined, {
        items: [{ description: null, id: 3, name: 'Nutella Biscuits 304 g' }],
      }),
    );
    await store.dispatch(
      upsertQueryData('listQuantityUnitConversions', undefined, { items: [] }),
    );
  });
}

describe('the review queue', () => {
  it('shows no rows while a list that names a row has not loaded, and shows them when the last list loads', async () => {
    const store = storeForTest();
    await putLists(store, [scan(1), scan(2)]);
    await act(async () => {
      await store.dispatch(
        cachedApi.util.upsertQueryData('listStores', undefined, { items: [] }),
      );
    });

    const { result } = renderHook(useReviewQueue, {
      wrapper: wrapperOf(store),
    });

    expect(result.current.rows).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await store.dispatch(
        cachedApi.util.upsertQueryData('listQuantityUnits', undefined, {
          items: [],
        }),
      );
    });

    expect(result.current.rows?.map(({ id }) => id)).toEqual([2, 1]);
    expect(result.current.isLoading).toBe(false);
  });

  it('shows the rows when a list that names a row failed to load', async () => {
    const store = storeForTest();
    await putLists(store, [scan(1)]);
    await act(async () => {
      await store.dispatch(
        cachedApi.util.upsertQueryData('listQuantityUnits', undefined, {
          items: [],
        }),
      );
    });

    const { result } = renderHook(useReviewQueue, {
      wrapper: wrapperOf(store),
    });

    await waitFor(() => {
      expect(result.current.rows?.map(({ id }) => id)).toEqual([1]);
    });
    expect(result.current.lists.stores).toBeUndefined();
  });
});
