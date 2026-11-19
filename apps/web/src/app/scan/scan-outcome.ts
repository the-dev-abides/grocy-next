import type { PendingScan } from '../api/next-api';
import type { FeedbackKind } from './feedback';
import type { PendingScanRowLists } from './pending-scan-row';
import type { ScanBanner } from './use-scan-feedback';

import { nameOf } from './scan-text';

// The outcome of one create call, from the stored row and from what the session
// knows. A merged Purchase repeat scan keeps its create time and gets a new
// scan time. An Inventory repeat scan answers the open row with no change. Thus
// the row is a repeat when the session already holds it. A new row with a
// product is a known product, else an unknown code.
export function outcomeOf(
  scan: PendingScan,
  wasInSession = false,
): FeedbackKind {
  if (wasInSession || scan.scannedAt !== scan.createdAt) {
    return 'repeat';
  }
  return scan.productId === null ? 'unknown' : 'known';
}

function titleOf(scan: PendingScan, lists: PendingScanRowLists, code: string) {
  return scan.productId === null
    ? (scan.lookupResult?.name ?? code)
    : nameOf(lists.products, scan.productId, code);
}

// The detail line of a Purchase row and a Consume row: the amount in its
// unit.
function amountText(scan: PendingScan, lists: PendingScanRowLists): string {
  const unit = nameOf(lists.quantityUnits, scan.quantityUnitId, '');
  return `${String(scan.amount ?? 1)} ${unit}`.trim();
}

// A Consume banner and a Transfer banner start the detail line with the
// booking type. The other scan screens make one booking type only, so their
// banner does not name it.
function withBookingType(scan: PendingScan, detail: string): string {
  if (scan.bookingType === 'consume') {
    return `Consume · ${detail}`;
  }
  return scan.bookingType === 'transfer' ? `Transfer · ${detail}` : detail;
}

// What the session knew of the row before the create call: whether it held
// the row, and the amount of the row in the last list. The amount is null
// when the last list did not have the row.
export interface PreviousRow {
  previousAmount: null | number;
  wasInSession: boolean;
}

const NO_PREVIOUS_ROW: PreviousRow = {
  previousAmount: null,
  wasInSession: false,
};

// The pill of a repeat: the amount that the merge added. A stock entry
// Grocycode adds the amount of the stock entry, so the pill is not always
// plus one. The rounding removes the floating point noise of a fraction. With
// no old amount, the added amount is not known, so there is no pill.
function pillOf(scan: PendingScan, previousAmount: null | number) {
  if (previousAmount === null) {
    return {};
  }
  const added = Number(((scan.amount ?? 0) - previousAmount).toFixed(6));
  return { pill: `+${String(added)}` };
}

// The banner of one create call: the words for an unknown code, else the name
// of the product. A Purchase row and a Consume row show the amount, and a
// repeat adds the pill with the added amount. An Inventory row has no amount
// on the scan screen, so it shows the code. A repeat says that the product is
// in the list.
export function bannerOf(
  scan: PendingScan,
  lists: PendingScanRowLists,
  previous: PreviousRow = NO_PREVIOUS_ROW,
): ScanBanner {
  const kind = outcomeOf(scan, previous.wasInSession);
  const code = scan.code ?? '';
  if (kind === 'unknown') {
    return {
      detail: withBookingType(scan, code),
      kind,
      title: 'Unknown barcode',
    };
  }
  const title = titleOf(scan, lists, code);
  if (scan.bookingType === 'inventory') {
    const detail = kind === 'repeat' ? 'Already in the list' : code;
    return { detail, kind, title };
  }
  const detail = withBookingType(scan, amountText(scan, lists));
  return kind === 'repeat'
    ? { detail, kind, ...pillOf(scan, previous.previousAmount), title }
    : { detail, kind, title };
}
