import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// The booking type of a pending scan says which booking the accept makes.
// The scan screen sets it at create.
export const BOOKING_TYPES = ['inventory', 'purchase'] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

// The price of a pending scan is stored as entered, with its price type.
// A barcode last price enters as a total price.
const PRICE_TYPES = ['total', 'unit'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

// The lookup result of ADR 0010: the fixed set of fields that the online
// lookup returned for a code that no product barcode matched. The lookup
// worker of a later ticket stores it.
const lookupResultSchema = z
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

// One pending scan in the Next API, with every field of ADR 0010. Every
// field is present in every response. An unset optional field is null.
const pendingScanSchema = z
  .strictObject({
    amount: z.number().nullable().meta({
      description:
        'The amount. Purchase: in the unit quantityUnitId, or the purchase unit of the product. Inventory: the new own stock in the stock unit.',
    }),
    bookingType: z
      .enum(BOOKING_TYPES)
      .meta({ description: 'The booking that the accept makes.' }),
    code: z.string().nullable().meta({
      description:
        'The code as scanned or typed, or null for a row from the assistant.',
    }),
    createdAt: z.iso
      .datetime()
      .meta({ description: 'The time of the create, in UTC.' }),
    dueDate: z.iso.date().nullable().meta({
      description: 'The due date, or null for the Grocy product default.',
    }),
    error: z.string().nullable().meta({
      description: 'The Grocy message of the last failed accept, or null.',
    }),
    id: z.int().meta({ description: 'The id of the pending scan.' }),
    lastLookupAt: z.iso.datetime().nullable().meta({
      description: 'The time of the last lookup attempt, in UTC, or null.',
    }),
    locationId: z
      .int()
      .nullable()
      .meta({ description: 'The id of the location.' }),
    lookupResult: lookupResultSchema
      .nullable()
      .meta({ description: 'The lookup result, or null.' }),
    note: z.string().nullable().meta({ description: 'The note.' }),
    price: z.number().nullable().meta({ description: 'The price as entered.' }),
    priceType: z
      .enum(PRICE_TYPES)
      .meta({ description: 'Whether the price is per unit or in total.' }),
    productBarcodeId: z.int().nullable().meta({
      description:
        'The id of the product barcode that an update added in Grocy, or null.',
    }),
    productGroupId: z
      .int()
      .nullable()
      .meta({ description: 'The id of the product group of a new product.' }),
    productId: z
      .int()
      .nullable()
      .meta({ description: 'The id of the product, or null.' }),
    quantityUnitId: z.int().nullable().meta({
      description: 'The id of the quantity unit of the amount. Purchase only.',
    }),
    scannedAt: z.iso
      .datetime()
      .meta({ description: 'The time of the scan, in UTC.' }),
    storeId: z.int().nullable().meta({ description: 'The id of the store.' }),
    updatedAt: z.iso
      .datetime()
      .meta({ description: 'The time of the last change, in UTC.' }),
    writeInName: z.string().nullable().meta({
      description: 'The product name that the user typed on the scan screen.',
    }),
  })
  .meta({ id: 'PendingScan' });

// The list is an `items` envelope and nothing else, as ADR 0014 decided.
const pendingScanListSchema = z.strictObject({
  items: z
    .array(pendingScanSchema)
    .meta({ description: 'Every pending scan, most recent first.' }),
});

// The create body. It carries a code or a product or both, the booking
// type, and the optional defaults of the scan screen. An absent optional
// field means unset, as ADR 0014 decided.
const pendingScanBodySchema = z
  .strictObject({
    amount: z.number().optional().meta({ description: 'The amount.' }),
    bookingType: z
      .enum(BOOKING_TYPES)
      .meta({ description: 'The booking that the accept makes.' }),
    code: z
      .string()
      .min(1)
      .optional()
      .meta({ description: 'The code as scanned or typed.' }),
    dueDate: z.iso.date().optional().meta({ description: 'The due date.' }),
    locationId: z
      .int()
      .positive()
      .optional()
      .meta({ description: 'The id of the location.' }),
    note: z.string().optional().meta({ description: 'The note.' }),
    price: z.number().optional().meta({ description: 'The price as entered.' }),
    priceType: z
      .enum(PRICE_TYPES)
      .optional()
      .meta({ description: 'Whether the price is per unit or in total.' }),
    productGroupId: z
      .int()
      .positive()
      .optional()
      .meta({ description: 'The id of the product group of a new product.' }),
    productId: z
      .int()
      .positive()
      .optional()
      .meta({ description: 'The id of the product.' }),
    quantityUnitId: z.int().positive().optional().meta({
      description: 'The id of the quantity unit of the amount. Purchase only.',
    }),
    storeId: z
      .int()
      .positive()
      .optional()
      .meta({ description: 'The id of the store.' }),
    writeInName: z.string().optional().meta({
      description: 'The product name that the user typed on the scan screen.',
    }),
  })
  .refine((body) => body.code !== undefined || body.productId !== undefined, {
    message: 'The body needs a code or a productId.',
    path: ['code'],
  });

// The update body: a JSON merge patch (RFC 7396) on the writable fields, as
// ADR 0014 decided. An absent field stays as it is. A field set to null
// clears it. The booking type is in the body so that a client can send the
// row back, but the update refuses a change of it.
const pendingScanUpdateSchema = z.strictObject({
  amount: z.number().nullable().optional().meta({ description: 'The amount.' }),
  bookingType: z.enum(BOOKING_TYPES).optional().meta({
    description: 'The booking that the accept makes. Set at create.',
  }),
  code: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .meta({ description: 'The code as scanned or typed.' }),
  dueDate: z.iso
    .date()
    .nullable()
    .optional()
    .meta({ description: 'The due date.' }),
  locationId: z
    .int()
    .positive()
    .nullable()
    .optional()
    .meta({ description: 'The id of the location.' }),
  note: z.string().nullable().optional().meta({ description: 'The note.' }),
  price: z
    .number()
    .nullable()
    .optional()
    .meta({ description: 'The price as entered.' }),
  priceType: z
    .enum(PRICE_TYPES)
    .optional()
    .meta({ description: 'Whether the price is per unit or in total.' }),
  productGroupId: z
    .int()
    .positive()
    .nullable()
    .optional()
    .meta({ description: 'The id of the product group of a new product.' }),
  productId: z
    .int()
    .positive()
    .nullable()
    .optional()
    .meta({ description: 'The id of the product.' }),
  quantityUnitId: z.int().positive().nullable().optional().meta({
    description: 'The id of the quantity unit of the amount. Purchase only.',
  }),
  storeId: z
    .int()
    .positive()
    .nullable()
    .optional()
    .meta({ description: 'The id of the store.' }),
  writeInName: z.string().nullable().optional().meta({
    description: 'The product name that the user typed on the scan screen.',
  }),
});

// The path parameter of a read. The id arrives as text and becomes an
// integer.
const pendingScanIdSchema = z.strictObject({
  id: z.coerce
    .number()
    .int()
    .positive()
    .meta({ description: 'The id of the pending scan.' }),
});

// The DTO classes carry the schemas into the OpenAPI document and the
// validation pipe. The class name is the schema name in the document.
export class PendingScan extends createZodDto(pendingScanSchema) {}
export class PendingScanList extends createZodDto(pendingScanListSchema) {}
export class CreatePendingScan extends createZodDto(pendingScanBodySchema) {}
export class UpdatePendingScan extends createZodDto(pendingScanUpdateSchema) {}
export class PendingScanId extends createZodDto(pendingScanIdSchema) {}
