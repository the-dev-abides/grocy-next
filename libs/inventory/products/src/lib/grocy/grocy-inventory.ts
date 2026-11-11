import type { Inventory } from '../inventory.ts';

// The Grocy inventory body, as the Grocy API names the fields. A null field
// of the inventory is absent here. Grocy sets the transaction type itself.
export interface GrocyInventoryBody {
  best_before_date?: string;
  location_id?: number;
  new_amount: number;
  note?: string;
  price?: number;
  shopping_location_id?: number;
}

// This function builds the Grocy inventory body. Each optional field is sent
// only when the inventory sets it.
export function toGrocyInventoryBody(inventory: Inventory): GrocyInventoryBody {
  const body: GrocyInventoryBody = { new_amount: inventory.amount };
  if (inventory.dueDate !== null) {
    body.best_before_date = inventory.dueDate;
  }
  if (inventory.locationId !== null) {
    body.location_id = inventory.locationId;
  }
  if (inventory.note !== null) {
    body.note = inventory.note;
  }
  if (inventory.price !== null) {
    body.price = inventory.price;
  }
  if (inventory.storeId !== null) {
    body.shopping_location_id = inventory.storeId;
  }
  return body;
}
