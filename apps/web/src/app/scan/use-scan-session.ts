import { useState } from 'react';

import type { PendingScan, UpdatePendingScan } from '../api/next-api';
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
import { POLL_MS } from '../api/poll-interval';
import { sessionRows } from './session-rows';
import { useScanDefaults } from './use-scan-defaults';

type ScanLists = DefaultsLists & ScanRowLists;

// The stored row of one create call, and whether the session already held
// it. An Inventory repeat scan answers the open row with no change, so the
// row itself does not show that it was a repeat.
interface AddedScan {
  scan: PendingScan;
  wasInSession: boolean;
}

export interface ScanSession {
  addCode: (code: string) => Promise<AddedScan | null>;
  hasFailed: boolean;
  lists: ScanLists;
  reject: (scan: PendingScan) => void;
  rows: readonly PendingScan[];
  scanDefaults: ScanDefaults;
  update: (scan: PendingScan, patch: UpdatePendingScan) => void;
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

// The scan session of a scan screen. It holds the rows of the booking type that
// this screen created or merged, and the master data lists that name a row. It
// holds the defaults and the price for the next scan. It gives the create call
// of a code, the update of a row, and the delete of the swipe. The session is
// not stored. A new screen starts a new session. Every call refetches the list,
// so the row changes before the next poll. The create call returns the stored
// row, or null when the call failed. Thus the screen gives the feedback of the
// outcome.
export function useScanSession(
  bookingType: PendingScan['bookingType'],
): ScanSession {
  const [sessionIds, setSessionIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [hasFailed, setHasFailed] = useState(false);
  const pendingScans = useListPendingScansQuery(undefined, {
    pollingInterval: POLL_MS,
  });
  const lists = useScanLists();
  const scanDefaults = useScanDefaults(bookingType);
  const [createPendingScan] = useCreatePendingScanMutation();
  const [updatePendingScan] = useUpdatePendingScanMutation();
  const [deletePendingScan] = useDeletePendingScanMutation();

  async function send(call: Promise<PendingScan>): Promise<AddedScan | null> {
    let scan: PendingScan;
    try {
      scan = await call;
    } catch {
      setHasFailed(true);
      return null;
    }
    const wasInSession = sessionIds.has(scan.id);
    setSessionIds((ids) => new Set([...ids, scan.id]));
    setHasFailed(false);
    await pendingScans.refetch();
    return { scan, wasInSession };
  }

  return {
    addCode: (code) => {
      const fields = scanDefaults.takeCreateFields();
      return send(
        createPendingScan({
          createPendingScan: { ...fields, bookingType, code },
        }).unwrap(),
      );
    },
    hasFailed,
    lists,
    reject: (scan) => {
      void send(deletePendingScan({ id: scan.id }).unwrap());
    },
    rows: sessionRows(pendingScans.data?.items ?? [], sessionIds, bookingType),
    scanDefaults,
    update: (scan, patch) => {
      void send(
        updatePendingScan({ id: scan.id, updatePendingScan: patch }).unwrap(),
      );
    },
  };
}
