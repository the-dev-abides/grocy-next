import { z } from 'zod';

import type { ProductDetails } from '../product-details.ts';

// Grocy returns a number as a JSON string in many places. The schema
// coerces every number and keeps null.
const grocyNumber = z.coerce.number();
const grocyNullableNumber = grocyNumber.nullable();

const grocyProductBarcodeSchema = z.looseObject({
  amount: grocyNullableNumber,
  barcode: z.string(),
  id: grocyNumber,
  last_price: grocyNullableNumber,
  note: z.string().nullable(),
  qu_id: grocyNullableNumber,
  shopping_location_id: grocyNullableNumber,
});

// The `ProductDetailsResponse` of Grocy 4.7.1, with the fields that the
// product read and the code resolution read. The stock amount is the own
// stock in the stock unit, and a parent product excludes its sub-products.
// `has_childs` is true for a parent product. The tare weight applies only
// when the tare weight handling flag is 1. The factor from the purchase unit
// to the stock unit is 1 when the product has no conversion between them.
// The response holds every product barcode of the product, not only the one
// that matched. The schema is loose, because Grocy returns many more fields
// than the client reads.
export const grocyProductDetailsSchema = z.looseObject({
  has_childs: z.boolean(),
  product: z.looseObject({
    active: grocyNumber,
    default_best_before_days: grocyNumber,
    description: z.string().nullable(),
    enable_tare_weight_handling: grocyNumber,
    id: grocyNumber,
    location_id: grocyNullableNumber,
    min_stock_amount: grocyNumber,
    name: z.string(),
    picture_file_name: z.string().nullable(),
    product_group_id: grocyNullableNumber,
    qu_id_purchase: grocyNumber,
    qu_id_stock: grocyNumber,
    tare_weight: grocyNumber,
  }),
  product_barcodes: z.array(grocyProductBarcodeSchema),
  qu_conversion_factor_purchase_to_stock: grocyNumber,
  stock_amount: grocyNumber,
});

type GrocyProductDetails = z.infer<typeof grocyProductDetailsSchema>;

export function toProductDetails(details: GrocyProductDetails): ProductDetails {
  return {
    barcodes: details.product_barcodes.map((row) => {
      return {
        amount: row.amount,
        barcode: row.barcode,
        id: row.id,
        note: row.note,
        price: row.last_price,
        quantityUnitId: row.qu_id,
        storeId: row.shopping_location_id,
      };
    }),
    defaultDueDays: details.product.default_best_before_days,
    description: details.product.description,
    hasPicture: details.product.picture_file_name !== null,
    id: details.product.id,
    isActive: details.product.active !== 0,
    isParent: details.has_childs,
    locationId: details.product.location_id,
    minStockAmount: details.product.min_stock_amount,
    name: details.product.name,
    productGroupId: details.product.product_group_id,
    purchaseToStockFactor: details.qu_conversion_factor_purchase_to_stock,
    purchaseUnitId: details.product.qu_id_purchase,
    stockAmount: details.stock_amount,
    stockUnitId: details.product.qu_id_stock,
    tareWeight:
      details.product.enable_tare_weight_handling === 0
        ? null
        : details.product.tare_weight,
  };
}
