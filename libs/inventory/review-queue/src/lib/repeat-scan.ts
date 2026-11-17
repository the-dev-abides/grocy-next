import type { EntityManager, FindOptionsWhere } from 'typeorm';

import { In, IsNull, Not } from 'typeorm';

import type { CreatePendingScan } from './pending-scan.ts';
import type {
  PendingScanToStore,
  StoredPendingScan,
} from './storage/stored-pending-scan.ts';

import { codeForms } from './code-forms.ts';
import { bodyPrice } from './pending-scan-to-store.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';

// Whether a create applies the repeat rule of ADR 0010. A create from a scan
// screen merges. A create from the MCP server never merges. The caller
// gives the fact through this parameter, not through a body field.
export type RepeatRule = 'merge' | 'no merge';

// The fields that a Consume or a Transfer target row must share with the
// new row: the "from" location, the "to" location, and the stock entry. A
// spoiled row is never a target.
function consumeTransferMatch(
  row: PendingScanToStore,
): FindOptionsWhere<StoredPendingScan> {
  return {
    locationId: row.locationId ?? IsNull(),
    spoiled: false,
    stockEntryId: row.stockEntryId ?? IsNull(),
    toLocationId: row.toLocationId ?? IsNull(),
  };
}

// This function finds the open pending scan that a new scan repeats. It is the
// most recent row with the same booking type that holds the same thing. A
// Purchase row holds the same thing when its code is one code with the new
// code. An Inventory row holds the same thing when it has the same product, or
// the same code when the scan has no product. Thus one product has at most one
// open Inventory pending scan. A Consume row and a Transfer row hold the same
// thing when they also have the same locations and the same stock entry, and
// are not spoiled. A spoiled scan has no target. A row with no code is never
// a merge target, and a new scan with no code has no target.
export function findRepeatTarget(
  manager: EntityManager,
  row: PendingScanToStore,
): Promise<null | StoredPendingScan> {
  if (row.code === null || row.spoiled) {
    return Promise.resolve(null);
  }
  const sameCode = { code: In(codeForms(row.code)) };
  const sameProduct = { code: Not(IsNull()), productId: row.productId };
  const isProductMatch =
    row.bookingType === 'inventory' && row.productId !== null;
  const isConsumeOrTransfer =
    row.bookingType === 'consume' || row.bookingType === 'transfer';
  return queryRepeatTarget(manager, {
    bookingType: row.bookingType,
    ...(isProductMatch ? sameProduct : sameCode),
    ...(isConsumeOrTransfer && consumeTransferMatch(row)),
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
// store, or null when the repeat changes nothing. Purchase, Consume, and
// Transfer: add the amount that a new row of the scan gets, and set the scan
// time to now. The amount rule of the create of each booking type gives that
// amount. When the body of the repeat scan has a price, the row takes that
// price and its price type. Else the row keeps its price. For Inventory,
// change nothing. The Inventory scan screen makes the list of the products,
// and the review queue sets the amounts.
export function mergedPendingScan(
  target: StoredPendingScan,
  row: PendingScanToStore,
  body: CreatePendingScan,
): null | StoredPendingScan {
  if (target.bookingType === 'inventory') {
    return null;
  }
  return {
    ...target,
    ...bodyPrice(body),
    amount: (target.amount ?? 0) + (row.amount ?? 0),
    scannedAt: row.scannedAt,
    updatedAt: row.scannedAt,
  };
}
