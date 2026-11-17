import type {
  ConsumeSettings,
  ProductBarcode,
  ProductDetails,
} from '@grocy-next/inventory-products';

import type { CreatePendingScan } from './pending-scan.ts';
import type { StockUnit } from './purchase-conversion.ts';
import type { PendingScanToStore } from './storage/stored-pending-scan.ts';

import { stockFactorOf } from './purchase-conversion.ts';

type AmountFields = Pick<PendingScanToStore, 'quantityUnitId'> & {
  amount: number;
};

// The product facts of the amount rule, with the resolved conversions of the
// product.
export type ConsumeAmountProduct = Pick<
  ProductDetails,
  'consumeUnitId' | 'quickConsumeAmount'
> &
  StockUnit;

// Grocy stores the quick consume amount in the stock unit. The Grocy consume
// form shows it in the unit of the row, the consume unit when the row has the
// empty unit, as `quick_consume_amount * qu_factor`. With no resolved
// conversion to that unit, the row takes the amount in the stock unit.
function quickConsumeAmountOf(
  product: ConsumeAmountProduct,
  quantityUnitId: null | number,
): AmountFields {
  const factor = stockFactorOf(
    quantityUnitId ?? product.consumeUnitId,
    product,
  );
  return factor === null
    ? {
        amount: product.quickConsumeAmount,
        quantityUnitId: product.stockUnitId,
      }
    : { amount: product.quickConsumeAmount / factor, quantityUnitId };
}

// This function returns the amount and the unit of a new Consume pending
// scan, as the Grocy consume form sets them. The body wins. Then the product
// barcode amount and unit apply. With no amount from either, the Grocy user
// setting for the default consume amount applies, in the unit of the body or
// the product barcode, else in the consume unit (the empty unit). When the
// Grocy user setting for the quick consume amount is on, the quick consume
// amount of the product replaces the default, converted to the unit of the
// row.
export function consumeAmountOf(
  body: Pick<CreatePendingScan, 'amount' | 'quantityUnitId'>,
  barcode: Pick<ProductBarcode, 'amount' | 'quantityUnitId'>,
  product: ConsumeAmountProduct | null,
  settings: ConsumeSettings,
): AmountFields {
  const quantityUnitId = body.quantityUnitId ?? barcode.quantityUnitId;
  const amount = body.amount ?? barcode.amount;
  if (amount !== null) {
    return { amount, quantityUnitId };
  }
  if (product !== null && settings.useQuickConsumeAmount) {
    return quickConsumeAmountOf(product, quantityUnitId);
  }
  return { amount: settings.defaultConsumeAmount, quantityUnitId };
}
