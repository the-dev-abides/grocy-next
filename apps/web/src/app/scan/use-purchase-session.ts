import { useState } from 'react';

import type { PendingScan } from '../api/next-api';
import type { ScanRowLists } from './scan-row';

import {
  useCreatePendingScanMutation,
  useListLocationsQuery,
  useListPendingScansQuery,
  useListProductsQuery,
  useListQuantityUnitsQuery,
} from '../api/next-api';
import { sessionRows } from './session-rows';

// The pending scan list refreshes every three seconds while the screen is
// open, as ADR 0014 decided.
const POLL_MS = 3000;

export interface PurchaseSession {
  addCode: (code: string) => void;
  hasFailed: boolean;
  lists: ScanRowLists;
  rows: readonly PendingScan[];
}

// The scan session of the Purchase screen: the rows that this screen created
// or merged, the master data lists that name a row, and the create call of a
// typed code. The session is not stored. A new screen starts a new session.
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

  async function create(code: string): Promise<void> {
    try {
      const scan = await createPendingScan({
        createPendingScan: { bookingType: 'purchase', code },
      }).unwrap();
      setSessionIds((ids) => new Set([...ids, scan.id]));
      setHasFailed(false);
      await pendingScans.refetch();
    } catch {
      setHasFailed(true);
    }
  }

  return {
    addCode: (code) => {
      void create(code);
    },
    hasFailed,
    lists,
    rows: sessionRows(pendingScans.data?.items ?? [], sessionIds, 'purchase'),
  };
}
