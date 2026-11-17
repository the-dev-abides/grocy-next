import { copyWithStructuralSharing } from '@reduxjs/toolkit/query';

import type { Booking, ListPendingScansResponse, Product } from './next-api';

import { nextApi } from './next-api';

type StockTag =
  { id: number; type: 'Product' } | { id: number; type: 'StockEntry' };

// The tags of one product read: the product, and each stock entry that the read
// shows. The read of a parent product also shows the stock entries of its
// sub-products. Thus a booking of a sub-product marks the read of the parent as
// old.
export function productTagsOf(product: Product): StockTag[] {
  return [
    { id: product.id, type: 'Product' },
    ...[...product.stockEntries, ...product.subProductStockEntries].map(
      (entry) => ({ id: entry.id, type: 'StockEntry' as const }),
    ),
  ];
}

// The tags that one booking marks as old: the booked product, and each stock
// entry that the booking changed. A Consume of a parent product books the
// stock entries of its sub-products, so the reads of the sub-products are
// marked as old too.
export function bookingTagsOf(booking: Booking): StockTag[] {
  const entryIds = booking.bookings
    .map((row) => row.stockEntryId)
    .filter((id) => id !== null);
  return [
    { id: booking.productId, type: 'Product' },
    ...[...new Set(entryIds)].map((id) => {
      return {
        id,
        type: 'StockEntry' as const,
      };
    }),
  ];
}

// The merge of a new pending scan list into the list in the cache. The list
// comes most recent first, so a new row at the top moves every other row one
// place down. The default structural sharing of RTK Query compares the rows
// place by place. It then gave every row a new object, and the review queue
// drew every row again. This merge compares each row with the cached row of
// the same id. A row that did not change keeps its object. When no row
// changed, the merge changes nothing, so the list keeps its object too.
export function mergePendingScans(
  cached: ListPendingScansResponse,
  response: ListPendingScansResponse,
): void {
  const cachedById = new Map(cached.items.map((row) => [row.id, row]));
  const items = response.items.map((row) => {
    const old = cachedById.get(row.id);
    return old !== undefined && copyWithStructuralSharing(old, row) === old
      ? old
      : row;
  });
  const isSame =
    items.length === cached.items.length &&
    items.every((row, index) => row === cached.items[index]);
  if (!isSame) {
    cached.items = items;
  }
}

// The cache tags of the API slice.
// The code generator writes no tags, so this file adds them to the endpoints.
//
// The pending scan list carries the tag `PendingScan`. Each call that changes a
// pending scan marks the tag as old. RTK Query then loads the list again. An
// accept changes the list too: it removes the row or stores its error. When a
// poll of the list is on the way, RTK Query waits for its answer and then loads
// the list again. A plain `refetch` in that moment does nothing. The old answer
// of the poll would then show the change only at the next poll.
//
// An accept also changes the stock. It marks the reads of the products that it
// booked as old. Thus the stock entry lines and the Inventory preview of the
// other rows use the new stock.
export const cachedApi = nextApi.enhanceEndpoints({
  addTagTypes: ['PendingScan', 'Product', 'StockEntry'],
  endpoints: {
    createBooking: {
      invalidatesTags: (booking) => {
        return [
          'PendingScan',
          ...(booking === undefined ? [] : bookingTagsOf(booking)),
        ];
      },
    },
    createPendingScan: { invalidatesTags: ['PendingScan'] },
    deletePendingScan: { invalidatesTags: ['PendingScan'] },
    getProduct: {
      providesTags: (product) =>
        product === undefined ? [] : productTagsOf(product),
    },
    listPendingScans: {
      merge: mergePendingScans,
      providesTags: ['PendingScan'],
    },
    updatePendingScan: { invalidatesTags: ['PendingScan'] },
  },
});
