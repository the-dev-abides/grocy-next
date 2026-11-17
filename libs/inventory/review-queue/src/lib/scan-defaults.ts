import type { ProductDetails } from '@grocy-next/inventory-products';

import { GrocyClient } from '@grocy-next/inventory-products';
import { Injectable } from '@nestjs/common';

import type { ConsumeFields } from './pending-scan-to-store.ts';
import type { CreatePendingScan } from './pending-scan.ts';
import type { ProductMatch } from './resolve-code.ts';

import { consumeAmountOf } from './consume-amount.ts';
import { readActiveProduct } from './read-product.ts';
import { resolveCode } from './resolve-code.ts';

// The Grocy reads of a create: the product that the code resolved to, and
// the defaults of a Consume.
export interface CreateReads {
  consume: ConsumeFields | null;
  match: null | ProductMatch;
}

// The Grocy reads of the pending scan operations. The create reads the
// product of the body, the product of the code, and the defaults of the Grocy
// form of the booking type. The update reads the product that it sets.
@Injectable()
export class ScanDefaults {
  constructor(private readonly grocy: GrocyClient) {}

  // The defaults of a new Consume pending scan that the server reads from
  // Grocy, as the Grocy consume form sets them. The amount rule is in
  // `consumeAmountOf`. With no "from" location in the body, the server uses
  // the default consume location of the product, else its default location.
  // A code with no product has no location.
  private async consumeFields(
    body: CreatePendingScan,
    match: null | ProductMatch,
    product: null | ProductDetails,
  ): Promise<ConsumeFields> {
    const settings = await this.grocy.readConsumeSettings();
    const barcode = match?.barcode ?? { amount: null, quantityUnitId: null };
    return {
      ...consumeAmountOf(body, barcode, product, settings),
      locationId:
        body.locationId ??
        product?.consumeLocationId ??
        product?.locationId ??
        null,
    };
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
    const consume =
      body.bookingType === 'consume'
        ? await this.consumeFields(
            body,
            match,
            bodyProduct ?? match?.product ?? null,
          )
        : null;
    return { consume, match };
  }
}
