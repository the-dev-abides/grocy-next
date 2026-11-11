import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { BOOKING_TYPES } from './pending-scan.ts';

// One Grocy stock log row mapped to Next API fields, as ADR 0014 decided.
// The amount is in the stock unit. The stock entry id is null when Grocy
// did not write it, which is the case on a purchase.
const stockLogRowSchema = z
  .strictObject({
    amount: z.number().meta({ description: 'The amount in the stock unit.' }),
    dueDate: z.iso
      .date()
      .nullable()
      .meta({ description: 'The due date of the stock entry.' }),
    id: z.int().meta({ description: 'The id of the booking in Grocy.' }),
    locationId: z
      .int()
      .nullable()
      .meta({ description: 'The id of the location.' }),
    note: z.string().nullable().meta({ description: 'The note.' }),
    price: z
      .number()
      .nullable()
      .meta({ description: 'The price per stock unit.' }),
    purchasedDate: z.iso
      .date()
      .nullable()
      .meta({ description: 'The purchase date.' }),
    stockEntryId: z.int().nullable().meta({
      description: 'The id of the stock entry, when Grocy wrote it.',
    }),
    storeId: z.int().nullable().meta({ description: 'The id of the store.' }),
    transactionType: z
      .string()
      .meta({ description: 'The Grocy transaction type.' }),
  })
  .meta({ id: 'StockLogRow' });

export type StockLogRowItem = z.infer<typeof stockLogRowSchema>;

// The booking resource: the result of one accept, with the stock log rows
// of the Grocy transaction. The transaction id is null and the list is
// empty when the accept found no change.
const bookingSchema = z
  .strictObject({
    bookings: z
      .array(stockLogRowSchema)
      .meta({ description: 'The stock log rows of the transaction.' }),
    bookingType: z
      .enum(BOOKING_TYPES)
      .meta({ description: 'The booking that the accept made.' }),
    pendingScanId: z
      .int()
      .meta({ description: 'The id of the accepted pending scan.' }),
    productId: z.int().meta({ description: 'The id of the product.' }),
    transactionId: z.string().nullable().meta({
      description: 'The id of the Grocy transaction, or null on no change.',
    }),
  })
  .meta({ id: 'Booking' });

// The body of an accept names one pending scan.
const bookingBodySchema = z.strictObject({
  pendingScanId: z
    .int()
    .positive()
    .meta({ description: 'The id of the pending scan to accept.' }),
});

// The DTO classes carry the schemas into the OpenAPI document and the
// validation pipe. The class name is the schema name in the document.
export class Booking extends createZodDto(bookingSchema) {}
export class CreateBooking extends createZodDto(bookingBodySchema) {}
