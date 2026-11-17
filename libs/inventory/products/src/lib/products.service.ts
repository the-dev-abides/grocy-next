import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { Injectable } from '@nestjs/common';

import type { ProductDetails } from './product-details.ts';
import type {
  CreateProduct,
  Product,
  SubProductStockEntry,
} from './product.ts';

import { readConsumeProducts } from './consume-products.ts';
import { grocyRefused } from './grocy/grocy-answers.ts';
import { GrocyClient } from './grocy/grocy-client.ts';
import { toGrocyProductBody } from './grocy/grocy-product-body.ts';
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

  // The stock entries of the sub-products of a parent product, which a
  // Consume of the parent product takes. The read and the factor of each
  // sub-product are the reads of the Consume accept. The amount goes to the
  // stock unit of the parent product, as the amount check of the accept
  // converts it. A product that is no parent product has none.
  private async readSubProductStock(
    details: ProductDetails,
  ): Promise<SubProductStockEntry[]> {
    if (!details.isParent) {
      return [];
    }
    const entries = await this.stock.readStockEntriesWithSubProducts(
      details.id,
    );
    const products = await readConsumeProducts(
      { grocy: this.grocy, stock: this.stock },
      details,
      entries,
    );
    return entries
      .filter((entry) => entry.productId !== details.id)
      .map((entry) => {
        const product = products.get(entry.productId);
        return {
          ...entry,
          amount: entry.amount / (product?.factor ?? 1),
          canBeOpened: product?.canOpen ?? false,
        };
      });
  }

  // The product of the Next API: the details, the stock entries, the resolved
  // conversions, and the stock entries of the sub-products. Grocy answers each
  // of the last three in a read of its own.
  private async toProduct(details: ProductDetails): Promise<Product> {
    const [conversions, stockEntries, subProductStockEntries] =
      await Promise.all([
        this.stock.readResolvedConversions(details.id),
        this.stock.readStockEntries(details.id),
        this.readSubProductStock(details),
      ]);
    return toProduct(details, {
      conversions,
      stockEntries,
      subProductStockEntries,
    });
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
  // of the household already resolves the pair, the trigger creates no row. The
  // product then uses the household conversion, and the create writes no
  // product conversion, because a product conversion wins over the household
  // conversion for this product. A product whose purchase unit is the stock
  // unit has no row and no factor to set.
  private async setFactor(
    productId: number,
    product: CreateProduct,
  ): Promise<void> {
    if (product.purchaseUnitId === product.stockUnitId) {
      return;
    }
    const rows = await this.grocy.readProductConversions(productId);
    const row = purchaseToStockRowOf(rows, product);
    if (row !== null) {
      await this.grocy.setConversionFactor(
        row.id,
        product.purchaseToStockFactor,
      );
    }
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

  // The product read: the product that an id names. Grocy answers an unknown
  // id and an inactive product with one refusal, so both are the not-found
  // problem. The service throws the problem, so the controller and the MCP
  // tool hold no rule.
  async read(productId: number): Promise<Product> {
    const details = await this.grocy.readProductDetails(productId);
    if (details === null) {
      throw new ProblemException(
        PROBLEM_TYPES.notFound,
        `No product has the id ${String(productId)}.`,
      );
    }
    return this.toProduct(details);
  }
}
