import type { Consume, Open } from '../consume.ts';

// The Grocy consume body, as the Grocy API names the fields. A null location
// is absent here, so Grocy takes stock at all locations. A null stock id is
// absent, so Grocy takes the stock entries in its consume order.
export interface GrocyConsumeBody {
  allow_subproduct_substitution: true;
  amount: number;
  location_id?: number;
  spoiled: boolean;
  stock_entry_id?: string;
}

// The Grocy open body. The stock entry id is the `stock_id` text.
export interface GrocyOpenBody {
  amount: number;
  stock_entry_id: string;
}

// This function builds the Grocy consume body. The sub-product substitution
// is always on, as the Grocy consume form sends it.
export function toGrocyConsumeBody(consume: Consume): GrocyConsumeBody {
  const body: GrocyConsumeBody = {
    allow_subproduct_substitution: true,
    amount: consume.amount,
    spoiled: consume.isSpoiled,
  };
  if (consume.locationId !== null) {
    body.location_id = consume.locationId;
  }
  if (consume.stockId !== null) {
    body.stock_entry_id = consume.stockId;
  }
  return body;
}

export function toGrocyOpenBody(open: Open): GrocyOpenBody {
  return { amount: open.amount, stock_entry_id: open.stockId };
}
