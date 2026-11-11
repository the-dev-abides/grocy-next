import { configureStore, type Store } from '@reduxjs/toolkit';

import { nextApi } from './api/next-api';

// The store is typed as a plain Redux store. The declaration emit of the type
// check must name every type of an exported value. The API slice exports only
// the types that the screens import. No screen reads the state type of the
// store; the hooks of the API slice carry their own types.
export const store: Store = configureStore({
  // The API middleware manages the cache lifetimes of the API slice.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(nextApi.middleware),
  reducer: {
    [nextApi.reducerPath]: nextApi.reducer,
  },
});
