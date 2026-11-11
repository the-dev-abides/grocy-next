// One purchase to book in Grocy. The amount is in the stock unit and the price
// is per stock unit. The client does not send an optional field that is null,
// so Grocy applies its default. The defaults are the product default due date,
// the product default location, no store, and no note.
export interface Purchase {
  amount: number;
  dueDate: null | string;
  locationId: null | number;
  note: null | string;
  price: null | number;
  storeId: null | number;
}
