// PROTOTYPE. The scan session stand-in. It holds everything in memory.
import { useEffect, useState } from 'react';

import type { FeedbackKind } from '../feedback';
import type {
  BookingType,
  PrototypeProduct,
  PrototypeRow,
} from './prototype-data';

import { productOfCode } from './prototype-data';

// What the switch does after the user put it on Transfer.
// - `stay`: the switch stays.
// - `each-scan`: the switch goes back to Consume after one scan.
// - `timed`: the switch goes back to Consume after a time with no scan.
export type ReturnPolicy = 'each-scan' | 'stay' | 'timed';

export const TIMED_MS = 20_000;

export interface AddedRow {
  kind: FeedbackKind;
  row: PrototypeRow;
}

export interface PrototypeSession {
  addCode: (code: string) => AddedRow;
  // The count restarts the countdown of the timed policy.
  armCount: number;
  fromLocationId: null | number;
  lastRowId: null | number;
  mode: BookingType;
  reject: (id: number) => void;
  reset: () => void;
  rows: readonly PrototypeRow[];
  setFromLocationId: (id: null | number) => void;
  setMode: (mode: BookingType) => void;
  setSpoiledNext: (isSpoiled: boolean) => void;
  setToLocationId: (id: null | number) => void;
  spoiledNext: boolean;
  toLocationId: null | number;
  update: (id: number, patch: Partial<PrototypeRow>) => void;
}

// The fields that a scan copies into its row.
type ScanFields = Pick<
  PrototypeRow,
  'bookingType' | 'fromLocationId' | 'spoiled' | 'toLocationId'
>;

const ids = { next: 1 };

// The open row that a repeat scan merges into, by the repeat rule of
// ADR 0010: the same product with the same fields.
function sameRowOf(
  product: null | PrototypeProduct,
  fields: ScanFields,
  rows: readonly PrototypeRow[],
): PrototypeRow | undefined {
  if (product === null) {
    return undefined;
  }
  return rows.find((row) => {
    return (
      row.productId === product.id &&
      row.bookingType === fields.bookingType &&
      row.toLocationId === fields.toLocationId &&
      row.fromLocationId === fields.fromLocationId &&
      row.spoiled === fields.spoiled
    );
  });
}

function kindOf(
  product: null | PrototypeProduct,
  same: PrototypeRow | undefined,
): FeedbackKind {
  if (product === null) {
    return 'unknown';
  }
  return same === undefined ? 'known' : 'repeat';
}

// The row of one scan: a new row, or the open row with more amount.
function addedRowOf(
  code: string,
  fields: ScanFields,
  rows: readonly PrototypeRow[],
): AddedRow {
  const product = productOfCode(code);
  const same = sameRowOf(product, fields, rows);
  const scannedAt = Temporal.Now.instant().toString();
  const amount =
    product === null || fields.bookingType === 'transfer'
      ? 1
      : product.scanAmount;
  const row: PrototypeRow =
    same === undefined
      ? {
          ...fields,
          amount,
          code,
          id: ids.next++,
          productId: product?.id ?? null,
          scannedAt,
        }
      : { ...same, amount: same.amount + amount, scannedAt };
  return { kind: kindOf(product, same), row };
}

// The switch and its return to Consume.
function useMode(policy: ReturnPolicy) {
  const [mode, setMode] = useState<BookingType>('consume');
  const [armCount, setArmCount] = useState(0);

  useEffect(() => {
    if (policy !== 'timed' || mode !== 'transfer') {
      return;
    }
    const timer = setTimeout(() => {
      setMode('consume');
    }, TIMED_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [policy, mode, armCount]);

  return {
    afterScan: () => {
      if (policy === 'each-scan') {
        setMode('consume');
      }
      setArmCount((count) => count + 1);
    },
    armCount,
    mode,
    setMode: (next: BookingType) => {
      setMode(next);
      setArmCount((count) => count + 1);
    },
  };
}

function useRows() {
  const [rows, setRows] = useState<readonly PrototypeRow[]>([]);
  const [lastRowId, setLastRowId] = useState<null | number>(null);
  return {
    lastRowId,
    put: (row: PrototypeRow) => {
      setRows([row, ...rows.filter((other) => other.id !== row.id)]);
      setLastRowId(row.id);
    },
    reject: (id: number) => {
      setRows((current) => current.filter((row) => row.id !== id));
    },
    rows,
    update: (id: number, patch: Partial<PrototypeRow>) => {
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
    },
  };
}

export function usePrototypeSession(policy: ReturnPolicy): PrototypeSession {
  const switchState = useMode(policy);
  const list = useRows();
  const [fromLocationId, setFromLocationId] = useState<null | number>(null);
  const [toLocationId, setToLocationId] = useState<null | number>(null);
  const [spoiledNext, setSpoiledNext] = useState(false);
  const { armCount, mode, setMode } = switchState;
  const { lastRowId, reject, rows, update } = list;

  return {
    addCode: (code) => {
      const fields: ScanFields = {
        bookingType: mode,
        fromLocationId,
        spoiled: mode === 'consume' && spoiledNext,
        toLocationId: mode === 'transfer' ? toLocationId : null,
      };
      const added = addedRowOf(code, fields, rows);
      list.put(added.row);
      setSpoiledNext(false);
      switchState.afterScan();
      return added;
    },
    armCount,
    fromLocationId,
    lastRowId,
    mode,
    reject,
    reset: () => {
      setFromLocationId(null);
      setToLocationId(null);
    },
    rows,
    setFromLocationId,
    setMode,
    setSpoiledNext,
    setToLocationId,
    spoiledNext,
    toLocationId,
    update,
  };
}
