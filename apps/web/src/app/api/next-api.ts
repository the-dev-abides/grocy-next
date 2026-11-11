import { baseApi as api } from './base-api';
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    createProduct: build.mutation<CreateProductResponse, CreateProductRequest>({
      query: (queryArg) => ({
        url: `/api/v2/products`,
        method: 'POST',
        body: queryArg.createProduct,
      }),
    }),
    listProducts: build.query<ListProductsResponse, ListProductsRequest>({
      query: () => ({ url: `/api/v2/products` }),
    }),
    getProduct: build.query<GetProductResponse, GetProductRequest>({
      query: (queryArg) => ({ url: `/api/v2/products/${queryArg.id}` }),
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
    listQuantityUnitConversions: build.query<
      ListQuantityUnitConversionsResponse,
      ListQuantityUnitConversionsRequest
    >({
      query: () => ({ url: `/api/v2/quantity-unit-conversions` }),
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
    createBooking: build.mutation<CreateBookingResponse, CreateBookingRequest>({
      query: (queryArg) => ({
        url: `/api/v2/bookings`,
        method: 'POST',
        body: queryArg.createBooking,
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as nextApi };
export type CreateProductResponse =
  /** status 201 The product as Grocy stores it. */ Product;
export type CreateProductRequest = {
  createProduct: CreateProduct;
};
export type ListProductsResponse = /** status 200 Every product. */ ProductList;
export type ListProductsRequest = void;
export type GetProductResponse = /** status 200 The product. */ Product;
export type GetProductRequest = {
  /** The id of the product. */
  id: number;
};
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
export type ListQuantityUnitConversionsResponse =
  /** status 200 Every household quantity unit conversion. */ QuantityUnitConversionList;
export type ListQuantityUnitConversionsRequest = void;
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
export type CreateBookingResponse =
  /** status 200 The booking with the values that Grocy stored. */ Booking;
export type CreateBookingRequest = {
  createBooking: CreateBooking;
};
export type QuantityUnitConversion = {
  /** One from unit is this many to units. An amount in the from unit times the factor is the amount in the to unit. */
  factor: number;
  /** The id of the from quantity unit. */
  fromQuantityUnitId: number;
  /** The id of the to quantity unit. */
  toQuantityUnitId: number;
};
export type StockEntry = {
  /** The amount in the stock unit. */
  amount: number;
  /** The due date of the stock entry. */
  dueDate: string | null;
  /** The id of the stock entry. */
  id: number;
  /** The id of the location. */
  locationId: number | null;
  /** Whether the stock entry is open. */
  open: boolean;
  /** The purchase date. */
  purchasedDate: string | null;
};
export type Product = {
  /** The description of the product, or null when it has none. */
  description: string | null;
  /** The id of the product. */
  id: number;
  /** The name of the product. */
  name: string;
  /** The resolved conversions of the product. */
  conversions: QuantityUnitConversion[];
  /** The default due days of a new stock entry. 0 means no due date, and -1 means never overdue. */
  defaultDueDays: number;
  /** Whether the product has a picture. */
  hasPicture: boolean;
  /** Whether the product is a parent product. The stock amount of a parent product is its own stock only. */
  isParent: boolean;
  /** The id of the default location. */
  locationId: number | null;
  /** The minimum stock amount in the stock unit. */
  minStockAmount: number;
  /** The id of the product group, or null. */
  productGroupId: number | null;
  /** The factor from the purchase unit to the stock unit. One purchase unit is this many stock units. */
  purchaseToStockFactor: number;
  /** The id of the purchase quantity unit. */
  purchaseUnitId: number;
  /** The own stock of the product in the stock unit. */
  stockAmount: number;
  /** The stock entries of the product in the Grocy consume order: the default consume location first, then open entries, then the earliest due date, then the earliest purchase date. */
  stockEntries: StockEntry[];
  /** The id of the stock quantity unit. */
  stockUnitId: number;
  /** The tare weight in the stock unit, or null when tare weight handling is off. The count of a tare weight product is a gross weight. */
  tareWeight: number | null;
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
export type CreateProduct = {
  /** The default due days of a new stock entry. 0 means no due date, and -1 means never overdue. */
  defaultDueDays?: number;
  /** The description of the product. */
  description?: string;
  /** The id of the default location. */
  locationId: number;
  /** The minimum stock amount in the stock unit. */
  minStockAmount?: number;
  /** The name of the product. */
  name: string;
  /** The id of the product group. */
  productGroupId?: number;
  /** The factor from the purchase unit to the stock unit. One purchase unit is this many stock units. */
  purchaseToStockFactor?: number;
  /** The id of the purchase quantity unit. */
  purchaseUnitId: number;
  /** The id of the stock quantity unit. */
  stockUnitId: number;
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
export type QuantityUnitConversionList = {
  /** Every household quantity unit conversion. */
  items: QuantityUnitConversion[];
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
export type StockLogRow = {
  /** The amount in the stock unit. */
  amount: number;
  /** The due date of the stock entry. */
  dueDate: string | null;
  /** The id of the booking in Grocy. */
  id: number;
  /** The id of the location. */
  locationId: number | null;
  /** The note. */
  note: string | null;
  /** The price per stock unit. */
  price: number | null;
  /** The purchase date. */
  purchasedDate: string | null;
  /** The id of the stock entry, when Grocy wrote it. */
  stockEntryId: number | null;
  /** The id of the store. */
  storeId: number | null;
  /** The Grocy transaction type. */
  transactionType: string;
};
export type Booking = {
  /** The stock log rows of the transaction. */
  bookings: StockLogRow[];
  /** The booking that the accept made. */
  bookingType: 'inventory' | 'purchase';
  /** The id of the accepted pending scan. */
  pendingScanId: number;
  /** The id of the product. */
  productId: number;
  /** The id of the Grocy transaction, or null on no change. */
  transactionId: string | null;
};
export type CreateBooking = {
  /** The id of the pending scan to accept. */
  pendingScanId: number;
};
export const {
  useCreateProductMutation,
  useListProductsQuery,
  useGetProductQuery,
  useListLocationsQuery,
  useListStoresQuery,
  useListProductGroupsQuery,
  useListQuantityUnitsQuery,
  useListQuantityUnitConversionsQuery,
  useCreatePendingScanMutation,
  useListPendingScansQuery,
  useGetPendingScanQuery,
  useUpdatePendingScanMutation,
  useDeletePendingScanMutation,
  useCreateBookingMutation,
} = injectedRtkApi;
