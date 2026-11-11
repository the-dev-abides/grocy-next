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

// One stock entry of a product: one amount of the product in stock, with
// its own due date, purchase date, location, and open state. The amount is
// in the stock unit.
const stockEntrySchema = z
  .strictObject({
    amount: z.number().meta({ description: 'The amount in the stock unit.' }),
    dueDate: z.iso
      .date()
      .nullable()
      .meta({ description: 'The due date of the stock entry.' }),
    id: z.int().meta({ description: 'The id of the stock entry.' }),
    locationId: z
      .int()
      .nullable()
      .meta({ description: 'The id of the location.' }),
    open: z.boolean().meta({ description: 'Whether the stock entry is open.' }),
    purchasedDate: z.iso
      .date()
      .nullable()
      .meta({ description: 'The purchase date.' }),
  })
  .meta({ id: 'StockEntry' });

// One resolved conversion of a product: the factor from one quantity unit
// to another. An amount in the from unit times the factor is the amount in
// the to unit.
const quantityUnitConversionSchema = z
  .strictObject({
    factor: z.number().meta({
      description:
        'One from unit is this many to units. An amount in the from unit times the factor is the amount in the to unit.',
    }),
    fromQuantityUnitId: z
      .int()
      .meta({ description: 'The id of the from quantity unit.' }),
    toQuantityUnitId: z
      .int()
      .meta({ description: 'The id of the to quantity unit.' }),
  })
  .meta({ id: 'QuantityUnitConversion' });

// One product in the Next API, the resource of the product read and of the
// product create. It carries the fields that the short product form sets
// and the facts that the scan screens and the review queue need at display
// time: the own stock, the stock entries in the Grocy consume order, the
// resolved conversions, the parent flag, and the tare weight. The schema is
// strict, so a response carries these fields and nothing else.
const productSchema = z
  .strictObject({
    ...productFields,
    conversions: z.array(quantityUnitConversionSchema).meta({
      description: 'The resolved conversions of the product.',
    }),
    defaultDueDays: z.int().meta({
      description:
        'The default due days of a new stock entry. 0 means no due date, and -1 means never overdue.',
    }),
    hasPicture: z.boolean().meta({
      description: 'Whether the product has a picture.',
    }),
    isParent: z.boolean().meta({
      description:
        'Whether the product is a parent product. The stock amount of a parent product is its own stock only.',
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
    stockEntries: z.array(stockEntrySchema).meta({
      description:
        'The stock entries of the product in the Grocy consume order: the default consume location first, then open entries, then the earliest due date, then the earliest purchase date.',
    }),
    stockUnitId: z
      .int()
      .meta({ description: 'The id of the stock quantity unit.' }),
    tareWeight: z.number().nullable().meta({
      description:
        'The tare weight in the stock unit, or null when tare weight handling is off. The count of a tare weight product is a gross weight.',
    }),
  })
  .meta({ id: 'Product' });

// The product list is an `items` envelope and nothing else, as ADR 0014
// decided. A full list has no cut-off.
const productListSchema = z.strictObject({
  items: z.array(productListItemSchema).meta({ description: 'Every product.' }),
});

// The path parameter of a read. The id arrives as text and becomes an integer.
const productIdSchema = z.strictObject({
  id: z.coerce
    .number()
    .int()
    .positive()
    .meta({ description: 'The id of the product.' }),
});

// The body of the short product form. Grocy requires the name, the
// location, and the two units. Every other field is optional, and an absent
// field means unset, as ADR 0014 decided: no description, no product group,
// the factor 1, no due date rule, and no minimum stock. The product has no
// conversion row when the purchase unit is the stock unit, so the factor is
// then 1.
const productFormSchema = z
  .strictObject({
    defaultDueDays: z.int().min(-1).default(0).meta({
      description:
        'The default due days of a new stock entry. 0 means no due date, and -1 means never overdue.',
    }),
    description: z
      .string()
      .optional()
      .meta({ description: 'The description of the product.' }),
    locationId: z
      .int()
      .positive()
      .meta({ description: 'The id of the default location.' }),
    minStockAmount: z
      .number()
      .min(0)
      .default(0)
      .meta({ description: 'The minimum stock amount in the stock unit.' }),
    name: z.string().min(1).meta({ description: 'The name of the product.' }),
    productGroupId: z
      .int()
      .positive()
      .optional()
      .meta({ description: 'The id of the product group.' }),
    purchaseToStockFactor: z.number().positive().default(1).meta({
      description:
        'The factor from the purchase unit to the stock unit. One purchase unit is this many stock units.',
    }),
    purchaseUnitId: z
      .int()
      .positive()
      .meta({ description: 'The id of the purchase quantity unit.' }),
    stockUnitId: z
      .int()
      .positive()
      .meta({ description: 'The id of the stock quantity unit.' }),
  })
  .refine(
    (body) => {
      return (
        body.purchaseUnitId !== body.stockUnitId ||
        body.purchaseToStockFactor === 1
      );
    },
    {
      message: 'must be 1 when the purchase unit is the stock unit',
      path: ['purchaseToStockFactor'],
    },
  );

export type ProductListItem = z.infer<typeof productListItemSchema>;
export type QuantityUnitConversion = z.infer<
  typeof quantityUnitConversionSchema
>;
export type StockEntry = z.infer<typeof stockEntrySchema>;

// The DTO classes carry the schemas into the OpenAPI document and the
// validation pipe. The class name is the schema name in the document. The
// list item enters the document through its meta id.
export class Product extends createZodDto(productSchema) {}
export class CreateProduct extends createZodDto(productFormSchema) {}
export class ProductList extends createZodDto(productListSchema) {}
export class ProductId extends createZodDto(productIdSchema) {}
