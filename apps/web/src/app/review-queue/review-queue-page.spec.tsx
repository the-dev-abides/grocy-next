import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import type { PendingScan } from '../api/next-api';

import { cachedApi } from '../api/cache-tags';
import { ReviewQueuePage } from './review-queue-page';

// A poll that brings the list with one changed row must draw that row only.
// Before, every row drew again, because each row got the whole list and new
// callbacks. The React profiler gives, for each commit, the time of the parts
// that drew and the time that a draw of the whole page would take. When only
// one row of twenty draws, the first time is a small part of the second.

const ROW_COUNT = 20;

function scan(
  fields: Partial<PendingScan> & Pick<PendingScan, 'id'>,
): PendingScan {
  return {
    amount: 1,
    bookingType: 'purchase',
    code: null,
    createdAt: '2026-11-17T10:00:00.000Z',
    dueDate: null,
    error: null,
    lastLookupAt: null,
    locationId: null,
    lookupResult: null,
    note: null,
    price: null,
    priceType: 'unit',
    productBarcodeId: null,
    productGroupId: null,
    productId: null,
    quantityUnitId: null,
    scannedAt: '2026-11-17T10:00:00.000Z',
    spoiled: false,
    stockEntryId: null,
    storeId: null,
    toLocationId: null,
    updatedAt: '2026-11-17T10:00:00.000Z',
    writeInName: null,
    ...fields,
  };
}

function storeForTest() {
  return configureStore({
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(cachedApi.middleware),
    reducer: { [cachedApi.reducerPath]: cachedApi.reducer },
  });
}

type TestStore = ReturnType<typeof storeForTest>;

// The answer of a poll of the pending scan list, put into the cache.
async function putRows(store: TestStore, rows: PendingScan[]) {
  await act(async () => {
    await store.dispatch(
      cachedApi.util.upsertQueryData('listPendingScans', undefined, {
        items: rows,
      }),
    );
  });
}

// The master data lists, put into the cache, so the queue shows its rows.
async function putLists(store: TestStore) {
  const { upsertQueryData } = cachedApi.util;
  await act(async () => {
    await store.dispatch(
      upsertQueryData('listLocations', undefined, { items: [] }),
    );
    await store.dispatch(
      upsertQueryData('listProductGroups', undefined, { items: [] }),
    );
    await store.dispatch(
      upsertQueryData('listProducts', undefined, { items: [] }),
    );
    await store.dispatch(
      upsertQueryData('listQuantityUnitConversions', undefined, { items: [] }),
    );
    await store.dispatch(
      upsertQueryData('listQuantityUnits', undefined, { items: [] }),
    );
    await store.dispatch(
      upsertQueryData('listStores', undefined, { items: [] }),
    );
  });
}

function rowOf(index: number): PendingScan {
  const id = index + 1;
  return scan({ code: String(4010 + id), id, note: `row ${String(id)}` });
}

describe('the review queue page', () => {
  it('draws only the changed row when a poll brings the list with one changed row', async () => {
    const rows: PendingScan[] = [];
    for (let index = 0; index < ROW_COUNT; index += 1) {
      rows.push(rowOf(index));
    }
    const store = storeForTest();
    await putLists(store);
    await putRows(store, rows);
    const commits: { actual: number; base: number }[] = [];
    // The third and the fourth values are the time of the parts that drew and
    // the time of a draw of the whole tree.
    const onRender: ProfilerOnRenderCallback = (...values) => {
      commits.push({ actual: values[2], base: values[3] });
    };
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Profiler id="queue" onRender={onRender}>
            <ReviewQueuePage />
          </Profiler>
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findByText('row 20')).toBeDefined();
    commits.length = 0;

    const changed = rows.map((row) =>
      row.id === 7 ? { ...row, note: 'row 7 changed' } : row,
    );
    await putRows(store, changed);

    expect(await screen.findByText('row 7 changed')).toBeDefined();
    const actual = commits.reduce((sum, commit) => sum + commit.actual, 0);
    const base = Math.max(...commits.map((commit) => commit.base));
    expect(actual).toBeLessThan(base / 2);
  });
});
