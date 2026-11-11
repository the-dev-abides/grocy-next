import { configureStore } from '@reduxjs/toolkit';

import { api } from './api';

export const store = configureStore({
  // The API middleware manages the cache lifetimes of the API slice.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
  reducer: {
    [api.reducerPath]: api.reducer,
  },
});
