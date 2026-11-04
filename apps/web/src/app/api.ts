import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// One product as the Next API returns it. No generator writes this type. The
// generated API slice from the OpenAPI document replaces it later.
export interface Product {
  id: number;
  name: string;
  description: string | null;
}

// The one API slice of the web app. It talks to the Next API under `/api/v2`
// on the same origin.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v2' }),
  endpoints: (builder) => ({
    // The product list. A full list has no cut-off.
    listProducts: builder.query<Product[], void>({
      query: () => 'products',
    }),
  }),
});

export const { useListProductsQuery } = api;
