import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// The base of the API slice. It talks to the Next API on the same origin
// and has no endpoint of its own. The paths of the OpenAPI document carry
// the `/api/v2` prefix, so the base URL is the origin root. The RTK Query
// OpenAPI code generator injects the endpoints into it from the OpenAPI
// document of the API and writes `next-api.ts` next to this file, as ADR
// 0008 decided. The NX target `web:generate-api` runs the generator. Do not
// edit the generated file by hand.
export const baseApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: () => ({}),
  reducerPath: 'api',
});
