import { z } from 'zod';

import type { QuantityUnitConversion } from '../product.ts';

import { grocyNumber } from './grocy-answers.ts';

// One row of the Grocy table `quantity_unit_conversions`. A household
// conversion has no product. The schema is loose, because the row carries
// more fields than the client reads.
const grocyConversionRowSchema = z.looseObject({
  factor: grocyNumber,
  from_qu_id: grocyNumber,
  product_id: grocyNumber.nullable(),
  to_qu_id: grocyNumber,
});

export const grocyConversionRowsSchema = z.array(grocyConversionRowSchema);

// This function keeps the household conversions, the rows with no product,
// and returns each one as the factor from one quantity unit to another.
export function toHouseholdConversions(
  rows: z.infer<typeof grocyConversionRowsSchema>,
): QuantityUnitConversion[] {
  return rows
    .filter((row) => row.product_id === null)
    .map((row) => {
      return {
        factor: row.factor,
        fromQuantityUnitId: row.from_qu_id,
        toQuantityUnitId: row.to_qu_id,
      };
    });
}
