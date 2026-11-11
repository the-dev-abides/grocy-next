// One inventory to book in Grocy. The amount is the new own stock of the
// product in the stock unit across all locations. The other fields apply to
// the stock that the inventory adds. An optional field that is null is not
// sent, so Grocy applies its default: the product default due date, the
// product default location, the last price, the last store, and no note.
export interface Inventory {
  amount: number;
  dueDate: null | string;
  locationId: null | number;
  note: null | string;
  price: null | number;
  storeId: null | number;
}
