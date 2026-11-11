import type { ProductDetails } from '@grocy-next/inventory-products';

import type { StoredPendingScan } from './storage/stored-pending-scan.ts';

import { codeForms } from './code-forms.ts';

// This function returns the product id of an update that sets a product on
// a row that had none, or changes it. Every other update returns null.
export function changedProductIdOf(
  row: StoredPendingScan,
  updated: StoredPendingScan,
): null | number {
  return updated.productId === null || updated.productId === row.productId
    ? null
    : updated.productId;
}

// This function says whether the product has a product barcode with the
// code. Grocy ignores case on the match, and a 12-digit code and its
// 13-digit form with a leading zero are one code, as ADR 0011 decided.
export function hasBarcode(product: ProductDetails, code: string): boolean {
  const forms = new Set(codeForms(code).map((form) => form.toLowerCase()));
  return product.barcodes.some((row) => forms.has(row.barcode.toLowerCase()));
}

// This function applies the rules of an update that sets a product, after
// the Grocy writes: the write-in name goes, the unit goes because the empty
// unit means the purchase unit of the product, the location takes the
// product default when the row had none, and the row stores the id of the
// product barcode that the update added in Grocy, or null when it added
// none.
export function withProduct(
  updated: StoredPendingScan,
  product: ProductDetails,
  productBarcodeId: null | number,
): StoredPendingScan {
  return {
    ...updated,
    locationId: updated.locationId ?? product.locationId,
    productBarcodeId,
    quantityUnitId: null,
    writeInName: null,
  };
}
