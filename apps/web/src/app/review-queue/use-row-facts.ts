import { skipToken } from '@reduxjs/toolkit/query';

import type { PendingScan, Product } from '../api/next-api';
import type { ResultLine } from './result-panel';
import type { QueueLists } from './use-review-queue';

import { useGetProductQuery } from '../api/next-api';
import { nameOf } from '../scan/scan-text';
import { stateOf } from './row-state';
import { rowName, unitOf } from './row-text';
import { useRowActions } from './use-row-actions';

// The stock unit of the product, in which the result line names a booking.
function stockUnitOf(
  product: Product | undefined,
  quantityUnits: QueueLists['quantityUnits'],
): string {
  return product === undefined
    ? ''
    : nameOf(quantityUnits, product.stockUnitId, '');
}

// The facts of a row of the table and of a card: the product read, the
// state, the unit, the name, and the actions.
export function useRowFacts({
  lists,
  onChanged,
  onResult,
  scan,
}: Readonly<{
  lists: QueueLists;
  onChanged: () => void;
  onResult: (line: Omit<ResultLine, 'key'>) => void;
  scan: PendingScan;
}>) {
  const product = useGetProductQuery(
    scan.productId === null ? skipToken : { id: scan.productId },
  ).data;
  // The product read names a product that the product list does not hold
  // yet, such as a product that the short product form created.
  const name = product?.name ?? rowName(scan, lists.products);
  const actions = useRowActions({
    locations: lists.locations,
    name,
    onChanged,
    onResult,
    scan,
    stockUnit: stockUnitOf(product, lists.quantityUnits),
  });
  return {
    actions,
    name,
    product,
    state: stateOf(scan),
    unit: unitOf(scan, product, lists.quantityUnits),
  };
}
