import type { Location, PendingScan, UpdatePendingScan } from '../api/next-api';
import type { ResultLine } from './result-panel';

import {
  useCreateBookingMutation,
  useDeletePendingScanMutation,
  useUpdatePendingScanMutation,
} from '../api/next-api';
import { bookingText, failureText, isGrocyRefused } from './result-text';

export interface RowActions {
  accept: () => void;
  isBusy: boolean;
  reject: () => void;
  save: (body: UpdatePendingScan) => void;
  setCount: (amount: null | number) => void;
  setProduct: (productId: number) => void;
}

interface RowFacts {
  name: string;
  onChanged: () => void;
  onResult: (line: Omit<ResultLine, 'key'>) => void;
  scan: PendingScan;
}

// The product pick and the short product form send the update that sets the
// product. The count field sends the update that sets the count. The full form
// sends the update with every field. The server adds the code to the product
// and sets the picture. A failed update keeps the row as it was, so the result
// line shows the problem.
function useRowUpdates({ name, onChanged, onResult, scan }: RowFacts) {
  const [updatePendingScan, updating] = useUpdatePendingScanMutation();

  async function send(body: UpdatePendingScan): Promise<void> {
    try {
      await updatePendingScan({
        id: scan.id,
        updatePendingScan: body,
      }).unwrap();
    } catch (error) {
      onResult({ message: failureText(error), name, outcome: 'failed' });
    }
    onChanged();
  }

  return {
    isBusy: updating.isLoading,
    save: (body: UpdatePendingScan) => {
      void send(body);
    },
    // The count of an Inventory row is the amount of the row.
    setCount: (amount: null | number) => {
      void send({ amount });
    },
    setProduct: (productId: number) => {
      void send({ productId });
    },
  };
}

// The accept of a row sends the booking create of ADR 0010. On success the
// result line shows the booking facts that Grocy stored. When Grocy refused
// the change, the row keeps the Grocy message as its error and shows it, so
// the result line stays silent. On every other problem the result line shows
// the problem. The reject sends the delete. Every action refetches the list.
export function useRowActions({
  locations,
  name,
  onChanged,
  onResult,
  scan,
  stockUnit,
}: Readonly<
  RowFacts & {
    locations: readonly Location[] | undefined;
    stockUnit: string;
  }
>): RowActions {
  const [createBooking, accepting] = useCreateBookingMutation();
  const [deletePendingScan, rejecting] = useDeletePendingScanMutation();
  const updates = useRowUpdates({ name, onChanged, onResult, scan });

  async function accept(): Promise<void> {
    try {
      const booking = await createBooking({
        createBooking: { pendingScanId: scan.id },
      }).unwrap();
      onResult({
        message: bookingText(booking, stockUnit, locations),
        name,
        outcome: 'booked',
      });
    } catch (error) {
      if (!isGrocyRefused(error)) {
        onResult({ message: failureText(error), name, outcome: 'failed' });
      }
    }
    onChanged();
  }

  async function reject(): Promise<void> {
    try {
      await deletePendingScan({ id: scan.id }).unwrap();
    } catch (error) {
      onResult({ message: failureText(error), name, outcome: 'failed' });
    }
    onChanged();
  }

  return {
    accept: () => {
      void accept();
    },
    isBusy: accepting.isLoading || rejecting.isLoading || updates.isBusy,
    reject: () => {
      void reject();
    },
    save: updates.save,
    setCount: updates.setCount,
    setProduct: updates.setProduct,
  };
}
