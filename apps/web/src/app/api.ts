import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// One product as the Next API returns it. The type is written by hand until
// the API slice is generated from the OpenAPI document.
export interface Product {
  id: number;
  name: string;
  description: string | null;
}

// The one API slice of the web app. It talks to the Next API under `/api/v2`
// on the same origin. The base URL is absolute, because the `Request`
// constructor in Node rejects a relative URL in the web test.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: `${window.location.origin}/api/v2` }),
  endpoints: (build) => ({
    // The product list. A full list has no cut-off.
    listProducts: build.query<Product[], void>({
      query: () => 'products',
    }),
  }),
});

export const { useListProductsQuery } = api;
