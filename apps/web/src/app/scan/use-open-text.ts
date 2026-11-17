import { skipToken } from '@reduxjs/toolkit/query';

import type { PendingScan } from '../api/next-api';

import { useGetProductQuery } from '../api/next-api';
import { planOfScan } from '../review-queue/plan-of-scan';
import { openText } from '../review-queue/stock-plan-text';

// The words of the open on consume of a Consume row on the scan screen: "Opens
// a new pack" or "From the opened pack". The row reads the stock entries
// through the product read. The words come from the stock entry lines that
// the review queue shows, on the rows of the session. A Transfer row and a row
// with no product have no words.
export function useOpenText(
  scan: PendingScan,
  rows: readonly PendingScan[],
): null | string {
  const isConsume = scan.bookingType === 'consume';
  const product = useGetProductQuery(
    !isConsume || scan.productId === null ? skipToken : { id: scan.productId },
  ).data;
  return !isConsume || product === undefined
    ? null
    : openText(planOfScan(scan, rows, product, ''));
}
