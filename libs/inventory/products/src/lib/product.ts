import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// The fields of a product that the list and the read share. A product is a
// thing that the household stocks. The Next API owns this shape. The fields
// match Grocy today and can change when Grocy Next builds its own entity
// model.
const productFields = {
  description: z.string().nullable().meta({
    description: 'The description of the product, or null when it has none.',
  }),
  id: z.int().meta({ description: 'The id of the product.' }),
  name: z.string().meta({ description: 'The name of the product.' }),
};

// One item of the product list. The list carries the id, the name, and the
// description only, as the spec decided.
const productListItemSchema = z
  .strictObject(productFields)
  .meta({ id: 'ProductListItem' });

// One product in the Next API, the resource of the product read and of the
// product create. It carries the fields that the short product form sets
// and the facts that the scan screens and the review queue need at display
// time. A later ticket widens it with the stock entries, the conversions,
// the parent flag, and the tare weight. The schema is strict, so a response
// carries these fields and nothing else.
const productSchema = z
  .strictObject({
    ...productFields,
    defaultDueDays: z.int().meta({
      description:
        'The default due days of a new stock entry. 0 means no due date, and -1 means never overdue.',
    }),
    hasPicture: z.boolean().meta({
      description: 'Whether the product has a picture.',
    }),
    locationId: z
      .int()
      .nullable()
      .meta({ description: 'The id of the default location.' }),
    minStockAmount: z
      .number()
      .meta({ description: 'The minimum stock amount in the stock unit.' }),
    productGroupId: z
      .int()
      .nullable()
      .meta({ description: 'The id of the product group, or null.' }),
    purchaseToStockFactor: z.number().meta({
      description:
        'The factor from the purchase unit to the stock unit. One purchase unit is this many stock units.',
    }),
    purchaseUnitId: z
      .int()
      .meta({ description: 'The id of the purchase quantity unit.' }),
    stockAmount: z.number().meta({
      description: 'The own stock of the product in the stock unit.',
    }),
    stockUnitId: z
      .int()
      .meta({ description: 'The id of the stock quantity unit.' }),
  })
  .meta({ id: 'Product' });

// The product list is an `items` envelope and nothing else, as ADR 0014
// decided. A full list has no cut-off.
const productListSchema = z.strictObject({
  items: z.array(productListItemSchema).meta({ description: 'Every product.' }),
});

// The path parameter of a read. The id arrives as text and becomes an
// integer.
const productIdSchema = z.strictObject({
  id: z.coerce
    .number()
    .int()
    .positive()
    .meta({ description: 'The id of the product.' }),
});

export type ProductListItem = z.infer<typeof productListItemSchema>;

// The DTO classes carry the schemas into the OpenAPI document and the
// validation pipe. The class name is the schema name in the document. The
// list item enters the document through its meta id.
export class Product extends createZodDto(productSchema) {}
export class ProductList extends createZodDto(productListSchema) {}
export class ProductId extends createZodDto(productIdSchema) {}
