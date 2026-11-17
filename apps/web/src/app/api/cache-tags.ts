import { nextApi } from './next-api';

// The cache tags of the API slice. The code generator writes no tags, so this file adds them to the generated endpoints.
//
// The pending scan list carries the tag `PendingScan`. Each call that changes a
// pending scan marks the tag as old, and RTK Query then loads the list again.
// An accept changes the list too: it removes the row or stores its error. When
// a poll of the list is on the way, RTK Query waits for its answer and then
// loads the list again. A plain `refetch` in that moment does nothing, so the
// old answer of the poll would show the change only at the next poll.
export const cachedApi = nextApi.enhanceEndpoints({
  addTagTypes: ['PendingScan'],
  endpoints: {
    createBooking: { invalidatesTags: ['PendingScan'] },
    createPendingScan: { invalidatesTags: ['PendingScan'] },
    deletePendingScan: { invalidatesTags: ['PendingScan'] },
    listPendingScans: { providesTags: ['PendingScan'] },
    updatePendingScan: { invalidatesTags: ['PendingScan'] },
  },
});
