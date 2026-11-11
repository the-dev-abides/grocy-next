import type { CreateProduct } from '../product.ts';

// The Grocy product create body, as the Grocy API names the fields. Grocy
// requires the name, the location, and the two units. The other fields of
// the short product form go with it. A field that the form left unset is
// absent here, so Grocy applies its default: no description and no product
// group. Grocy sets every other column to its default, as the Grocy API
// research recorded.
export interface GrocyProductBody {
  default_best_before_days: number;
  description?: string;
  location_id: number;
  min_stock_amount: number;
  name: string;
  product_group_id?: number;
  qu_id_purchase: number;
  qu_id_stock: number;
}

export function toGrocyProductBody(product: CreateProduct): GrocyProductBody {
  const body: GrocyProductBody = {
    default_best_before_days: product.defaultDueDays,
    location_id: product.locationId,
    min_stock_amount: product.minStockAmount,
    name: product.name,
    qu_id_purchase: product.purchaseUnitId,
    qu_id_stock: product.stockUnitId,
  };
  if (product.description !== undefined) {
    body.description = product.description;
  }
  if (product.productGroupId !== undefined) {
    body.product_group_id = product.productGroupId;
  }
  return body;
}
