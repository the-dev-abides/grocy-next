import type { Purchase } from '../purchase.ts';

// The Grocy purchase body, as the Grocy API names the fields. A null field
// of the purchase is absent here.
export interface GrocyPurchaseBody {
  amount: number;
  best_before_date?: string;
  location_id?: number;
  note?: string;
  price?: number;
  shopping_location_id?: number;
  transaction_type: 'purchase';
}

// This function builds the Grocy purchase body. Each optional field is sent
// only when the purchase sets it.
export function toGrocyPurchaseBody(purchase: Purchase): GrocyPurchaseBody {
  const body: GrocyPurchaseBody = {
    amount: purchase.amount,
    transaction_type: 'purchase',
  };
  if (purchase.dueDate !== null) {
    body.best_before_date = purchase.dueDate;
  }
  if (purchase.locationId !== null) {
    body.location_id = purchase.locationId;
  }
  if (purchase.note !== null) {
    body.note = purchase.note;
  }
  if (purchase.price !== null) {
    body.price = purchase.price;
  }
  if (purchase.storeId !== null) {
    body.shopping_location_id = purchase.storeId;
  }
  return body;
}
