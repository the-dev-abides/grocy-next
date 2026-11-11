import { baseApi as api } from './base-api';

// The interim API slice. It follows the names of the RTK Query OpenAPI code
// generator: the endpoint name is the operationId of `apps/api/openapi.json`,
// the hooks are `use<OperationId>Query` and `use<OperationId>Mutation`, and
// the request type of an operation with parameters is
// `<OperationId>Request`. The response type is the schema of the response.
// The generated file replaces this file with no change to the screens.
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => {
    return {
      createPendingScan: build.mutation<PendingScan, CreatePendingScanRequest>({
        query: (queryArgument) => {
          return {
            body: queryArgument.createPendingScan,
            method: 'POST',
            url: `/api/v2/pending-scans`,
          };
        },
      }),
      deletePendingScan: build.mutation<PendingScan, DeletePendingScanRequest>({
        query: (queryArgument) => {
          return {
            method: 'DELETE',
            url: `/api/v2/pending-scans/${String(queryArgument.id)}`,
          };
        },
      }),
      getPendingScan: build.query<PendingScan, GetPendingScanRequest>({
        query: ({ id }) => ({ url: `/api/v2/pending-scans/${String(id)}` }),
      }),
      listLocations: build.query<LocationList, undefined>({
        query: () => ({ url: `/api/v2/locations` }),
      }),
      listPendingScans: build.query<PendingScanList, undefined>({
        query: () => ({ url: `/api/v2/pending-scans` }),
      }),
      listProductGroups: build.query<ProductGroupList, undefined>({
        query: () => ({ url: `/api/v2/product-groups` }),
      }),
      listProducts: build.query<ProductList, undefined>({
        query: () => ({ url: `/api/v2/products` }),
      }),
      listQuantityUnits: build.query<QuantityUnitList, undefined>({
        query: () => ({ url: `/api/v2/quantity-units` }),
      }),
      listStores: build.query<StoreList, undefined>({
        query: () => ({ url: `/api/v2/stores` }),
      }),
      updatePendingScan: build.mutation<PendingScan, UpdatePendingScanRequest>({
        query: (queryArgument) => {
          return {
            body: queryArgument.updatePendingScan,
            method: 'PATCH',
            url: `/api/v2/pending-scans/${String(queryArgument.id)}`,
          };
        },
      }),
    };
  },
  overrideExisting: false,
});
export { injectedRtkApi as nextApi };
interface CreatePendingScanRequest {
  createPendingScan: CreatePendingScan;
}
interface GetPendingScanRequest {
  // The id of the pending scan.
  id: number;
}
interface UpdatePendingScanRequest {
  // The id of the pending scan.
  id: number;
  updatePendingScan: UpdatePendingScan;
}
interface DeletePendingScanRequest {
  // The id of the pending scan.
  id: number;
}
export interface ProductListItem {
  // The description of the product, or null when it has none.
  description: null | string;
  // The id of the product.
  id: number;
  // The name of the product.
  name: string;
}
interface ProductList {
  // Every product.
  items: ProductListItem[];
}
export interface Location {
  // The id of the location.
  id: number;
  // The name of the location.
  name: string;
}
interface LocationList {
  // Every active location.
  items: Location[];
}
interface Store {
  // The id of the store.
  id: number;
  // The name of the store.
  name: string;
}
interface StoreList {
  // Every active store.
  items: Store[];
}
interface ProductGroup {
  // The id of the product group.
  id: number;
  // The name of the product group.
  name: string;
}
interface ProductGroupList {
  // Every active product group.
  items: ProductGroup[];
}
export interface QuantityUnit {
  // The id of the quantity unit.
  id: number;
  // The name of the quantity unit.
  name: string;
}
interface QuantityUnitList {
  // Every active quantity unit.
  items: QuantityUnit[];
}
export type BookingType = 'inventory' | 'purchase';
type PriceType = 'total' | 'unit';
interface LookupResult {
  // The brand.
  brand: null | string;
  // The URL of the front image.
  imageUrl: null | string;
  // The product name.
  name: string;
  // The net quantity in the net quantity unit.
  netQuantity: null | number;
  // The unit of the net quantity, g or ml.
  netQuantityUnit: null | string;
  // The quantity text as printed on the label.
  quantityText: null | string;
  // The name of the service that held the product.
  service: string;
  // The URL of the product page, for the attribution.
  sourceUrl: string;
}
export interface PendingScan {
  // The amount. Purchase: in the unit quantityUnitId, or the purchase unit of the product. Inventory: the new own stock in the stock unit.
  amount: null | number;
  // The booking that the accept makes.
  bookingType: BookingType;
  // The code as scanned or typed, or null for a row from the assistant.
  code: null | string;
  // The time of the create, in UTC.
  createdAt: string;
  // The due date, or null for the Grocy product default.
  dueDate: null | string;
  // The Grocy message of the last failed accept, or null.
  error: null | string;
  // The id of the pending scan.
  id: number;
  // The time of the last lookup attempt, in UTC, or null.
  lastLookupAt: null | string;
  // The id of the location.
  locationId: null | number;
  // The lookup result, or null.
  lookupResult: LookupResult | null;
  // The note.
  note: null | string;
  // The price as entered.
  price: null | number;
  // Whether the price is per unit or in total.
  priceType: PriceType;
  // The id of the product barcode that an update added in Grocy, or null.
  productBarcodeId: null | number;
  // The id of the product group of a new product.
  productGroupId: null | number;
  // The id of the product, or null.
  productId: null | number;
  // The id of the quantity unit of the amount. Purchase only.
  quantityUnitId: null | number;
  // The time of the scan, in UTC.
  scannedAt: string;
  // The id of the store.
  storeId: null | number;
  // The time of the last change, in UTC.
  updatedAt: string;
  // The product name that the user typed on the scan screen.
  writeInName: null | string;
}
interface PendingScanList {
  // Every pending scan, most recent first.
  items: PendingScan[];
}
interface CreatePendingScan {
  // The amount.
  amount?: number;
  // The booking that the accept makes.
  bookingType: BookingType;
  // The code as scanned or typed.
  code?: string;
  // The due date.
  dueDate?: string;
  // The id of the location.
  locationId?: number;
  // The note.
  note?: string;
  // The price as entered.
  price?: number;
  // Whether the price is per unit or in total.
  priceType?: PriceType;
  // The id of the product group of a new product.
  productGroupId?: number;
  // The id of the product.
  productId?: number;
  // The id of the quantity unit of the amount. Purchase only.
  quantityUnitId?: number;
  // The id of the store.
  storeId?: number;
  // The product name that the user typed on the scan screen.
  writeInName?: string;
}
export interface UpdatePendingScan {
  // The amount.
  amount?: null | number;
  // The booking that the accept makes. Set at create.
  bookingType?: BookingType;
  // The code as scanned or typed.
  code?: null | string;
  // The due date.
  dueDate?: null | string;
  // The id of the location.
  locationId?: null | number;
  // The note.
  note?: null | string;
  // The price as entered.
  price?: null | number;
  // Whether the price is per unit or in total.
  priceType?: PriceType;
  // The id of the product group of a new product.
  productGroupId?: null | number;
  // The id of the product.
  productId?: null | number;
  // The id of the quantity unit of the amount. Purchase only.
  quantityUnitId?: null | number;
  // The id of the store.
  storeId?: null | number;
  // The product name that the user typed on the scan screen.
  writeInName?: null | string;
}
export const {
  useCreatePendingScanMutation,
  useDeletePendingScanMutation,
  useListLocationsQuery,
  useListPendingScansQuery,
  useListProductsQuery,
  useListQuantityUnitsQuery,
  useUpdatePendingScanMutation,
} = injectedRtkApi;
