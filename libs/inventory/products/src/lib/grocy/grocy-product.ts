import { z } from 'zod';

// One product as the Grocy objects endpoint returns it, with the fields that
// the product list reads. The fields come from the Grocy 4.7.1 OpenAPI
// document. Grocy returns a number as a JSON string in many places, so the
// schema coerces the id. The schema is loose, because a product has more
// fields than the list reads. It is temporary. Grocy Next replaces Grocy and
// builds its own entity model.
const grocyProductRowSchema = z.looseObject({
  description: z.string().nullable(),
  id: z.coerce.number(),
  name: z.string(),
});

export const grocyProductRowsSchema = z.array(grocyProductRowSchema);
