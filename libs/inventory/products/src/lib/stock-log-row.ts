// One stock log row of Grocy mapped to Next API fields: one booking that
// Grocy recorded. The amount is in the stock unit. The stock entry id is
// the row id of the stock entry when Grocy wrote it, which Grocy does on a
// stock edit and not on a purchase. The transaction id is the text id that
// every booking of one stock action shares.
export interface StockLogRow {
  amount: number;
  dueDate: null | string;
  id: number;
  locationId: null | number;
  note: null | string;
  price: null | number;
  purchasedDate: null | string;
  stockEntryId: null | number;
  storeId: null | number;
  transactionId: string;
  transactionType: string;
}
