import { z } from 'zod';

import type { StockLogRow } from '../stock-log-row.ts';

import { grocyNumber } from './grocy-answers.ts';

const grocyNullableNumber = grocyNumber.nullable();

// One stock log row of Grocy 4.7.1, as a booking call returns it. The schema
// is loose, because Grocy returns more fields than the client reads. Grocy
// writes `stock_row_id` on a stock edit and not on a purchase.
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

const grocyStockLogRowsSchema = z.array(grocyStockLogRowSchema);

// The stock log rows of a booking answer, as the result of the booking.
export function stockLogRowsOf(data: unknown): { rows: StockLogRow[] } {
  return { rows: toStockLogRows(grocyStockLogRowsSchema.parse(data)) };
}

function toStockLogRows(
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
