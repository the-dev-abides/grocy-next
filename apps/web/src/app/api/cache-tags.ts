import type { Booking, Product } from './next-api';

import { nextApi } from './next-api';

type StockTag =
  { id: number; type: 'Product' } | { id: number; type: 'StockEntry' };

// The tags of one product read: the product, and each stock entry that the
// read shows. The stock entries of the sub-products of a parent product are
// in the read too, so a booking of a sub-product marks the read of the
// parent as old.
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

// The cache tags of the API slice. The code generator writes no tags, so this file adds them to the generated endpoints.
//
// The pending scan list carries the tag `PendingScan`. Each call that changes a
// pending scan marks the tag as old, and RTK Query then loads the list again.
// An accept changes the list too: it removes the row or stores its error. When
// a poll of the list is on the way, RTK Query waits for its answer and then
// loads the list again. A plain `refetch` in that moment does nothing, so the
// old answer of the poll would show the change only at the next poll.
//
// An accept also changes the stock. It marks the reads of the products that
// it booked as old, so the stock entry lines and the Inventory preview of the
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
    listPendingScans: { providesTags: ['PendingScan'] },
    updatePendingScan: { invalidatesTags: ['PendingScan'] },
  },
});
