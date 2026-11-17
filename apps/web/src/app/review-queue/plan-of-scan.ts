import type { PendingScan } from '../api/next-api';
import type { Plan, PlanProduct, PlanRow } from './stock-plan';

import { plansOf } from './stock-plan';

type QueueRow = PlanRow & Pick<PendingScan, 'productId' | 'scannedAt'>;

// The plan of one row among the rows of the queue. The rows of the same
// product chain, oldest scan first, as `plansOf` decides.
export function planOfScan(
  scan: QueueRow,
  rows: readonly QueueRow[],
  product: PlanProduct,
  unit: string,
): null | Plan {
  const ofProduct = [
    ...rows.filter(
      (row) => row.productId === scan.productId && row.id !== scan.id,
    ),
    scan,
  ].toSorted((first, second) => {
    const byTime = first.scannedAt.localeCompare(second.scannedAt);
    return byTime === 0 ? first.id - second.id : byTime;
  });
  return plansOf(ofProduct, product, unit).get(scan.id) ?? null;
}
