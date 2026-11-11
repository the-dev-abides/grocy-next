import { z } from 'zod';

import type { StockEntry } from '../product.ts';

// Grocy returns a number as a JSON string in many places. The schema
// coerces every number and keeps null.
const grocyNumber = z.coerce.number();
const grocyNullableNumber = grocyNumber.nullable();

// One row of the Grocy view `stock_next_use`, as the stock entries call of
// Grocy 4.7.1 answers it. The view sorts the rows in the consume order. The
// stock entries at the default consume location of the product come first. Then
// come the open stock entries, then the earliest due date, then the earliest
// purchase date. The open flag is 0 or 1. The schema is loose, because the row
// carries more fields than the client reads.
const grocyStockEntrySchema = z.looseObject({
  amount: grocyNumber,
  best_before_date: z.string().nullable(),
  id: grocyNumber,
  location_id: grocyNullableNumber,
  open: grocyNumber,
  purchased_date: z.string().nullable(),
});

export const grocyStockEntriesSchema = z.array(grocyStockEntrySchema);

// The stock entries in the order of the rows, which is the Grocy consume
// order.
export function toStockEntries(
  rows: z.infer<typeof grocyStockEntriesSchema>,
): StockEntry[] {
  return rows.map((row) => {
    return {
      amount: row.amount,
      dueDate: row.best_before_date,
      id: row.id,
      locationId: row.location_id,
      open: row.open !== 0,
      purchasedDate: row.purchased_date,
    };
  });
}
