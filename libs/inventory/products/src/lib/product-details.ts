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

// The details of one product as the code resolution of the review queue
// reads them. A later ticket widens the shape into the product read of the
// Next API.
export interface ProductDetails {
  barcodes: ProductBarcode[];
  id: number;
  isActive: boolean;
  name: string;
}
