import { Injectable } from '@nestjs/common';

import type { QuantityUnitConversion } from '../product-details.ts';
import type { Purchase, PurchaseResult } from '../purchase.ts';

import { resultOf } from './grocy-answers.ts';
import { GrocyClient } from './grocy-client.ts';
import { grocyConversionsSchema, toConversions } from './grocy-conversions.ts';
import { toGrocyPurchaseBody } from './grocy-purchase.ts';
import { stockLogRowsOf } from './grocy-stock-log.ts';

// The stock bookings of the Grocy API, for the accept of the review queue.
// The client sends every call through the Grocy client, which maps the
// Grocy errors. A booking answers the stock log rows of the new transaction,
// or 400 with the reason when Grocy refuses the booking. The caller stores
// the reason on the pending scan.
@Injectable()
export class GrocyStockClient {
  constructor(private readonly grocy: GrocyClient) {}

  // This method books a purchase of one product.
  async purchase(
    productId: number,
    purchase: Purchase,
  ): Promise<PurchaseResult> {
    const answer = await this.grocy.post(
      `/api/stock/products/${String(productId)}/add`,
      toGrocyPurchaseBody(purchase),
    );
    return resultOf(answer, stockLogRowsOf);
  }

  // The resolved conversions of one product: every pair of quantity units
  // with a path between them and the factor of the path. Grocy answers an
  // empty list for an unknown product.
  async readResolvedConversions(
    productId: number,
  ): Promise<QuantityUnitConversion[]> {
    const data = await this.grocy.query(
      'quantity_unit_conversions_resolved',
      `product_id=${String(productId)}`,
    );
    return toConversions(grocyConversionsSchema.parse(data));
  }
}
