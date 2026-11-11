import type { GrocyRefusal } from '@grocy-next/shared-next-api';

import { PROBLEM_TYPES, ProblemException } from '@grocy-next/shared-next-api';
import { z } from 'zod';

// The answers of Grocy as the Grocy client reads them.
// This file holds the answer of one call, the shapes that the writes share, and the tables that the client writes rows into.
// It also holds the problems of ADR 0014 that a refusal becomes.

// The answer of one Grocy call: the body that Grocy answered, or the
// refusal when Grocy answered 400 with `{"error_message": ...}`. Every other
// failure is the grocy-unavailable problem of ADR 0014 and does not come
// back as an answer.
export type GrocyAnswer =
  { data: null; grocy: GrocyRefusal } | { data: unknown; grocy: null };

// The body of a Grocy refusal: 400 with the error message.
export const grocyErrorSchema = z.looseObject({ error_message: z.string() });
// The answer of a Grocy object create: the id of the new row.
const grocyCreatedSchema = z.looseObject({
  created_object_id: z.coerce.number(),
});

export function createdIdOf(data: unknown): { id: number } {
  return { id: grocyCreatedSchema.parse(data).created_object_id };
}

// The result of a Grocy object create: the id of the new row, or the refusal
// that Grocy answered with 400.
export type CreatedObjectResult =
  { grocy: GrocyRefusal; isRefused: true } | { id: number; isRefused: false };

// The Grocy tables that the client writes rows into.
export type GrocyWritableTable =
  'product_barcodes' | 'products' | 'quantity_unit_conversions';

// A Grocy refusal as the grocy-refused problem of ADR 0014.
export function grocyRefused(grocy: GrocyRefusal): ProblemException {
  return new ProblemException(PROBLEM_TYPES.grocyRefused, grocy.message, {
    grocy,
  });
}

// The body of an answer. A refusal is the grocy-refused problem.
export function dataOf(answer: GrocyAnswer): unknown {
  if (answer.grocy !== null) {
    throw grocyRefused(answer.grocy);
  }
  return answer.data;
}

// The result of a create or a booking: the refusal, or the value that the
// caller takes out of the body.
export function resultOf<Result>(
  answer: GrocyAnswer,
  valueOf: (data: unknown) => Result,
): (Result & { isRefused: false }) | { grocy: GrocyRefusal; isRefused: true } {
  return answer.grocy === null
    ? { ...valueOf(answer.data), isRefused: false }
    : { grocy: answer.grocy, isRefused: true };
}
