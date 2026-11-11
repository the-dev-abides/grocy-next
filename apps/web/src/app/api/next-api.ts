import { baseApi as api } from './base-api';
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listProducts: build.query<ListProductsResponse, ListProductsRequest>({
      query: () => ({ url: `/api/v2/products` }),
    }),
    listLocations: build.query<ListLocationsResponse, ListLocationsRequest>({
      query: () => ({ url: `/api/v2/locations` }),
    }),
    listStores: build.query<ListStoresResponse, ListStoresRequest>({
      query: () => ({ url: `/api/v2/stores` }),
    }),
    listProductGroups: build.query<
      ListProductGroupsResponse,
      ListProductGroupsRequest
    >({
      query: () => ({ url: `/api/v2/product-groups` }),
    }),
    listQuantityUnits: build.query<
      ListQuantityUnitsResponse,
      ListQuantityUnitsRequest
    >({
      query: () => ({ url: `/api/v2/quantity-units` }),
    }),
    createPendingScan: build.mutation<
      CreatePendingScanResponse,
      CreatePendingScanRequest
    >({
      query: (queryArg) => ({
        url: `/api/v2/pending-scans`,
        method: 'POST',
        body: queryArg.createPendingScan,
      }),
    }),
    listPendingScans: build.query<
      ListPendingScansResponse,
      ListPendingScansRequest
    >({
      query: () => ({ url: `/api/v2/pending-scans` }),
    }),
    getPendingScan: build.query<GetPendingScanResponse, GetPendingScanRequest>({
      query: (queryArg) => ({ url: `/api/v2/pending-scans/${queryArg.id}` }),
    }),
    updatePendingScan: build.mutation<
      UpdatePendingScanResponse,
      UpdatePendingScanRequest
    >({
      query: (queryArg) => ({
        url: `/api/v2/pending-scans/${queryArg.id}`,
        method: 'PATCH',
        body: queryArg.updatePendingScan,
      }),
    }),
    deletePendingScan: build.mutation<
      DeletePendingScanResponse,
      DeletePendingScanRequest
    >({
      query: (queryArg) => ({
        url: `/api/v2/pending-scans/${queryArg.id}`,
        method: 'DELETE',
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as nextApi };
export type ListProductsResponse = /** status 200 Every product. */ ProductList;
export type ListProductsRequest = void;
export type ListLocationsResponse =
  /** status 200 Every active location. */ LocationList;
export type ListLocationsRequest = void;
export type ListStoresResponse =
  /** status 200 Every active store. */ StoreList;
export type ListStoresRequest = void;
export type ListProductGroupsResponse =
  /** status 200 Every active product group. */ ProductGroupList;
export type ListProductGroupsRequest = void;
export type ListQuantityUnitsResponse =
  /** status 200 Every active quantity unit. */ QuantityUnitList;
export type ListQuantityUnitsRequest = void;
export type CreatePendingScanResponse =
  | /** status 200 The open pending scan that the repeat scan added to. */ PendingScan
  | /** status 201 The stored pending scan. */ PendingScan;
export type CreatePendingScanRequest = {
  createPendingScan: CreatePendingScan;
};
export type ListPendingScansResponse =
  /** status 200 Every pending scan, most recent first. */ PendingScanList;
export type ListPendingScansRequest = void;
export type GetPendingScanResponse =
  /** status 200 The pending scan. */ PendingScan;
export type GetPendingScanRequest = {
  /** The id of the pending scan. */
  id: number;
};
export type UpdatePendingScanResponse =
  /** status 200 The pending scan after the update. */ PendingScan;
export type UpdatePendingScanRequest = {
  /** The id of the pending scan. */
  id: number;
  updatePendingScan: UpdatePendingScan;
};
export type DeletePendingScanResponse =
  /** status 200 The pending scan as it was before the delete. */ PendingScan;
export type DeletePendingScanRequest = {
  /** The id of the pending scan. */
  id: number;
};
export type ProductListItem = {
  /** The description of the product, or null when it has none. */
  description: string | null;
  /** The id of the product. */
  id: number;
  /** The name of the product. */
  name: string;
};
export type ProductList = {
  /** Every product. */
  items: ProductListItem[];
};
export type FieldError = {
  /** What is wrong with the field. */
  message: string;
  /** The dotted path of the field. */
  path: string;
};
export type GrocyRefusal = {
  /** The error message that Grocy returned. */
  message: string;
  /** The HTTP status that Grocy returned. */
  status: number;
};
export type Problem = {
  /** What went wrong in this one request. */
  detail: string;
  /** The field errors of a validation problem. */
  errors?: FieldError[];
  /** The status and the message that Grocy returned. */
  grocy?: GrocyRefusal;
  /** The request path. */
  instance: string;
  /** The HTTP status of the response. */
  status: number;
  /** The fixed title of the type. */
  title: string;
  /** The stable URI of the cause. */
  type: string;
};
export type Location = {
  /** The id of the location. */
  id: number;
  /** The name of the location. */
  name: string;
};
export type LocationList = {
  /** Every active location. */
  items: Location[];
};
export type Store = {
  /** The id of the store. */
  id: number;
  /** The name of the store. */
  name: string;
};
export type StoreList = {
  /** Every active store. */
  items: Store[];
};
export type ProductGroup = {
  /** The id of the product group. */
  id: number;
  /** The name of the product group. */
  name: string;
};
export type ProductGroupList = {
  /** Every active product group. */
  items: ProductGroup[];
};
export type QuantityUnit = {
  /** The id of the quantity unit. */
  id: number;
  /** The name of the quantity unit. */
  name: string;
};
export type QuantityUnitList = {
  /** Every active quantity unit. */
  items: QuantityUnit[];
};
export type LookupResult = {
  /** The brand. */
  brand: string | null;
  /** The URL of the front image. */
  imageUrl: string | null;
  /** The product name. */
  name: string;
  /** The net quantity in the net quantity unit. */
  netQuantity: number | null;
  /** The unit of the net quantity, g or ml. */
  netQuantityUnit: string | null;
  /** The quantity text as printed on the label. */
  quantityText: string | null;
  /** The name of the service that held the product. */
  service: string;
  /** The URL of the product page, for the attribution. */
  sourceUrl: string;
};
export type PendingScan = {
  /** The amount. Purchase: in the unit quantityUnitId, or the purchase unit of the product. Inventory: the new own stock in the stock unit. */
  amount: number | null;
  /** The booking that the accept makes. */
  bookingType: 'inventory' | 'purchase';
  /** The code as scanned or typed, or null for a row from the assistant. */
  code: string | null;
  /** The time of the create, in UTC. */
  createdAt: string;
  /** The due date, or null for the Grocy product default. */
  dueDate: string | null;
  /** The Grocy message of the last failed accept, or null. */
  error: string | null;
  /** The id of the pending scan. */
  id: number;
  /** The time of the last lookup attempt, in UTC, or null. */
  lastLookupAt: string | null;
  /** The id of the location. */
  locationId: number | null;
  /** The lookup result, or null. */
  lookupResult: LookupResult | null;
  /** The note. */
  note: string | null;
  /** The price as entered. */
  price: number | null;
  /** Whether the price is per unit or in total. */
  priceType: 'total' | 'unit';
  /** The id of the product barcode that an update added in Grocy, or null. */
  productBarcodeId: number | null;
  /** The id of the product group of a new product. */
  productGroupId: number | null;
  /** The id of the product, or null. */
  productId: number | null;
  /** The id of the quantity unit of the amount. Purchase only. */
  quantityUnitId: number | null;
  /** The time of the scan, in UTC. */
  scannedAt: string;
  /** The id of the store. */
  storeId: number | null;
  /** The time of the last change, in UTC. */
  updatedAt: string;
  /** The product name that the user typed on the scan screen. */
  writeInName: string | null;
};
export type CreatePendingScan = {
  /** The amount. */
  amount?: number;
  /** The booking that the accept makes. */
  bookingType: 'inventory' | 'purchase';
  /** The code as scanned or typed. */
  code?: string;
  /** The due date. */
  dueDate?: string;
  /** The id of the location. */
  locationId?: number;
  /** The note. */
  note?: string;
  /** The price as entered. */
  price?: number;
  /** Whether the price is per unit or in total. */
  priceType?: 'total' | 'unit';
  /** The id of the product group of a new product. */
  productGroupId?: number;
  /** The id of the product. */
  productId?: number;
  /** The id of the quantity unit of the amount. Purchase only. */
  quantityUnitId?: number;
  /** The id of the store. */
  storeId?: number;
  /** The product name that the user typed on the scan screen. */
  writeInName?: string;
};
export type PendingScanList = {
  /** Every pending scan, most recent first. */
  items: PendingScan[];
};
export type UpdatePendingScan = {
  /** The amount. */
  amount?: number | null;
  /** The booking that the accept makes. Set at create. */
  bookingType?: 'inventory' | 'purchase';
  /** The code as scanned or typed. */
  code?: string | null;
  /** The due date. */
  dueDate?: string | null;
  /** The id of the location. */
  locationId?: number | null;
  /** The note. */
  note?: string | null;
  /** The price as entered. */
  price?: number | null;
  /** Whether the price is per unit or in total. */
  priceType?: 'total' | 'unit';
  /** The id of the product group of a new product. */
  productGroupId?: number | null;
  /** The id of the product. */
  productId?: number | null;
  /** The id of the quantity unit of the amount. Purchase only. */
  quantityUnitId?: number | null;
  /** The id of the store. */
  storeId?: number | null;
  /** The product name that the user typed on the scan screen. */
  writeInName?: string | null;
};
export const {
  useListProductsQuery,
  useListLocationsQuery,
  useListStoresQuery,
  useListProductGroupsQuery,
  useListQuantityUnitsQuery,
  useCreatePendingScanMutation,
  useListPendingScansQuery,
  useGetPendingScanQuery,
  useUpdatePendingScanMutation,
  useDeletePendingScanMutation,
} = injectedRtkApi;
