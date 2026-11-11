import type { Location, PendingScan } from '../api/next-api';
import type { ResultLine } from './result-panel';

import {
  useCreateBookingMutation,
  useDeletePendingScanMutation,
} from '../api/next-api';
import { bookingText, failureText, isGrocyRefused } from './result-text';

export interface RowActions {
  accept: () => void;
  isBusy: boolean;
  reject: () => void;
}

// The accept of a row sends the booking create of ADR 0010. On success the
// result line shows the booking facts that Grocy stored. When Grocy refused
// the change, the row keeps the Grocy message as its error and shows it, so
// the result line stays silent. On every other problem the result line shows
// the problem. The reject sends the delete. Both refetch the list.
export function useRowActions({
  locations,
  name,
  onChanged,
  onResult,
  scan,
  stockUnit,
}: Readonly<{
  locations: readonly Location[] | undefined;
  name: string;
  onChanged: () => void;
  onResult: (line: Omit<ResultLine, 'key'>) => void;
  scan: PendingScan;
  stockUnit: string;
}>): RowActions {
  const [createBooking, accepting] = useCreateBookingMutation();
  const [deletePendingScan, rejecting] = useDeletePendingScanMutation();

  async function accept(): Promise<void> {
    try {
      const booking = await createBooking({
        createBooking: { pendingScanId: scan.id },
      }).unwrap();
      onResult({
        isOk: true,
        message: bookingText(booking, stockUnit, locations),
        name,
      });
    } catch (error) {
      if (!isGrocyRefused(error)) {
        onResult({ isOk: false, message: failureText(error), name });
      }
    }
    onChanged();
  }

  async function reject(): Promise<void> {
    try {
      await deletePendingScan({ id: scan.id }).unwrap();
    } catch (error) {
      onResult({ isOk: false, message: failureText(error), name });
    }
    onChanged();
  }

  return {
    accept: () => {
      void accept();
    },
    isBusy: accepting.isLoading || rejecting.isLoading,
    reject: () => {
      void reject();
    },
  };
}
