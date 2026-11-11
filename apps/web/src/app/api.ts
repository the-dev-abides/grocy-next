import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// One product as the Next API returns it. No generator writes this type. The
// generated API slice from the OpenAPI document replaces it later.
export interface Product {
  id: number;
  name: string;
  description: null | string;
}

// The one API slice of the web app. It talks to the Next API under `/api/v2`
// on the same origin.
export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v2' }),
  endpoints: (builder) => {
    return {
      // The product list. A full list has no cut-off. The query takes no
      // argument. The list is an `items` envelope, as ADR 0014 decided.
      listProducts: builder.query<{ items: Product[] }, undefined>({
        query: () => 'products',
      }),
    };
  },
  reducerPath: 'api',
});

export const { useListProductsQuery } = api;
