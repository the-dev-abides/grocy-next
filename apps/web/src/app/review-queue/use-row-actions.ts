import type { Location, PendingScan } from '../api/next-api';
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
  setProduct: (productId: number) => void;
}

interface RowFacts {
  name: string;
  onChanged: () => void;
  onResult: (line: Omit<ResultLine, 'key'>) => void;
  scan: PendingScan;
}

// The product pick and the short product form send the update that sets the
// product. The server adds the code to the product and sets the picture. A
// failed update keeps the row as it was, so the result line shows the
// problem.
function useSetProduct({ name, onChanged, onResult, scan }: RowFacts) {
  const [updatePendingScan, updating] = useUpdatePendingScanMutation();

  async function setProduct(productId: number): Promise<void> {
    try {
      await updatePendingScan({
        id: scan.id,
        updatePendingScan: { productId },
      }).unwrap();
    } catch (error) {
      onResult({ isOk: false, message: failureText(error), name });
    }
    onChanged();
  }

  return {
    isBusy: updating.isLoading,
    setProduct: (productId: number) => {
      void setProduct(productId);
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
  const product = useSetProduct({ name, onChanged, onResult, scan });

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
    isBusy: accepting.isLoading || rejecting.isLoading || product.isBusy,
    reject: () => {
      void reject();
    },
    setProduct: product.setProduct,
  };
}
