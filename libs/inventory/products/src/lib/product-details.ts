import type { Product, QuantityUnitConversion, StockEntry } from './product.ts';

// One product barcode of a product: one code linked to the product, with
// the optional defaults for a scan. The price is the last price of the
// product barcode.
export interface ProductBarcode {
  amount: null | number;
  barcode: string;
  id: number;
  note: null | string;
  price: null | number;
  quantityUnitId: null | number;
  storeId: null | number;
}

// The stock facts of a product that come from two Grocy reads of their own:
// the stock entries in the Grocy consume order and the resolved
// conversions.
export interface ProductStock {
  conversions: QuantityUnitConversion[];
  stockEntries: StockEntry[];
}

// The details of one product as one Grocy read answers them: every field of
// the product of the Next API except the stock facts above, the product
// barcodes that the code resolution of the review queue reads, and the
// active flag. The stock amount is the own stock in the stock unit.
export interface ProductDetails extends Omit<Product, keyof ProductStock> {
  barcodes: ProductBarcode[];
  isActive: boolean;
}

// This function builds the product of the Next API from the details and the
// stock facts. The response schema is strict, so the read carries the
// product fields and nothing else.
export function toProduct(
  details: ProductDetails,
  stock: ProductStock,
): Product {
  return {
    conversions: stock.conversions,
    defaultDueDays: details.defaultDueDays,
    description: details.description,
    hasPicture: details.hasPicture,
    id: details.id,
    isParent: details.isParent,
    locationId: details.locationId,
    minStockAmount: details.minStockAmount,
    name: details.name,
    productGroupId: details.productGroupId,
    purchaseToStockFactor: details.purchaseToStockFactor,
    purchaseUnitId: details.purchaseUnitId,
    stockAmount: details.stockAmount,
    stockEntries: stock.stockEntries,
    stockUnitId: details.stockUnitId,
    tareWeight: details.tareWeight,
  };
}
