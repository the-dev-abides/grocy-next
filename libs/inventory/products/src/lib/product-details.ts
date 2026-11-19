import type {
  Product,
  QuantityUnitConversion,
  StockEntry,
  SubProductStockEntry,
} from './product.ts';

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
// own. These are the stock entries in the Grocy consume order, the resolved
// conversions, and the stock entries of the sub-products.
export interface ProductStock {
  conversions: QuantityUnitConversion[];
  stockEntries: StockEntry[];
  subProductStockEntries: SubProductStockEntry[];
}

// The details of one product as one Grocy read answers them. They hold every
// field of the product of the Next API except the stock facts above. They also
// hold the product barcodes that the code resolution of the review queue reads,
// and the active flag. The stock amount is the own stock in the stock unit. The
// quick consume amount is a default of the Grocy consume form. The Next API
// product does not show it. It is in the stock unit.
export interface ProductDetails extends Omit<Product, keyof ProductStock> {
  barcodes: ProductBarcode[];
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
    canBeOpened: details.canBeOpened,
    consumeLocationId: details.consumeLocationId,
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
    subProductStockEntries: stock.subProductStockEntries,
    tareWeight: details.tareWeight,
  };
}
