import type { EntityManager } from 'typeorm';

import { In } from 'typeorm';

import type { BookingType } from './pending-scan.ts';
import type { ProductMatch } from './resolve-code.ts';
import type {
  PendingScanToStore,
  StoredPendingScan,
} from './storage/stored-pending-scan.ts';

import { codeForms } from './code-forms.ts';
import { DEFAULT_PURCHASE_AMOUNT } from './pending-scan-to-store.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';

// Whether a create applies the repeat rule of ADR 0010. A create from a scan
// screen merges. A create from the MCP server never merges. The caller
// gives the fact through this parameter, not through a body field.
export type RepeatRule = 'merge' | 'no merge';

// This function finds the open pending scan that a new scan adds to: the
// most recent row with the same booking type and a code that is one code
// with the new code. A row with no code is never a merge target, and a new
// scan with no code has no target.
export function findRepeatTarget(
  manager: EntityManager,
  row: PendingScanToStore,
): Promise<null | StoredPendingScan> {
  return row.code === null
    ? Promise.resolve(null)
    : queryRepeatTarget(manager, row.bookingType, row.code);
}

function queryRepeatTarget(
  manager: EntityManager,
  bookingType: BookingType,
  code: string,
): Promise<null | StoredPendingScan> {
  return manager
    .createQueryBuilder(storedPendingScanSchema, 'pendingScan')
    .where({ bookingType, code: In(codeForms(code)) })
    .orderBy('pendingScan.scannedAt', 'DESC')
    .addOrderBy('pendingScan.id', 'DESC')
    .getOne();
}

// This function adds a repeat scan to its target row. Purchase: add the
// product barcode amount when the product barcode has one, else one, and
// set the scan time to now.
export function mergedPendingScan(
  target: StoredPendingScan,
  match: null | ProductMatch,
  now: string,
): StoredPendingScan {
  return {
    ...target,
    amount:
      (target.amount ?? 0) +
      (match?.barcode?.amount ?? DEFAULT_PURCHASE_AMOUNT),
    scannedAt: now,
    updatedAt: now,
  };
}
