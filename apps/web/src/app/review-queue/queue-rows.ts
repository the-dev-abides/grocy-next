import type { PendingScan } from '../api/next-api';

// The review queue holds every pending scan of both booking types, most
// recent at the top. Two rows with one scan time keep the later row first.
export function queueRows(items: readonly PendingScan[]): PendingScan[] {
  return items.toSorted((first, second) => {
    const byTime = second.scannedAt.localeCompare(first.scannedAt);
    return byTime === 0 ? second.id - first.id : byTime;
  });
}
