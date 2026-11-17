import type {
  ConsumeStockEntry,
  ProductDetails,
} from '@grocy-next/inventory-products';

import { GrocyClient, GrocyStockClient } from '@grocy-next/inventory-products';
import { Injectable } from '@nestjs/common';

import type { FormDefaults } from './pending-scan-to-store.ts';
import type { CreatePendingScan } from './pending-scan.ts';
import type { ProductMatch } from './resolve-code.ts';

import { consumeAmountOf } from './consume-amount.ts';
import { formLocationOf, stockEntryDefaultsOf } from './from-location.ts';
import { readActiveProduct } from './read-product.ts';
import { resolveCode } from './resolve-code.ts';

// The Grocy reads of a create: the product that the code resolved to, and
// the defaults of a Consume or a Transfer.
export interface CreateReads {
  defaults: FormDefaults | null;
  match: null | ProductMatch;
}

// The amount of a Transfer scan with no amount from the body and none from
// the product barcode, as the Grocy transfer form sets it.
const DEFAULT_TRANSFER_AMOUNT = 1;

const NO_BARCODE = { amount: null, quantityUnitId: null };

// The Grocy reads of the pending scan operations. The create reads the
// product of the body, the product of the code, and the defaults of the Grocy
// form of the booking type. The update reads the product that it sets.
@Injectable()
export class ScanDefaults {
  constructor(
    private readonly grocy: GrocyClient,
    private readonly stock: GrocyStockClient,
  ) {}

  // The stock entries that the defaults need. The read includes the stock
  // entries of the sub-products. A body with a location and no stock entry
  // needs no read.
  private async readEntries(
    body: CreatePendingScan,
    product: ProductDetails,
    stockEntryId: null | string,
  ): Promise<ConsumeStockEntry[]> {
    return stockEntryId === null && body.locationId !== undefined
      ? []
      : this.stock.readConsumeStockEntries(product.id);
  }

  // The amount and the unit of a new Consume pending scan, as the Grocy
  // consume form sets them. The rule is in `consumeAmountOf`. When the quick
  // consume amount setting is on, the read includes the resolved conversions
  // of the product.
  private async consumeAmountOf(
    body: CreatePendingScan,
    match: null | ProductMatch,
    product: null | ProductDetails,
  ): Promise<Pick<FormDefaults, 'amount' | 'quantityUnitId'>> {
    const settings = await this.grocy.readConsumeSettings();
    const units =
      product === null || !settings.useQuickConsumeAmount
        ? null
        : {
            ...product,
            conversions: await this.stock.readResolvedConversions(product.id),
          };
    return consumeAmountOf(body, match?.barcode ?? NO_BARCODE, units, settings);
  }

  // The amount and the unit of a new Consume or Transfer pending scan. The
  // amount of a Transfer is the amount of the body, else the product barcode
  // amount, else one. The product barcode unit applies. The empty unit means
  // the stock unit.
  private async amountOf(
    body: CreatePendingScan,
    match: null | ProductMatch,
    product: null | ProductDetails,
  ): Promise<Pick<FormDefaults, 'amount' | 'quantityUnitId'>> {
    if (body.bookingType === 'consume') {
      return this.consumeAmountOf(body, match, product);
    }
    const barcode = match?.barcode ?? NO_BARCODE;
    return {
      amount: body.amount ?? barcode.amount ?? DEFAULT_TRANSFER_AMOUNT,
      quantityUnitId: body.quantityUnitId ?? barcode.quantityUnitId,
    };
  }

  // The defaults of a new Consume or Transfer pending scan that the server
  // reads from Grocy, as the Grocy form of the booking type sets them. A code
  // with no product has no location. A row that names
  // a stock entry takes the defaults of the stock entry, as
  // `stockEntryDefaultsOf` decides.
  private async formDefaults(
    body: CreatePendingScan,
    match: null | ProductMatch,
    product: null | ProductDetails,
  ): Promise<FormDefaults> {
    const amount = await this.amountOf(body, match, product);
    if (product === null) {
      return { ...amount, locationId: body.locationId ?? null };
    }
    const stockEntryId = body.stockEntryId ?? match?.stockEntryId ?? null;
    const entries = await this.readEntries(body, product, stockEntryId);
    const defaults = {
      ...amount,
      locationId: formLocationOf(body, product, entries),
    };
    const entry = entries.find((item) => item.stockId === stockEntryId);
    return entry === undefined
      ? defaults
      : stockEntryDefaultsOf(body, defaults, entry, product);
  }

  // A product id must name an active product, else the call is the
  // unknown-id problem.
  readProduct(productId: number): Promise<ProductDetails> {
    return readActiveProduct(this.grocy, productId);
  }

  // The reads of a create, before the database transaction.
  async readCreate(body: CreatePendingScan): Promise<CreateReads> {
    const bodyProduct =
      body.productId === undefined
        ? null
        : await this.readProduct(body.productId);
    const match =
      body.code === undefined ? null : await resolveCode(this.grocy, body.code);
    const defaults =
      body.bookingType === 'consume' || body.bookingType === 'transfer'
        ? await this.formDefaults(
            body,
            match,
            bodyProduct ?? match?.product ?? null,
          )
        : null;
    return { defaults, match };
  }
}
