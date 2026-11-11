import { z } from 'zod';

import type { ProductConversion } from '../product-conversion.ts';

// Grocy returns a number as a JSON string in many places. The schema
// coerces every number.
const grocyNumber = z.coerce.number();

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

// The Grocy body of a product conversion create, as the Grocy API names the
// fields.
export interface GrocyProductConversionBody {
  factor: number;
  from_qu_id: number;
  product_id: number;
  to_qu_id: number;
}

export function toGrocyProductConversionBody(
  conversion: Omit<ProductConversion, 'id'>,
  productId: number,
): GrocyProductConversionBody {
  return {
    factor: conversion.factor,
    from_qu_id: conversion.fromQuantityUnitId,
    product_id: productId,
    to_qu_id: conversion.toQuantityUnitId,
  };
}
