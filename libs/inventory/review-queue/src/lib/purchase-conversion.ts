import type { QuantityUnitConversion } from '@grocy-next/inventory-products';

import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';

import type { PriceType } from './pending-scan.ts';

// The amount and the price of a Purchase pending scan as entered: the amount
// in the scanned unit, or in the purchase unit when the unit is null, and
// the price as a unit price or a total price.
export interface EnteredPurchase {
  amount: number;
  price: null | number;
  priceType: PriceType;
  quantityUnitId: null | number;
}

// The units of the product and the resolved conversions between them.
export interface ProductUnits {
  conversions: QuantityUnitConversion[];
  purchaseUnitId: number;
  stockUnitId: number;
}

// The amount in the stock unit and the price per stock unit, as the Grocy
// purchase takes them.
export interface StockUnitPurchase {
  amount: number;
  price: null | number;
}

// The factor from the scanned unit to the stock unit. The stock unit
// converts to itself with factor 1. Any other unit needs a resolved
// conversion to the stock unit. None is the no-conversion problem.
function factorOf(unitId: number, product: ProductUnits): number {
  if (unitId === product.stockUnitId) {
    return 1;
  }
  const conversion = product.conversions.find((row) => {
    return (
      row.fromQuantityUnitId === unitId &&
      row.toQuantityUnitId === product.stockUnitId
    );
  });
  if (conversion === undefined) {
    throw new ProblemException(
      PROBLEM_TYPES.noConversion,
      `The product has no conversion from the quantity unit ${String(unitId)} to the stock unit ${String(product.stockUnitId)}.`,
    );
  }
  return conversion.factor;
}

// This function converts the entered amount and price of a Purchase pending
// scan to the stock unit, as ADR 0010 decided. The empty unit is the
// purchase unit. The stock amount is the entered amount times the factor
// of the scanned unit. A unit price divides by that factor. A total price
// divides by the stock amount.
export function toStockUnit(
  entered: EnteredPurchase,
  product: ProductUnits,
): StockUnitPurchase {
  const factor = factorOf(
    entered.quantityUnitId ?? product.purchaseUnitId,
    product,
  );
  const amount = entered.amount * factor;
  if (entered.price === null) {
    return { amount, price: null };
  }
  const price =
    entered.priceType === 'unit'
      ? entered.price / factor
      : entered.price / amount;
  return { amount, price };
}
