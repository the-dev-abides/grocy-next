import type { StockLogRow } from '@grocy-next/inventory-products';
import type { Repository } from 'typeorm';

import { GrocyClient, GrocyStockClient } from '@grocy-next/inventory-products';
import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import type { Booking, CreateBooking, StockLogRowItem } from './booking.ts';
import type { StoredPendingScan } from './storage/stored-pending-scan.ts';

import { PendingScansService } from './pending-scans.service.ts';
import { toStockUnit } from './purchase-conversion.ts';
import { readActiveProduct } from './read-product.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';
import { now } from './storage/timestamp.ts';

// The accept of a pending scan with no product is refused, as ADR 0010
// decided. The row gets a product first.
function productIdOf(row: StoredPendingScan): number {
  if (row.productId === null) {
    throw new ProblemException(
      PROBLEM_TYPES.noProduct,
      'The pending scan has no product. Set a product first.',
    );
  }
  return row.productId;
}

// A Purchase books an amount of more than zero. Null, zero, or less is the
// no-amount problem.
function purchaseAmountOf(row: StoredPendingScan): number {
  if (row.amount === null || row.amount <= 0) {
    throw new ProblemException(
      PROBLEM_TYPES.noAmount,
      'A Purchase needs an amount of more than zero.',
    );
  }
  return row.amount;
}

// An Inventory pending scan arrives with no amount, and the review queue
// sets it. The accept with no amount is refused, as ADR 0010 decided.
function inventoryAmountOf(row: StoredPendingScan): number {
  if (row.amount === null) {
    throw new ProblemException(
      PROBLEM_TYPES.noAmount,
      'An Inventory needs the new amount of the product.',
    );
  }
  return row.amount;
}

function toStockLogRowItem(row: StockLogRow): StockLogRowItem {
  return {
    amount: row.amount,
    dueDate: row.dueDate,
    id: row.id,
    locationId: row.locationId,
    note: row.note,
    price: row.price,
    purchasedDate: row.purchasedDate,
    stockEntryId: row.stockEntryId,
    storeId: row.storeId,
    transactionType: row.transactionType,
  };
}

// The booking resource of ADR 0014: the stock log rows of the transaction
// mapped to Next API fields. Every row of one transaction shares the id.
function toBooking(
  row: StoredPendingScan,
  productId: number,
  rows: StockLogRow[],
): Booking {
  return {
    bookings: rows.map((stockLogRow) => toStockLogRowItem(stockLogRow)),
    bookingType: row.bookingType,
    pendingScanId: row.id,
    productId,
    transactionId: rows[0]?.transactionId ?? null,
  };
}

// The accept of ADR 0010: the creation of a booking from one pending scan.
// The rules live here. The controller and, in a later spec, the MCP tool
// call this service.
@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(storedPendingScanSchema)
    private readonly rows: Repository<StoredPendingScan>,
    private readonly pendingScans: PendingScansService,
    private readonly grocy: GrocyClient,
    private readonly stock: GrocyStockClient,
  ) {}

  // The Purchase accept: convert the amount and the price to the stock unit
  // with the resolved conversions of the product, then book the purchase in
  // Grocy. On success the row goes and the response is the booking. On a
  // Grocy refusal the row stays with the Grocy message as its error. On a
  // Grocy 500 or no answer the row stays unchanged and the client throws.
  private async acceptPurchase(
    row: StoredPendingScan,
    productId: number,
  ): Promise<Booking> {
    const amount = purchaseAmountOf(row);
    const product = await readActiveProduct(this.grocy, productId);
    const conversions = await this.stock.readResolvedConversions(productId);
    const stock = toStockUnit(
      {
        amount,
        price: row.price,
        priceType: row.priceType,
        quantityUnitId: row.quantityUnitId,
      },
      {
        conversions,
        purchaseUnitId: product.purchaseUnitId,
        stockUnitId: product.stockUnitId,
      },
    );
    const result = await this.stock.purchase(productId, {
      amount: stock.amount,
      dueDate: row.dueDate,
      locationId: row.locationId,
      note: row.note,
      price: stock.price,
      storeId: row.storeId,
    });
    if (result.isRefused) {
      await this.rows.update(
        { id: row.id },
        { error: result.grocy.message, updatedAt: now() },
      );
      throw new ProblemException(
        PROBLEM_TYPES.grocyRefused,
        result.grocy.message,
        { grocy: result.grocy },
      );
    }
    await this.rows.delete({ id: row.id });
    return toBooking(row, productId, result.rows);
  }

  // The Inventory accept comes in a later ticket. This run refuses a row
  // with no amount, as ADR 0010 decided, and answers 501 for every other
  // Inventory row.
  private acceptInventory(row: StoredPendingScan): never {
    inventoryAmountOf(row);
    throw new NotImplementedException(
      'The Inventory accept comes in a later ticket.',
    );
  }

  // The accept reads the pending scan, refuses a row with no product, and
  // then books the booking type of the row.
  async create(body: CreateBooking): Promise<Booking> {
    const row = await this.pendingScans.read(body.pendingScanId);
    const productId = productIdOf(row);
    return row.bookingType === 'inventory'
      ? this.acceptInventory(row)
      : this.acceptPurchase(row, productId);
  }
}
