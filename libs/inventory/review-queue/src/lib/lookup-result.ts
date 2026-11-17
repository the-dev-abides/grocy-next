import { z } from 'zod';

// The lookup result of ADR 0010: the fixed set of fields that the online
// lookup returned for a code that no product barcode matched. The lookup
// worker of a later ticket stores it.
export const lookupResultSchema = z
  .strictObject({
    brand: z.string().nullable().meta({ description: 'The brand.' }),
    imageUrl: z
      .string()
      .nullable()
      .meta({ description: 'The URL of the front image.' }),
    name: z.string().meta({ description: 'The product name.' }),
    netQuantity: z
      .number()
      .nullable()
      .meta({ description: 'The net quantity in the net quantity unit.' }),
    netQuantityUnit: z
      .string()
      .nullable()
      .meta({ description: 'The unit of the net quantity, g or ml.' }),
    // A row that the lookup filled before this field existed has no package
    // shapes, so the field defaults to an empty list.
    packageShapes: z.array(z.string()).default([]).meta({
      description:
        'The shapes of the packaging components, as Open Facts taxonomy ids such as en:bag.',
    }),
    quantityText: z
      .string()
      .nullable()
      .meta({ description: 'The quantity text as printed on the label.' }),
    service: z
      .string()
      .meta({ description: 'The name of the service that held the product.' }),
    sourceUrl: z.string().meta({
      description: 'The URL of the product page, for the attribution.',
    }),
  })
  .meta({ id: 'LookupResult' });

export type LookupResult = z.infer<typeof lookupResultSchema>;
