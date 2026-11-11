import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';

import type { CreateProduct, Product } from './product.ts';

import { GrocyClient } from './grocy/grocy-client.ts';
import { toGrocyProductBody } from './grocy/grocy-product-body.ts';
import { toGrocyProductConversionBody } from './grocy/grocy-product-conversions.ts';
import { purchaseToStockRowOf } from './product-conversion.ts';
import { toProduct } from './product-details.ts';
import { unknownIdOf } from './product-ids.ts';

// The product operations of the Next API that hold rules. The controller
// and, in a later spec, the MCP tool call these methods.
@Injectable()
export class ProductsService {
  constructor(private readonly grocy: GrocyClient) {}

  // Grocy does not check that the ids of a product create name a row, so
  // the server checks them against the active rows of the master data tables
  // first. An id that names nothing is the unknown-id problem of ADR 0014.
  private async checkIds(product: CreateProduct): Promise<void> {
    const [locations, productGroups, quantityUnits] = await Promise.all([
      this.grocy.listLocations(),
      this.grocy.listProductGroups(),
      this.grocy.listQuantityUnits(),
    ]);
    const detail = unknownIdOf(product, {
      locations,
      productGroups,
      quantityUnits,
    });
    if (detail !== null) {
      throw new ProblemException(PROBLEM_TYPES.unknownId, detail);
    }
  }

  // The factor from the purchase unit to the stock unit goes on the
  // conversion row that the Grocy trigger created for the new product. The
  // trigger creates no row when a conversion of the household already
  // resolves the pair, and the create then adds the row, so the product
  // stores the factor of the form in every case. A product whose purchase
  // unit is the stock unit has no row and no factor to set.
  private async setFactor(
    productId: number,
    product: CreateProduct,
  ): Promise<void> {
    if (product.purchaseUnitId === product.stockUnitId) {
      return;
    }
    const rows = await this.grocy.readProductConversions(productId);
    const row = purchaseToStockRowOf(rows, product);
    if (row === null) {
      const created = await this.grocy.createProductConversion(
        toGrocyProductConversionBody(
          {
            factor: product.purchaseToStockFactor,
            fromQuantityUnitId: product.purchaseUnitId,
            toQuantityUnitId: product.stockUnitId,
          },
          productId,
        ),
      );
      if (created.isRefused) {
        throw grocyRefused(created.grocy);
      }
      return;
    }
    await this.grocy.setConversionFactor(row.id, product.purchaseToStockFactor);
  }

  // The product create of the short product form: the ids are checked, the product goes into Grocy with the fields of the form, the factor goes on the conversion row, and the response is the product as Grocy stores it.
  // The create touches no pending scan, as ADR 0010 decided. The screen sets
  // the new product on the pending scan with a second call.
  async create(product: CreateProduct): Promise<Product> {
    await this.checkIds(product);
    const created = await this.grocy.createProduct(toGrocyProductBody(product));
    if (created.isRefused) {
      throw grocyRefused(created.grocy);
    }
    await this.setFactor(created.id, product);
    const details = await this.grocy.readProductDetails(created.id);
    if (details === null) {
      throw new ProblemException(
        PROBLEM_TYPES.grocyUnavailable,
        `Grocy created the product ${String(created.id)} and did not answer its details.`,
      );
    }
    return toProduct(details);
  }
}

// A Grocy refusal as the grocy-refused problem of ADR 0014.
function grocyRefused(grocy: {
  message: string;
  status: number;
}): ProblemException {
  return new ProblemException(PROBLEM_TYPES.grocyRefused, grocy.message, {
    grocy,
  });
}
