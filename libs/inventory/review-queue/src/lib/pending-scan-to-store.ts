import type { ProductBarcode } from '@grocy-next/inventory-products';

import type { CreatePendingScan, PriceType } from './pending-scan.ts';
import type { ProductMatch } from './resolve-code.ts';
import type { PendingScanToStore } from './storage/stored-pending-scan.ts';

type BodyFields = Pick<
  PendingScanToStore,
  | 'bookingType'
  | 'code'
  | 'dueDate'
  | 'locationId'
  | 'productGroupId'
  | 'writeInName'
>;
type ProductFields = Pick<PendingScanToStore, 'note' | 'productId'>;
type PriceFields = Pick<PendingScanToStore, 'price' | 'priceType'>;
type AmountFields = Pick<
  PendingScanToStore,
  'amount' | 'price' | 'priceType' | 'quantityUnitId' | 'storeId'
>;

const DEFAULT_PRICE_TYPE: PriceType = 'unit';
export const DEFAULT_PURCHASE_AMOUNT = 1;

// The defaults of a code that no product barcode matched.
const NO_BARCODE: Omit<ProductBarcode, 'barcode' | 'id'> = {
  amount: null,
  note: null,
  price: null,
  quantityUnitId: null,
  storeId: null,
};

// The fields that only the body sets. An absent field is unset.
function bodyFields(body: CreatePendingScan): BodyFields {
  return {
    bookingType: body.bookingType,
    code: body.code ?? null,
    dueDate: body.dueDate ?? null,
    locationId: body.locationId ?? null,
    productGroupId: body.productGroupId ?? null,
    writeInName: body.writeInName ?? null,
  };
}

// The product and the note come from the match where the body left them
// unset. Both booking types take them.
function productFields(
  body: CreatePendingScan,
  match: null | ProductMatch,
): ProductFields {
  return {
    note: body.note ?? match?.barcode?.note ?? null,
    productId: body.productId ?? match?.productId ?? null,
  };
}

// The price of the body with its price type, or null when the body has no
// price. The default price type is the unit price.
export function bodyPrice(body: CreatePendingScan): null | PriceFields {
  return body.price === undefined
    ? null
    : { price: body.price, priceType: body.priceType ?? DEFAULT_PRICE_TYPE };
}

// A price from the body keeps its price type. The last price of a product
// barcode is the price of one product barcode amount. It enters as a unit
// price in the unit of the product barcode: the last price divided by the
// product barcode amount when the product barcode has one, else the last
// price. Thus a repeat scan that adds to the amount keeps a correct price.
function priceFields(
  body: CreatePendingScan,
  barcode: Omit<ProductBarcode, 'barcode' | 'id'>,
): PriceFields {
  const price = bodyPrice(body);
  if (price !== null) {
    return price;
  }
  if (barcode.price !== null) {
    return {
      price: barcode.price / (barcode.amount ?? DEFAULT_PURCHASE_AMOUNT),
      priceType: 'unit',
    };
  }
  return { price: null, priceType: body.priceType ?? DEFAULT_PRICE_TYPE };
}

// A Purchase pending scan takes the product barcode defaults where the body
// left the field unset. With no amount from the body and none from the
// barcode, the amount is one.
function purchaseFields(
  body: CreatePendingScan,
  match: null | ProductMatch,
): AmountFields {
  const barcode = match?.barcode ?? NO_BARCODE;
  return {
    amount: body.amount ?? barcode.amount ?? DEFAULT_PURCHASE_AMOUNT,
    quantityUnitId: body.quantityUnitId ?? barcode.quantityUnitId,
    storeId: body.storeId ?? barcode.storeId,
    ...priceFields(body, barcode),
  };
}

// An Inventory pending scan takes none of the amount, the unit, the price,
// and the store from the product barcode. The amount stays null until the
// review queue sets it.
function inventoryFields(body: CreatePendingScan): AmountFields {
  return {
    amount: body.amount ?? null,
    price: body.price ?? null,
    priceType: body.priceType ?? DEFAULT_PRICE_TYPE,
    quantityUnitId: body.quantityUnitId ?? null,
    storeId: body.storeId ?? null,
  };
}

// This function builds the row of a pending scan from the create body and the
// product that the code resolved to. It also uses the time of the create, as
// RFC 3339 text in UTC. The row stores the code as scanned. A value from the
// body wins over a product barcode default.
export function pendingScanToStore(
  body: CreatePendingScan,
  match: null | ProductMatch,
  now: string,
): PendingScanToStore {
  return {
    ...bodyFields(body),
    ...productFields(body, match),
    createdAt: now,
    error: null,
    lastLookupAt: null,
    lookupResult: null,
    productBarcodeId: null,
    scannedAt: now,
    updatedAt: now,
    ...(body.bookingType === 'purchase'
      ? purchaseFields(body, match)
      : inventoryFields(body)),
  };
}
