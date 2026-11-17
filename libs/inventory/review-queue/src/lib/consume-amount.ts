import type {
  ConsumeSettings,
  ProductBarcode,
  ProductDetails,
} from '@grocy-next/inventory-products';

import type { CreatePendingScan } from './pending-scan.ts';
import type { PendingScanToStore } from './storage/stored-pending-scan.ts';

type AmountFields = Pick<PendingScanToStore, 'quantityUnitId'> & {
  amount: number;
};

// This function returns the amount and the unit of a new Consume pending
// scan, as the Grocy consume form sets them. The body wins. Then the product
// barcode amount and unit apply. With no amount from either, the Grocy user
// setting for the default consume amount applies, in the unit of the body or
// the product barcode, else in the consume unit (the empty unit). When the
// Grocy user setting for the quick consume amount is on, the quick consume
// amount of the product replaces the default. Grocy stores the quick consume
// amount in the stock unit, so the row then gets the stock unit.
export function consumeAmountOf(
  body: Pick<CreatePendingScan, 'amount' | 'quantityUnitId'>,
  barcode: Pick<ProductBarcode, 'amount' | 'quantityUnitId'>,
  product: null | Pick<ProductDetails, 'quickConsumeAmount' | 'stockUnitId'>,
  settings: ConsumeSettings,
): AmountFields {
  const quantityUnitId = body.quantityUnitId ?? barcode.quantityUnitId;
  const amount = body.amount ?? barcode.amount;
  if (amount !== null) {
    return { amount, quantityUnitId };
  }
  if (product !== null && settings.useQuickConsumeAmount) {
    return {
      amount: product.quickConsumeAmount,
      quantityUnitId: product.stockUnitId,
    };
  }
  return { amount: settings.defaultConsumeAmount, quantityUnitId };
}
