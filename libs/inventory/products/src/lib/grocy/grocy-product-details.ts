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

// The `ProductDetailsResponse` of Grocy 4.7.1, with the fields that the code
// resolution reads. The response holds every product barcode of the
// product, not only the one that matched. The schema is loose, because
// Grocy returns many more fields than the client reads.
export const grocyProductDetailsSchema = z.looseObject({
  product: z.looseObject({
    active: grocyNumber,
    id: grocyNumber,
    name: z.string(),
  }),
  product_barcodes: z.array(grocyProductBarcodeSchema),
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
    id: details.product.id,
    isActive: details.product.active !== 0,
    name: details.product.name,
  };
}
