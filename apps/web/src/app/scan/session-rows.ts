import type { PendingScan } from '../api/next-api';

// The session list of a scan screen is the pending scan list with a filter. It
// keeps the rows that this screen created or merged since it opened. It keeps
// the rows of the booking type of the screen only. The most recent row is at
// the top. The screen collects the ids from its own create responses, so no
// clock of the browser takes part. Two rows with one scan time keep the later
// row first.
export function sessionRows(
  items: readonly PendingScan[],
  sessionIds: ReadonlySet<number>,
  bookingType: PendingScan['bookingType'],
): PendingScan[] {
  return items
    .filter(
      (item) => sessionIds.has(item.id) && item.bookingType === bookingType,
    )
    .toSorted((first, second) => {
      const byTime = second.scannedAt.localeCompare(first.scannedAt);
      return byTime === 0 ? second.id - first.id : byTime;
    });
}
