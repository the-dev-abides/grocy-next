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

// The stock facts of a product that come from two Grocy reads of their
// own. These are the stock entries in the Grocy consume order and the resolved
// conversions.
export interface ProductStock {
  conversions: QuantityUnitConversion[];
  stockEntries: StockEntry[];
}

// The details of one product as one Grocy read answers them. They hold every field of the product of the Next API except the stock facts above. They also hold the product barcodes that the code resolution of the review queue reads, and the active flag. The stock amount is the own stock in the stock unit.
// The consume location and the quick consume amount are defaults of the Grocy consume form. The Next API product does not show them. The quick consume amount is in the stock unit.
// The open flag is false for a product with the Grocy setting "cannot be
// opened". The open on consume reads it.
export interface ProductDetails extends Omit<Product, keyof ProductStock> {
  barcodes: ProductBarcode[];
  canBeOpened: boolean;
  consumeLocationId: null | number;
  isActive: boolean;
  quickConsumeAmount: number;
}

// This function builds the product of the Next API from the details and the
// stock facts. The response schema is strict, so the read carries the
// product fields and nothing else.
export function toProduct(
  details: ProductDetails,
  stock: ProductStock,
): Product {
  return {
    consumeUnitId: details.consumeUnitId,
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
