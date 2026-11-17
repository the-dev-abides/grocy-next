import type {
  BookingResult,
  StockLogRow,
} from '@grocy-next/inventory-products';
import type { Repository } from 'typeorm';

import {
  GrocyClient,
  grocyRefused,
  GrocyStockClient,
} from '@grocy-next/inventory-products';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import type { Booking, CreateBooking, StockLogRowItem } from './booking.ts';
import type { StoredPendingScan } from './storage/stored-pending-scan.ts';

import {
  inventoryAmountOf,
  positiveAmountOf,
  productIdOf,
  toLocationIdOf,
} from './accept-checks.ts';
import {
  aboveStockRefusal,
  consumedAmountOf,
  entriesOfRow,
  isAboveStock,
  openRest,
  opensAfterConsume,
  readConsumeProducts,
  stockAt,
} from './consume-accept.ts';
import { isNoChange } from './inventory-change.ts';
import { PendingScansService } from './pending-scans.service.ts';
import { toStockAmount, toStockUnit } from './purchase-conversion.ts';
import { readActiveProduct } from './read-product.ts';
import { storedPendingScanSchema } from './storage/stored-pending-scan.ts';
import { now } from './storage/timestamp.ts';

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

  // The Purchase accept converts the amount and the price to the stock unit
  // with the resolved conversions of the product. Then it books the purchase in
  // Grocy. On a Grocy 500 or no answer, the row stays unchanged and the client
  // throws.
  private async acceptPurchase(
    row: StoredPendingScan,
    productId: number,
  ): Promise<Booking> {
    const amount = positiveAmountOf(row, 'A Purchase');
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
    return this.finish(row, productId, result);
  }

  // The Inventory accept: the amount is the new own stock in the stock unit. A
  // count equal to the stock is no change: no Grocy call, the row goes, and the
  // booking has no transaction and no rows. Any other count books the inventory
  // in Grocy with the fields of the added stock. The paths after the Grocy call
  // are the paths of the Purchase accept.
  private async acceptInventory(
    row: StoredPendingScan,
    productId: number,
  ): Promise<Booking> {
    const amount = inventoryAmountOf(row);
    const product = await readActiveProduct(this.grocy, productId);
    if (isNoChange(amount, product)) {
      await this.rows.delete({ id: row.id });
      return toBooking(row, productId, []);
    }
    const result = await this.stock.inventory(productId, {
      amount,
      dueDate: row.dueDate,
      locationId: row.locationId,
      note: row.note,
      price: row.price,
      storeId: row.storeId,
    });
    return this.finish(row, productId, result);
  }

  // The Consume accept of ADR 0017. The amount goes to the stock unit with the resolved conversions of the product. The empty unit is the consume unit.
  // The read of the stock entries before the consume serves the amount check
  // and the open on consume. An amount above the stock at the "from" location,
  // or above the stock entry when the row names one, is refused with the Grocy message and no Grocy call. After the consume,
  // the open of each sealed stock entry that the consume left partly in stock
  // follows. The booking lists the rows of the consume, then the rows of the
  // open. The transaction id is the transaction of the consume.
  private async acceptConsume(
    row: StoredPendingScan,
    productId: number,
  ): Promise<Booking> {
    const product = await readActiveProduct(this.grocy, productId);
    const amount = toStockAmount(
      positiveAmountOf(row, 'A Consume'),
      row.quantityUnitId ?? product.consumeUnitId,
      {
        conversions: await this.stock.readResolvedConversions(productId),
        stockUnitId: product.stockUnitId,
      },
    );
    const entries = await this.stock.readConsumeStockEntries(productId);
    const products = await readConsumeProducts(
      { grocy: this.grocy, stock: this.stock },
      product,
      entries,
    );
    if (
      isAboveStock(
        consumedAmountOf(amount, product),
        stockAt(
          entriesOfRow(entries, row.stockEntryId),
          row.locationId,
          products,
        ),
      )
    ) {
      return this.finish(row, productId, aboveStockRefusal());
    }
    const result = await this.stock.consume(productId, {
      amount,
      isSpoiled: row.spoiled,
      locationId: row.locationId,
      stockId: row.stockEntryId,
    });
    if (result.isRefused) {
      return this.finish(row, productId, result);
    }
    const opened = await openRest(
      this.stock,
      opensAfterConsume(result.rows, entries, products),
    );
    return this.finish(row, productId, {
      isRefused: false,
      rows: [...result.rows, ...opened],
    });
  }

  // The Transfer accept converts the amount to the stock unit with the resolved conversions of the product. The empty unit is the stock unit.
  // Then it books the transfer in Grocy with both locations. Grocy applies
  // the freezer rules and refuses a tare weight product. Grocy Next adds no
  // rule.
  private async acceptTransfer(
    row: StoredPendingScan,
    productId: number,
  ): Promise<Booking> {
    const toLocationId = toLocationIdOf(row);
    const entered = positiveAmountOf(row, 'A Transfer');
    const product = await readActiveProduct(this.grocy, productId);
    const amount = toStockAmount(
      entered,
      row.quantityUnitId ?? product.stockUnitId,
      {
        conversions: await this.stock.readResolvedConversions(productId),
        stockUnitId: product.stockUnitId,
      },
    );
    const result = await this.stock.transfer(productId, {
      amount,
      fromLocationId: row.locationId,
      stockId: row.stockEntryId,
      toLocationId,
    });
    return this.finish(row, productId, result);
  }

  // The end of an accept after the Grocy call. On success the row goes and
  // the response is the booking. On a Grocy refusal the row stays with the
  // Grocy message as its error, and the response is the grocy-refused
  // problem.
  private async finish(
    row: StoredPendingScan,
    productId: number,
    result: BookingResult,
  ): Promise<Booking> {
    if (result.isRefused) {
      await this.rows.update(
        { id: row.id },
        { error: result.grocy.message, updatedAt: now() },
      );
      throw grocyRefused(result.grocy);
    }
    await this.rows.delete({ id: row.id });
    return toBooking(row, productId, result.rows);
  }

  // The accept reads the pending scan, refuses a row with no product, and
  // then books the booking type of the row.
  async create(body: CreateBooking): Promise<Booking> {
    const row = await this.pendingScans.read(body.pendingScanId);
    const productId = productIdOf(row);
    switch (row.bookingType) {
      case 'consume': {
        return this.acceptConsume(row, productId);
      }
      case 'inventory': {
        return this.acceptInventory(row, productId);
      }
      case 'purchase': {
        return this.acceptPurchase(row, productId);
      }
      case 'transfer': {
        return this.acceptTransfer(row, productId);
      }
    }
  }
}
