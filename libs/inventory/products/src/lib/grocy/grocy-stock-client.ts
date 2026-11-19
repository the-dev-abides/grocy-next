import { Injectable } from '@nestjs/common';

import type { Consume, ConsumeStockEntry, Open } from '../consume.ts';
import type { Inventory } from '../inventory.ts';
import type { QuantityUnitConversion, StockEntry } from '../product.ts';
import type { Purchase } from '../purchase.ts';
import type { BookingResult } from '../stock-log-row.ts';
import type { Transfer } from '../transfer.ts';

import { resultOf } from './grocy-answers.ts';
import { GrocyClient } from './grocy-client.ts';
import { toGrocyConsumeBody, toGrocyOpenBody } from './grocy-consume.ts';
import { grocyConversionsSchema, toConversions } from './grocy-conversions.ts';
import { toGrocyInventoryBody } from './grocy-inventory.ts';
import { toGrocyPurchaseBody } from './grocy-purchase.ts';
import {
  grocyConsumeStockEntriesSchema,
  grocyStockEntriesSchema,
  toConsumeStockEntries,
  toStockEntries,
  toStockEntriesWithProduct,
} from './grocy-stock-entries.ts';
import { stockLogRowsOf } from './grocy-stock-log.ts';
import { toGrocyTransferBody } from './grocy-transfer.ts';

// The stock reads and the stock bookings of the Grocy API, for the product
// read and for the accept of the review queue. The client sends every call
// through the Grocy client, which maps the Grocy errors. A booking answers
// the stock log rows of the new transaction, or 400 with the reason when
// Grocy refuses the booking. The caller stores the reason on the pending
// scan.
@Injectable()
export class GrocyStockClient {
  constructor(private readonly grocy: GrocyClient) {}

  // This method books a consume of one product. Grocy takes the stock entries
  // in its consume order, with the stock entries of the sub-products of a
  // parent product. Grocy books less than the amount with no error when the
  // location has less stock, so the caller checks the amount first.
  async consume(productId: number, consume: Consume): Promise<BookingResult> {
    const answer = await this.grocy.post(
      `/api/stock/products/${String(productId)}/consume`,
      toGrocyConsumeBody(consume),
    );
    return resultOf(answer, stockLogRowsOf);
  }

  // This method opens the amount of one stock entry of one product. Grocy
  // refuses the open of a product with "cannot be opened" and of a tare
  // weight product.
  async open(productId: number, open: Open): Promise<BookingResult> {
    const answer = await this.grocy.post(
      `/api/stock/products/${String(productId)}/open`,
      toGrocyOpenBody(open),
    );
    return resultOf(answer, stockLogRowsOf);
  }

  // The stock entries of one product and of its sub-products in the Grocy
  // consume order, with the product and the `stock_id` of each stock entry.
  // The accept of a Consume reads them before the consume. Grocy answers an
  // empty list for an unknown product.
  async readConsumeStockEntries(
    productId: number,
  ): Promise<ConsumeStockEntry[]> {
    const data = await this.grocy.get(
      `/api/stock/products/${String(productId)}/entries`,
      { include_sub_products: 'true' },
    );
    return toConsumeStockEntries(grocyConsumeStockEntriesSchema.parse(data));
  }

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

  // This method books a transfer of one product. Grocy answers a
  // `transfer_from` row and a `transfer_to` row for each stock entry that it
  // moves, all in one transaction.
  async transfer(
    productId: number,
    transfer: Transfer,
  ): Promise<BookingResult> {
    const answer = await this.grocy.post(
      `/api/stock/products/${String(productId)}/transfer`,
      toGrocyTransferBody(transfer),
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

  // The stock entries of one product and of its sub-products in the Grocy
  // consume order, with the product of each stock entry. The product read of
  // a parent product reads them, because a Consume of the parent product
  // takes them. This is the read of the accept of a Consume, with the dates.
  async readStockEntriesWithSubProducts(
    productId: number,
  ): Promise<(StockEntry & { productId: number })[]> {
    const data = await this.grocy.get(
      `/api/stock/products/${String(productId)}/entries`,
      { include_sub_products: 'true' },
    );
    return toStockEntriesWithProduct(
      grocyConsumeStockEntriesSchema.parse(data),
    );
  }
}
