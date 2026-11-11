import { useState } from 'react';

import type { PendingScan } from '../api/next-api';
import type { ScanRowLists } from './scan-row';
import type { DefaultsLists } from './session-defaults';
import type { ScanDefaults } from './use-scan-defaults';

import {
  useCreatePendingScanMutation,
  useDeletePendingScanMutation,
  useListLocationsQuery,
  useListPendingScansQuery,
  useListProductGroupsQuery,
  useListProductsQuery,
  useListQuantityUnitsQuery,
  useListStoresQuery,
  useUpdatePendingScanMutation,
} from '../api/next-api';
import { sessionRows } from './session-rows';
import { nextAmount } from './swipe';
import { useScanDefaults } from './use-scan-defaults';

// The pending scan list refreshes every three seconds while the screen is
// open, as ADR 0014 decided.
const POLL_MS = 3000;

type ScanLists = DefaultsLists & ScanRowLists;

export interface PurchaseSession {
  addCode: (code: string) => Promise<null | PendingScan>;
  changeAmount: (scan: PendingScan, delta: number) => void;
  hasFailed: boolean;
  lists: ScanLists;
  reject: (scan: PendingScan) => void;
  rows: readonly PendingScan[];
  scanDefaults: ScanDefaults;
}

// The five master data lists that name a row and the defaults.
function useScanLists(): ScanLists {
  return {
    locations: useListLocationsQuery(undefined).data?.items,
    productGroups: useListProductGroupsQuery(undefined).data?.items,
    products: useListProductsQuery(undefined).data?.items,
    quantityUnits: useListQuantityUnitsQuery(undefined).data?.items,
    stores: useListStoresQuery(undefined).data?.items,
  };
}

// The scan session of the Purchase screen: the rows that this screen created
// or merged, the master data lists that name a row, the defaults and the
// price for the next scan, the create call of a typed code, the update of
// plus and minus, and the delete of the swipe. The session is not stored. A
// new screen starts a new session. Every call refetches the list, so the row
// changes before the next poll. The create call returns the stored row, or
// null when the call failed, so the screen gives the feedback of the outcome.
export function usePurchaseSession(): PurchaseSession {
  const [sessionIds, setSessionIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [hasFailed, setHasFailed] = useState(false);
  const pendingScans = useListPendingScansQuery(undefined, {
    pollingInterval: POLL_MS,
  });
  const lists = useScanLists();
  const scanDefaults = useScanDefaults();
  const [createPendingScan] = useCreatePendingScanMutation();
  const [updatePendingScan] = useUpdatePendingScanMutation();
  const [deletePendingScan] = useDeletePendingScanMutation();

  async function send(call: Promise<PendingScan>): Promise<null | PendingScan> {
    let scan: PendingScan;
    try {
      scan = await call;
    } catch {
      setHasFailed(true);
      return null;
    }
    setSessionIds((ids) => new Set([...ids, scan.id]));
    setHasFailed(false);
    await pendingScans.refetch();
    return scan;
  }

  return {
    addCode: (code) => {
      const fields = scanDefaults.takeCreateFields();
      return send(
        createPendingScan({
          createPendingScan: { ...fields, bookingType: 'purchase', code },
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
    scanDefaults,
  };
}
