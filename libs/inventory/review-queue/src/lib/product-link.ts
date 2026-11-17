import type { ProductDetails } from '@grocy-next/inventory-products';

import { GrocyClient, grocyRefused } from '@grocy-next/inventory-products';
import { Injectable } from '@nestjs/common';

import type { StoredPendingScan } from './storage/stored-pending-scan.ts';

import { ProductPictures } from './product-picture.ts';
import { readActiveProduct } from './read-product.ts';
import { hasBarcode, withProduct } from './set-product.ts';

// The Grocy writes of an update that sets a product, as the spec decided.
// The writes come in order, and the first failure stops the update with the
// Grocy problem.
@Injectable()
export class ProductLink {
  constructor(
    private readonly grocy: GrocyClient,
    private readonly pictures: ProductPictures,
  ) {}

  // When the row has a code, the code goes to the product as a product
  // barcode. This happens only when the product has no product barcode with
  // that code. The result is the id of the new product barcode, or null when
  // none was added. A Grocy refusal is the grocy-refused problem of ADR 0014.
  private async addBarcode(
    product: ProductDetails,
    code: null | string,
  ): Promise<null | number> {
    if (code === null || hasBarcode(product, code)) {
      return null;
    }
    const result = await this.grocy.createProductBarcode(product.id, code);
    if (result.isRefused) {
      throw grocyRefused(result.grocy);
    }
    return result.id;
  }

  // This method reads the product, adds the code as a product barcode, and
  // sets the lookup image as the product picture. The result is the row with
  // the rules of the product set, ready to store.
  async link(
    updated: StoredPendingScan,
    productId: number,
  ): Promise<StoredPendingScan> {
    const product = await readActiveProduct(this.grocy, productId);
    const productBarcodeId = await this.addBarcode(product, updated.code);
    await this.pictures.setFromLookup(product, updated.lookupResult);
    return withProduct(updated, product, productBarcodeId);
  }
}
