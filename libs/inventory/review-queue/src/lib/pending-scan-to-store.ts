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
  | 'spoiled'
  | 'toLocationId'
  | 'writeInName'
>;
type ProductFields = Pick<
  PendingScanToStore,
  'note' | 'productId' | 'stockEntryId'
>;
type PriceFields = Pick<PendingScanToStore, 'price' | 'priceType'>;
type AmountFields = Pick<
  PendingScanToStore,
  'amount' | 'price' | 'priceType' | 'quantityUnitId' | 'storeId'
>;

// The defaults of a Consume or a Transfer pending scan that the server reads
// from Grocy. The Grocy form of the booking type sets them. They are the
// amount, its unit, and the "from" location.
export type FormDefaults = Pick<
  PendingScanToStore,
  'amount' | 'locationId' | 'quantityUnitId'
>;

const DEFAULT_PRICE_TYPE: PriceType = 'unit';
const DEFAULT_PURCHASE_AMOUNT = 1;

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
    spoiled: body.spoiled ?? false,
    toLocationId: body.toLocationId ?? null,
    writeInName: body.writeInName ?? null,
  };
}

function stockEntryIdOf(
  body: CreatePendingScan,
  match: null | ProductMatch,
): null | string {
  return body.stockEntryId ?? match?.stockEntryId ?? null;
}

// The product, the note, and the stock entry come from the match where the
// body left them unset. Every booking type takes them.
function productFields(
  body: CreatePendingScan,
  match: null | ProductMatch,
): ProductFields {
  return {
    note: body.note ?? match?.barcode?.note ?? null,
    productId: body.productId ?? match?.productId ?? null,
    stockEntryId: stockEntryIdOf(body, match),
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
// review queue sets it. A Consume and a Transfer pending scan take the price
// and the store of the body only, because they do not apply to them. The row
// keeps them.
function bodyAmountFields(body: CreatePendingScan): AmountFields {
  return {
    amount: body.amount ?? null,
    price: body.price ?? null,
    priceType: body.priceType ?? DEFAULT_PRICE_TYPE,
    quantityUnitId: body.quantityUnitId ?? null,
    storeId: body.storeId ?? null,
  };
}

function amountFields(
  body: CreatePendingScan,
  match: null | ProductMatch,
  defaults: FormDefaults | null,
): AmountFields | (AmountFields & FormDefaults) {
  if (body.bookingType === 'purchase') {
    return purchaseFields(body, match);
  }
  return defaults === null
    ? bodyAmountFields(body)
    : { ...bodyAmountFields(body), ...defaults };
}

// This function builds the row of a pending scan from the create body and the
// product that the code resolved to. A Consume and a Transfer also take the
// defaults that the server read from Grocy. The function also uses the time of
// the create, as RFC 3339 text in UTC. The row stores the code as scanned. A
// value from the body wins over a product barcode default.
export function pendingScanToStore(
  body: CreatePendingScan,
  match: null | ProductMatch,
  now: string,
  defaults: FormDefaults | null = null,
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
    ...amountFields(body, match, defaults),
  };
}
