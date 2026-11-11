import type { QuantityUnitConversion } from './product.ts';

// One stored conversion row of one product: a factor from one quantity unit to
// another with the id of the row in Grocy. For each pair of different units of
// a new product, the Grocy trigger creates one such row with factor 1. The
// product create sets the factor of the form on it.
export interface ProductConversion extends QuantityUnitConversion {
  id: number;
}

// This function returns the conversion row from the purchase unit to the
// stock unit, or null when the product has none. The Grocy trigger creates
// no row when a conversion of the household already resolves the pair, so
// the product create then adds the row itself.
export function purchaseToStockRowOf(
  rows: readonly ProductConversion[],
  units: { purchaseUnitId: number; stockUnitId: number },
): null | ProductConversion {
  const row = rows.find((candidate) => {
    return (
      candidate.fromQuantityUnitId === units.purchaseUnitId &&
      candidate.toQuantityUnitId === units.stockUnitId
    );
  });
  return row ?? null;
}
