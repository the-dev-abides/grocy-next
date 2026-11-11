import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// One product in the Next API. A product is a thing that the household
// stocks. The Next API owns this shape. The fields match Grocy today and can
// change when Grocy Next builds its own entity model. The schema is strict,
// so a response carries these fields and nothing else.
const productSchema = z
  .strictObject({
    description: z.string().nullable().meta({
      description: 'The description of the product, or null when it has none.',
    }),
    id: z.int().meta({ description: 'The id of the product.' }),
    name: z.string().meta({ description: 'The name of the product.' }),
  })
  .meta({ id: 'Product' });

// The product list is an `items` envelope and nothing else, as ADR 0014
// decided. A full list has no cut-off.
const productListSchema = z.strictObject({
  items: z.array(productSchema).meta({ description: 'Every product.' }),
});

// The DTO classes carry the schemas into the OpenAPI document and the
// validation pipe. The class name is the schema name in the document.
export class Product extends createZodDto(productSchema) {}
export class ProductList extends createZodDto(productListSchema) {}
