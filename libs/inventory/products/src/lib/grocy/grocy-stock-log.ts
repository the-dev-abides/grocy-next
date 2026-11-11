import { z } from 'zod';

import type { StockLogRow } from '../stock-log-row.ts';

// Grocy returns a number as a JSON string in many places. The schema
// coerces every number and keeps null.
const grocyNumber = z.coerce.number();
const grocyNullableNumber = grocyNumber.nullable();

// One stock log row of Grocy 4.7.1, as a booking call returns it. The schema is loose, because Grocy returns more fields than the client reads.
// The field `stock_row_id` is the row id of the stock entry on a stock edit
// and null on a purchase.
const grocyStockLogRowSchema = z.looseObject({
  amount: grocyNumber,
  best_before_date: z.string().nullable(),
  id: grocyNumber,
  location_id: grocyNullableNumber,
  note: z.string().nullable(),
  price: grocyNullableNumber,
  purchased_date: z.string().nullable(),
  shopping_location_id: grocyNullableNumber,
  stock_row_id: grocyNullableNumber,
  transaction_id: z.string(),
  transaction_type: z.string(),
});

export const grocyStockLogRowsSchema = z.array(grocyStockLogRowSchema);

export function toStockLogRows(
  rows: z.infer<typeof grocyStockLogRowsSchema>,
): StockLogRow[] {
  return rows.map((row) => {
    return {
      amount: row.amount,
      dueDate: row.best_before_date,
      id: row.id,
      locationId: row.location_id,
      note: row.note,
      price: row.price,
      purchasedDate: row.purchased_date,
      stockEntryId: row.stock_row_id,
      storeId: row.shopping_location_id,
      transactionId: row.transaction_id,
      transactionType: row.transaction_type,
    };
  });
}
