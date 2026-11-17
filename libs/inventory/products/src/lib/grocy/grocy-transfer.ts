import type { Transfer } from '../transfer.ts';

// The Grocy transfer body, as the Grocy API names the fields.
export interface GrocyTransferBody {
  amount: number;
  location_id_from?: number;
  location_id_to: number;
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
  return body;
}
