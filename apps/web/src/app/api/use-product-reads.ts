import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

import { useEffect, useMemo } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import type { PendingScan, Product } from './next-api';

import { isSwitchBookingType } from '../booking-types';
import { nextApi } from './next-api';

// The product ids of the rows with a product, in one order.
function rowProductIdsOf(rows: readonly PendingScan[]): number[] {
  const ids = rows.map((row) => row.productId).filter((id) => id !== null);
  return [...new Set(ids)].toSorted((first, second) => first - second);
}

// The product ids of the Consume rows and the Transfer rows, in one order.
function productIdsOf(rows: readonly PendingScan[]): number[] {
  return rowProductIdsOf(
    rows.filter((row) => isSwitchBookingType(row.bookingType)),
  );
}

// This hook loads the product read of each id and keeps it while the
// component is on the screen. The ids come as one key, so a draw with the
// same ids does not load the reads again.
function useLoadedReads(ids: readonly number[]): void {
  const key = ids.join(',');
  const dispatch =
    useDispatch<ThunkDispatch<unknown, unknown, UnknownAction>>();
  useEffect(() => {
    const reads = key
      .split(',')
      .filter((id) => id !== '')
      .map((id) => {
        return dispatch(
          nextApi.endpoints.getProduct.initiate({ id: Number(id) }),
        );
      });
    return () => {
      for (const read of reads) {
        read.unsubscribe();
      }
    };
  }, [dispatch, key]);
}

// This hook starts the product read of each row with a product. The review
// queue calls it when the pending scan list arrives. The rows wait for the
// master data lists, and the first draw of many rows is slow. Thus the reads
// do not wait for the rows to show.
export function useRowProductReads(rows: readonly PendingScan[]): void {
  useLoadedReads(rowProductIdsOf(rows));
}

// The product reads of the products of the Consume rows and the Transfer
// rows. The stock entry lines of a row chain with the rows that share its stock
// entries. These can be rows of other products and rows that the filter
// hides. Thus the hook loads the read of each product and keeps it while the
// screen is open. A read that did not load yet is not in the map.
export function useProductReads(
  rows: readonly PendingScan[],
): ReadonlyMap<number, Product> {
  type ApiState = Parameters<
    ReturnType<typeof nextApi.endpoints.getProduct.select>
  >[0];
  const ids = productIdsOf(rows);
  useLoadedReads(ids);
  const products = useSelector((state: ApiState) => {
    return ids.map(
      (id) => nextApi.endpoints.getProduct.select({ id })(state).data,
    );
  }, shallowEqual);
  return useMemo(() => {
    const map = new Map<number, Product>();
    for (const product of products) {
      if (product !== undefined) {
        map.set(product.id, product);
      }
    }
    return map;
  }, [products]);
}
