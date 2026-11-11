import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';

import type { ProductDetails } from './product-details.ts';
import type { CreateProduct, Product } from './product.ts';

import { grocyRefused } from './grocy/grocy-answers.ts';
import { GrocyClient } from './grocy/grocy-client.ts';
import { toGrocyProductBody } from './grocy/grocy-product-body.ts';
import { toGrocyProductConversionBody } from './grocy/grocy-product-conversions.ts';
import { GrocyStockClient } from './grocy/grocy-stock-client.ts';
import { purchaseToStockRowOf } from './product-conversion.ts';
import { toProduct } from './product-details.ts';
import { unknownIdOf } from './product-ids.ts';

// The product operations of the Next API that hold rules. The controller
// and, in a later spec, the MCP tool call these methods.
@Injectable()
export class ProductsService {
  constructor(
    private readonly grocy: GrocyClient,
    private readonly stock: GrocyStockClient,
  ) {}

  // The product of the Next API: the details plus the stock entries and the
  // resolved conversions, which Grocy answers in two reads of their own.
  private async toProduct(details: ProductDetails): Promise<Product> {
    const [conversions, stockEntries] = await Promise.all([
      this.stock.readResolvedConversions(details.id),
      this.stock.readStockEntries(details.id),
    ]);
    return toProduct(details, { conversions, stockEntries });
  }

  // Grocy does not check that the ids of a product create name a row. Thus the
  // server first checks them against the active rows of the master data
  // tables. An id that names nothing is the unknown-id problem of ADR 0014.
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

  // The factor from the purchase unit to the stock unit goes on the conversion
  // row that the Grocy trigger created for the new product. When a conversion
  // of the household already resolves the pair, the trigger creates no row, and
  // the create adds the row. Thus the product stores the factor of the form in
  // every case. A product whose purchase unit is the stock unit has no row and
  // no factor to set.
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

  // The product create of the short product form. The service checks the ids
  // and creates the product in Grocy with the fields of the form. It sets the
  // factor on the conversion row. The response is the product as Grocy stores
  // it. The create touches no pending scan, as ADR 0010 decided. The screen
  // sets the new product on the pending scan with a second call.
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
    return this.toProduct(details);
  }

  // The product read: the product that an id names, or null when no active
  // product has the id.
  async read(productId: number): Promise<null | Product> {
    const details = await this.grocy.readProductDetails(productId);
    return details === null ? null : this.toProduct(details);
  }
}
