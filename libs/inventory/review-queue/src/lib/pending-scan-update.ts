import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';

import type { UpdatePendingScan } from './pending-scan.ts';
import type { StoredPendingScan } from './storage/stored-pending-scan.ts';

// One field of a merge patch: an absent field keeps the current value, and
// a field set to null clears it. The default parameter applies to an absent
// field only, not to null.
function patched<T>(current: T, value: T | undefined = current): T {
  return value;
}

// The two booking types that a row can flip between, as the spec of
// milestone 3 decided.
const FLIP_TYPES: readonly string[] = ['consume', 'transfer'];

function isFlip(from: string, to: string): boolean {
  return FLIP_TYPES.includes(from) && FLIP_TYPES.includes(to);
}

// The booking type is set at create. An update can flip it between Consume
// and Transfer only. Any other change is the booking-type-fixed problem of
// ADR 0014.
function checkBookingType(row: StoredPendingScan, body: UpdatePendingScan) {
  if (
    body.bookingType !== undefined &&
    body.bookingType !== row.bookingType &&
    !isFlip(row.bookingType, body.bookingType)
  ) {
    throw new ProblemException(
      PROBLEM_TYPES.bookingTypeFixed,
      'The booking type of a pending scan is set at create.',
    );
  }
}

// A pending scan needs a code or a product, as ADR 0010 decided. An update
// that clears both is refused with the validation problem of the create.
function checkCodeOrProduct(row: StoredPendingScan) {
  if (row.code === null && row.productId === null) {
    throw new ProblemException(
      PROBLEM_TYPES.validation,
      'The body, the query, or the path fails the schema.',
      {
        errors: [
          {
            message: 'The pending scan needs a code or a productId.',
            path: 'code',
          },
        ],
      },
    );
  }
}

// This function applies the update body, a JSON merge patch, to a stored
// pending scan and returns the row to store. Any update clears the error,
// as ADR 0010 decided, and sets the time of the last change.
export function updatedPendingScan(
  row: StoredPendingScan,
  body: UpdatePendingScan,
  now: string,
): StoredPendingScan {
  checkBookingType(row, body);
  const updated: StoredPendingScan = {
    ...row,
    amount: patched(row.amount, body.amount),
    bookingType: patched(row.bookingType, body.bookingType),
    code: patched(row.code, body.code),
    dueDate: patched(row.dueDate, body.dueDate),
    error: null,
    locationId: patched(row.locationId, body.locationId),
    note: patched(row.note, body.note),
    price: patched(row.price, body.price),
    priceType: patched(row.priceType, body.priceType),
    productGroupId: patched(row.productGroupId, body.productGroupId),
    productId: patched(row.productId, body.productId),
    quantityUnitId: patched(row.quantityUnitId, body.quantityUnitId),
    spoiled: patched(row.spoiled, body.spoiled),
    stockEntryId: patched(row.stockEntryId, body.stockEntryId),
    storeId: patched(row.storeId, body.storeId),
    toLocationId: patched(row.toLocationId, body.toLocationId),
    updatedAt: now,
    writeInName: patched(row.writeInName, body.writeInName),
  };
  checkCodeOrProduct(updated);
  return updated;
}
