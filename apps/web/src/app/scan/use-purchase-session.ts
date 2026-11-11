import { useState } from 'react';

import type { PendingScan } from '../api/next-api';
import type { ScanRowLists } from './scan-row';

import {
  useCreatePendingScanMutation,
  useDeletePendingScanMutation,
  useListLocationsQuery,
  useListPendingScansQuery,
  useListProductsQuery,
  useListQuantityUnitsQuery,
  useUpdatePendingScanMutation,
} from '../api/next-api';
import { sessionRows } from './session-rows';
import { nextAmount } from './swipe';

// The pending scan list refreshes every three seconds while the screen is
// open, as ADR 0014 decided.
const POLL_MS = 3000;

export interface PurchaseSession {
  addCode: (code: string) => void;
  changeAmount: (scan: PendingScan, delta: number) => void;
  hasFailed: boolean;
  lists: ScanRowLists;
  reject: (scan: PendingScan) => void;
  rows: readonly PendingScan[];
}

// The scan session of the Purchase screen: the rows that this screen created
// or merged, the master data lists that name a row, the create call of a
// typed code, the update of plus and minus, and the delete of the swipe. The
// session is not stored. A new screen starts a new session. Every call
// refetches the list, so the row changes before the next poll.
export function usePurchaseSession(): PurchaseSession {
  const [sessionIds, setSessionIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [hasFailed, setHasFailed] = useState(false);
  const pendingScans = useListPendingScansQuery(undefined, {
    pollingInterval: POLL_MS,
  });
  const lists: ScanRowLists = {
    locations: useListLocationsQuery(undefined).data?.items,
    products: useListProductsQuery(undefined).data?.items,
    quantityUnits: useListQuantityUnitsQuery(undefined).data?.items,
  };
  const [createPendingScan] = useCreatePendingScanMutation();
  const [updatePendingScan] = useUpdatePendingScanMutation();
  const [deletePendingScan] = useDeletePendingScanMutation();

  async function send(call: Promise<PendingScan>): Promise<void> {
    try {
      const scan = await call;
      setSessionIds((ids) => new Set([...ids, scan.id]));
      setHasFailed(false);
      await pendingScans.refetch();
    } catch {
      setHasFailed(true);
    }
  }

  return {
    addCode: (code) => {
      void send(
        createPendingScan({
          createPendingScan: { bookingType: 'purchase', code },
        }).unwrap(),
      );
    },
    changeAmount: (scan, delta) => {
      void send(
        updatePendingScan({
          id: scan.id,
          updatePendingScan: { amount: nextAmount(scan.amount, delta) },
        }).unwrap(),
      );
    },
    hasFailed,
    lists,
    reject: (scan) => {
      void send(deletePendingScan({ id: scan.id }).unwrap());
    },
    rows: sessionRows(pendingScans.data?.items ?? [], sessionIds, 'purchase'),
  };
}
