import type { Product } from './product.ts';

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

// One resolved conversion of a product: the factor from one quantity unit
// to another. An amount in the from unit times the factor is the amount in
// the to unit.
export interface QuantityUnitConversion {
  factor: number;
  fromQuantityUnitId: number;
  toQuantityUnitId: number;
}

// The details of one product as the Grocy client reads them: the product of
// the Next API, the product barcodes that the code resolution of the review
// queue reads, the active flag, the default location, the picture flag, and
// the two units that the accept converts between. The stock amount is the
// own stock in the stock unit. A later ticket widens the shape with the
// facts that the review queue shows.
export interface ProductDetails extends Product {
  barcodes: ProductBarcode[];
  hasPicture: boolean;
  isActive: boolean;
  locationId: null | number;
  purchaseUnitId: number;
  stockUnitId: number;
}

// This function takes the product of the Next API out of the details. The
// response schema is strict, so the read carries the product fields and
// nothing else.
export function toProduct(details: ProductDetails): Product {
  return {
    description: details.description,
    id: details.id,
    name: details.name,
    stockAmount: details.stockAmount,
  };
}
