import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// The one API slice of the web app. It talks to the Next API under `/api/v2`
// on the same origin. The product list adds the first endpoint.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v2' }),
  endpoints: () => ({}),
});
