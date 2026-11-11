import type { PendingScan } from '../api/next-api';
import type { FeedbackKind } from './feedback';
import type { ScanRowLists } from './scan-row';
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

function titleOf(scan: PendingScan, lists: ScanRowLists, code: string) {
  return scan.productId === null
    ? (scan.lookupResult?.name ?? code)
    : nameOf(lists.products, scan.productId, code);
}

// The detail line of a Purchase row: the amount in its unit.
function amountText(scan: PendingScan, lists: ScanRowLists): string {
  const unit = nameOf(lists.quantityUnits, scan.quantityUnitId, '');
  return `${String(scan.amount ?? 1)} ${unit}`.trim();
}

// The banner of one create call: the words for an unknown code, else the name
// of the product. A Purchase row shows its amount, and a repeat adds the plus
// one pill. An Inventory row has no amount on the scan screen, so it shows the
// code. A repeat says that the product is in the list.
export function bannerOf(
  scan: PendingScan,
  lists: ScanRowLists,
  wasInSession = false,
): ScanBanner {
  const kind = outcomeOf(scan, wasInSession);
  const code = scan.code ?? '';
  if (kind === 'unknown') {
    return { detail: code, kind, title: 'Unknown barcode' };
  }
  const title = titleOf(scan, lists, code);
  if (scan.bookingType === 'inventory') {
    const detail = kind === 'repeat' ? 'Already in the list' : code;
    return { detail, kind, title };
  }
  const detail = amountText(scan, lists);
  return kind === 'repeat'
    ? { detail, kind, pill: '+1', title }
    : { detail, kind, title };
}
