import type { PendingScan } from '../api/next-api';
import type { FeedbackKind } from './feedback';
import type { ScanRowLists } from './scan-row';
import type { ScanBanner } from './use-scan-feedback';

import { nameOf } from './scan-text';

// The outcome of one create call, from the stored row: a merged repeat scan
// keeps its create time and gets a new scan time, a new row has one time for
// both. A new row with a product is a known product, else an unknown code.
export function outcomeOf(scan: PendingScan): FeedbackKind {
  if (scan.scannedAt !== scan.createdAt) {
    return 'repeat';
  }
  return scan.productId === null ? 'unknown' : 'known';
}

// The banner of one create call: the product name and the amount for a
// known product and a repeat, the words for an unknown code.
export function bannerOf(scan: PendingScan, lists: ScanRowLists): ScanBanner {
  const kind = outcomeOf(scan);
  const code = scan.code ?? '';
  if (kind === 'unknown') {
    return { detail: code, kind, title: 'Unknown barcode' };
  }
  const amount = `${String(scan.amount ?? 1)} ${nameOf(lists.quantityUnits, scan.quantityUnitId, '')}`;
  return {
    detail: amount.trim(),
    kind,
    title:
      scan.productId === null
        ? (scan.lookupResult?.name ?? code)
        : nameOf(lists.products, scan.productId, code),
  };
}
