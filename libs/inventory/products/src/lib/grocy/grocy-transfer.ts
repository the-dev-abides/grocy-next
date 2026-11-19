import type { Transfer } from '../transfer.ts';

// The Grocy transfer body, as the Grocy API names the fields. A null stock id
// is absent, so Grocy takes the stock entries in its consume order.
export interface GrocyTransferBody {
  amount: number;
  location_id_from?: number;
  location_id_to: number;
  stock_entry_id?: string;
}

// This function builds the Grocy transfer body.
export function toGrocyTransferBody(transfer: Transfer): GrocyTransferBody {
  const body: GrocyTransferBody = {
    amount: transfer.amount,
    location_id_to: transfer.toLocationId,
  };
  if (transfer.fromLocationId !== null) {
    body.location_id_from = transfer.fromLocationId;
  }
  if (transfer.stockId !== null) {
    body.stock_entry_id = transfer.stockId;
  }
  return body;
}
