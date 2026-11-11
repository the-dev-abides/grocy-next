import { z } from 'zod';

import type { QuantityUnitConversion } from '../product.ts';

// Grocy returns a number as a JSON string in many places. The schema
// coerces every number.
const grocyNumber = z.coerce.number();

// One row of the Grocy view `quantity_unit_conversions_resolved`: the factor
// from one quantity unit to another for one product, with the path of units
// between them. The schema is loose, because the row carries the unit names
// too, and the client does not read them.
const grocyConversionSchema = z.looseObject({
  factor: grocyNumber,
  from_qu_id: grocyNumber,
  to_qu_id: grocyNumber,
});

export const grocyConversionsSchema = z.array(grocyConversionSchema);

export function toConversions(
  rows: z.infer<typeof grocyConversionsSchema>,
): QuantityUnitConversion[] {
  return rows.map((row) => {
    return {
      factor: row.factor,
      fromQuantityUnitId: row.from_qu_id,
      toQuantityUnitId: row.to_qu_id,
    };
  });
}
