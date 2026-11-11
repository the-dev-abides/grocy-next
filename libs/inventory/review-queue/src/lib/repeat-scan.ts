import type { EntityManager, FindOptionsWhere } from 'typeorm';

import { In, IsNull, Not } from 'typeorm';

import type { CreatePendingScan } from './pending-scan.ts';
import type { ProductMatch } from './resolve-code.ts';
import type {
  PendingScanToStore,
  StoredPendingScan,
} from './storage/stored-pending-scan.ts';

import { codeForms } from './code-forms.ts';
import { bodyPrice, DEFAULT_PURCHASE_AMOUNT } from './pending-scan-to-store.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';

// Whether a create applies the repeat rule of ADR 0010. A create from a scan
// screen merges. A create from the MCP server never merges. The caller
// gives the fact through this parameter, not through a body field.
export type RepeatRule = 'merge' | 'no merge';

// This function finds the open pending scan that a new scan repeats. It is the
// most recent row with the same booking type that holds the same thing. A
// Purchase row holds the same thing when its code is one code with the new
// code. An Inventory row holds the same thing when it has the same product, or
// the same code when the scan has no product. Thus one product has at most one
// open Inventory pending scan. A row with no code is never a merge target, and
// a new scan with no code has no target.
export function findRepeatTarget(
  manager: EntityManager,
  row: PendingScanToStore,
): Promise<null | StoredPendingScan> {
  if (row.code === null) {
    return Promise.resolve(null);
  }
  const sameCode = { code: In(codeForms(row.code)) };
  const sameProduct = { code: Not(IsNull()), productId: row.productId };
  const isProductMatch =
    row.bookingType === 'inventory' && row.productId !== null;
  return queryRepeatTarget(manager, {
    bookingType: row.bookingType,
    ...(isProductMatch ? sameProduct : sameCode),
  });
}

function queryRepeatTarget(
  manager: EntityManager,
  where: FindOptionsWhere<StoredPendingScan>,
): Promise<null | StoredPendingScan> {
  return manager
    .createQueryBuilder(storedPendingScanSchema, 'pendingScan')
    .where(where)
    .orderBy('pendingScan.scannedAt', 'DESC')
    .addOrderBy('pendingScan.id', 'DESC')
    .getOne();
}

// This function adds a repeat scan to its target row and returns the row to
// store, or null when the repeat changes nothing. Purchase: add the product
// barcode amount when the product barcode has one, else one, and set the
// scan time to now. When the body of the repeat scan has a price, the row
// takes that price and its price type. Else the row keeps its price. For
// Inventory, change nothing. The Inventory scan screen makes the list of the
// products, and the review queue sets the amounts.
export function mergedPendingScan(
  target: StoredPendingScan,
  match: null | ProductMatch,
  body: CreatePendingScan,
  now: string,
): null | StoredPendingScan {
  if (target.bookingType === 'inventory') {
    return null;
  }
  return {
    ...target,
    ...bodyPrice(body),
    amount:
      (target.amount ?? 0) +
      (match?.barcode?.amount ?? DEFAULT_PURCHASE_AMOUNT),
    scannedAt: now,
    updatedAt: now,
  };
}
