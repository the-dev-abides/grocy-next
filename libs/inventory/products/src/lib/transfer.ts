// One transfer to book in Grocy: an amount of one product from one location
// to another. The amount is in the stock unit. Grocy takes the stock entries
// at the "from" location in its consume order, applies the freezer rules to
// the due dates, and refuses a tare weight product. A null "from" location is
// absent from the Grocy call, so Grocy refuses it.
export interface Transfer {
  amount: number;
  fromLocationId: null | number;
  toLocationId: number;
}
