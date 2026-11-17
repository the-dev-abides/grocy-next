import type { GrocyRefusal } from '@grocy-next/shared-next-api';

// One stock log row of Grocy mapped to Next API fields: one booking that Grocy
// recorded. The amount is in the stock unit. The stock entry id is the row id
// of the stock entry when Grocy wrote it. Grocy writes it on a stock edit and
// not on a purchase. The transaction id is the text id that every booking of
// one stock action shares. The product id and the stock id name the stock
// entry that the booking changed. The stock id is the Grocy `stock_id` text.
// The open on consume reads them. The Next API does not show them. The
// spoiled flag is true on the booking of a spoiled consume.
export interface StockLogRow {
  amount: number;
  dueDate: null | string;
  id: number;
  locationId: null | number;
  note: null | string;
  price: null | number;
  productId: number;
  purchasedDate: null | string;
  spoiled: boolean;
  stockEntryId: null | number;
  stockId: string;
  storeId: null | number;
  transactionId: string;
  transactionType: string;
}

// The result of a booking: the stock log rows of the new transaction, or
// the refusal that Grocy answered with 400.
export type BookingResult =
  | { grocy: GrocyRefusal; isRefused: true }
  | { isRefused: false; rows: StockLogRow[] };
