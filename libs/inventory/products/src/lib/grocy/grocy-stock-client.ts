import { Injectable } from '@nestjs/common';

import type { Inventory } from '../inventory.ts';
import type { QuantityUnitConversion, StockEntry } from '../product.ts';
import type { Purchase } from '../purchase.ts';
import type { BookingResult } from '../stock-log-row.ts';

import { resultOf } from './grocy-answers.ts';
import { GrocyClient } from './grocy-client.ts';
import { grocyConversionsSchema, toConversions } from './grocy-conversions.ts';
import { toGrocyInventoryBody } from './grocy-inventory.ts';
import { toGrocyPurchaseBody } from './grocy-purchase.ts';
import {
  grocyStockEntriesSchema,
  toStockEntries,
} from './grocy-stock-entries.ts';
import { stockLogRowsOf } from './grocy-stock-log.ts';

// The stock reads and the stock bookings of the Grocy API, for the product
// read and for the accept of the review queue. The client sends every call
// through the Grocy client, which maps the Grocy errors. A booking answers
// the stock log rows of the new transaction, or 400 with the reason when
// Grocy refuses the booking. The caller stores the reason on the pending
// scan.
@Injectable()
export class GrocyStockClient {
  constructor(private readonly grocy: GrocyClient) {}

  // This method books an inventory of one product: the new own stock. Grocy
  // books the difference as added stock or as a consume in the Grocy
  // order. Grocy refuses a new amount that equals the stock, so the caller
  // sends no inventory in that case.
  async inventory(
    productId: number,
    inventory: Inventory,
  ): Promise<BookingResult> {
    const answer = await this.grocy.post(
      `/api/stock/products/${String(productId)}/inventory`,
      toGrocyInventoryBody(inventory),
    );
    return resultOf(answer, stockLogRowsOf);
  }

  // This method books a purchase of one product.
  async purchase(
    productId: number,
    purchase: Purchase,
  ): Promise<BookingResult> {
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

  // The stock entries of one product in the Grocy consume order, as the
  // Grocy view `stock_next_use` sorts them. Grocy answers an empty list for
  // an unknown product.
  async readStockEntries(productId: number): Promise<StockEntry[]> {
    const data = await this.grocy.get(
      `/api/stock/products/${String(productId)}/entries`,
    );
    return toStockEntries(grocyStockEntriesSchema.parse(data));
  }
}
