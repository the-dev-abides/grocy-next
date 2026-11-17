// One transfer to book in Grocy: an amount of one product from one location
// to another. The amount is in the stock unit. Grocy takes the stock entries
// at the "from" location in its consume order, applies the freezer rules to
// the due dates, and refuses a tare weight product. A null "from" location is
// absent from the Grocy call, so Grocy refuses it. A stock id names the one
// stock entry that the transfer takes, as the Grocy `stock_id` text.
export interface Transfer {
  amount: number;
  fromLocationId: null | number;
  stockId: null | string;
  toLocationId: number;
}
