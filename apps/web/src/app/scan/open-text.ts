import type { PendingScan, Product } from '../api/next-api';

import { planOfScan } from '../review-queue/plan-of-scan';
import { openText } from '../review-queue/stock-plan-text';

// The words of the open on consume of a Consume row on the scan screen: "Opens
// a new pack" or "From the opened pack". The row reads the stock entries
// through the product read. The words come from the stock entry lines that
// the review queue shows, on the rows of the session. A Transfer row and a row
// with no product read have no words.
export function scanOpenText(
  scan: PendingScan,
  rows: readonly PendingScan[],
  product: Product | undefined,
): null | string {
  return product === undefined || scan.bookingType !== 'consume'
    ? null
    : openText(planOfScan(scan, rows, product, ''));
}
