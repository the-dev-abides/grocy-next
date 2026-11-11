import { useState } from 'react';

import type { PendingScan, UpdatePendingScan } from '../api/next-api';
import type { ResultLine } from './result-panel';
import type { QueueLists } from './use-review-queue';

import {
  nextApi,
  useCreateBookingMutation,
  useDeletePendingScanMutation,
  useUpdatePendingScanMutation,
} from '../api/next-api';
import { nameOf } from '../scan/scan-text';
import { bulkAcceptPlan, skippedText } from './bulk-accept';
import { bookingText, failureText } from './result-text';
import { rowName } from './row-text';

type Line = Omit<ResultLine, 'key'>;

export interface BulkActions {
  acceptAll: (rows: readonly PendingScan[]) => void;
  editAll: (rows: readonly PendingScan[], body: UpdatePendingScan) => void;
  isRunning: boolean;
  rejectAll: (rows: readonly PendingScan[]) => void;
}

interface RunFacts {
  onChanged: () => void;
  onClear: () => void;
  onResult: (line: Line) => void;
}

// A bulk run sends one call per row, one row after the other. It clears the
// result panel first, so the panel shows the lines of that run, and it
// refetches the list at the end.
function useBulkRun({ onChanged, onClear, onResult }: RunFacts) {
  const [isRunning, setIsRunning] = useState(false);
  async function run(
    rows: readonly PendingScan[],
    action: (scan: PendingScan) => Promise<Line | null>,
  ): Promise<void> {
    setIsRunning(true);
    onClear();
    for (const scan of rows) {
      const line = await action(scan);
      if (line !== null) {
        onResult(line);
      }
    }
    setIsRunning(false);
    onChanged();
  }
  return { isRunning, run };
}

// The accept of one row of a bulk run. The result line names the row and
// the booking in the stock unit of the product from the product read, or
// the problem. A failed product read names no unit.
function useAcceptOne(lists: QueueLists) {
  const [createBooking] = useCreateBookingMutation();
  const [getProduct] = nextApi.useLazyGetProductQuery();

  async function productFacts(
    scan: PendingScan,
  ): Promise<{ name: string; unit: string }> {
    const fallback = { name: rowName(scan, lists.products), unit: '' };
    if (scan.productId === null) {
      return fallback;
    }
    try {
      const product = await getProduct({ id: scan.productId }, true).unwrap();
      return {
        name: product.name,
        unit: nameOf(lists.quantityUnits, product.stockUnitId, ''),
      };
    } catch {
      return fallback;
    }
  }

  return async (scan: PendingScan): Promise<Line> => {
    const { name, unit } = await productFacts(scan);
    try {
      const booking = await createBooking({
        createBooking: { pendingScanId: scan.id },
      }).unwrap();
      return {
        message: bookingText(booking, unit, lists.locations),
        name,
        outcome: 'booked',
      };
    } catch (error) {
      return { message: failureText(error), name, outcome: 'failed' };
    }
  };
}

// A reject and an update give a line only when they fail.
async function failureLine(
  name: string,
  call: () => Promise<unknown>,
): Promise<Line | null> {
  try {
    await call();
    return null;
  } catch (error) {
    return { message: failureText(error), name, outcome: 'failed' };
  }
}

// The bulk actions of ADR 0010: the client calls one operation per row, and
// each call is one result. Accept all sends only the rows that can be booked
// and gives each skipped row a line.
export function useBulkActions({
  lists,
  ...runFacts
}: Readonly<RunFacts & { lists: QueueLists }>): BulkActions {
  const [deletePendingScan] = useDeletePendingScanMutation();
  const [updatePendingScan] = useUpdatePendingScanMutation();
  const { isRunning, run } = useBulkRun(runFacts);
  const acceptOne = useAcceptOne(lists);
  const nameOfRow = (scan: PendingScan) => rowName(scan, lists.products);
  return {
    acceptAll: (rows) => {
      const { skipped } = bulkAcceptPlan(rows);
      void run(rows, async (scan) => {
        return skipped.includes(scan)
          ? {
              message: skippedText(scan),
              name: nameOfRow(scan),
              outcome: 'skipped',
            }
          : acceptOne(scan);
      });
    },
    editAll: (rows, body) => {
      void run(rows, (scan) => {
        return failureLine(nameOfRow(scan), () =>
          updatePendingScan({ id: scan.id, updatePendingScan: body }).unwrap(),
        );
      });
    },
    isRunning,
    rejectAll: (rows) => {
      void run(rows, (scan) => {
        return failureLine(nameOfRow(scan), () =>
          deletePendingScan({ id: scan.id }).unwrap(),
        );
      });
    },
  };
}
