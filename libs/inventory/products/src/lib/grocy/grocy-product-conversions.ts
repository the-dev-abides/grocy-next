import { z } from 'zod';

import type { ProductConversion } from '../product-conversion.ts';

import { grocyNumber } from './grocy-answers.ts';

// One row of the Grocy table `quantity_unit_conversions` that belongs to
// one product. The schema is loose, because the row carries more fields
// than the client reads.
const grocyProductConversionSchema = z.looseObject({
  factor: grocyNumber,
  from_qu_id: grocyNumber,
  id: grocyNumber,
  to_qu_id: grocyNumber,
});

export const grocyProductConversionsSchema = z.array(
  grocyProductConversionSchema,
);

export function toProductConversions(
  rows: z.infer<typeof grocyProductConversionsSchema>,
): ProductConversion[] {
  return rows.map((row) => {
    return {
      factor: row.factor,
      fromQuantityUnitId: row.from_qu_id,
      id: row.id,
      toQuantityUnitId: row.to_qu_id,
    };
  });
}
