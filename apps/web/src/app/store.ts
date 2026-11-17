import { configureStore, type Store } from '@reduxjs/toolkit';

import { cachedApi } from './api/cache-tags';

// The store is typed as a plain Redux store. The declaration emit of the type
// check must name every type of an exported value. The API slice exports only
// the types that the screens import. No screen reads the state type of the
// store; the hooks of the API slice carry their own types. The store uses the
// API slice with its cache tags.
export const store: Store = configureStore({
  // The API middleware manages the cache lifetimes and the cache tags of the
  // API slice.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(cachedApi.middleware),
  reducer: {
    [cachedApi.reducerPath]: cachedApi.reducer,
  },
});
