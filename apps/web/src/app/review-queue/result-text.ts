import type { Booking, Problem, StockLogRow } from '../api/next-api';

import { nameOf } from '../scan/scan-text';

interface Named {
  id: number;
  name: string;
}

type ProblemFacts = Pick<Problem, 'detail' | 'title' | 'type'>;

const GROCY_REFUSED = '/problems/grocy-refused';

function rowText(
  row: StockLogRow,
  unit: string,
  locations: readonly Named[] | undefined,
): string {
  const location = nameOf(
    locations,
    row.locationId,
    'the product default location',
  );
  const due = row.dueDate ?? 'the product default';
  const price =
    row.price === null ? 'no price' : `price ${String(row.price)} per ${unit}`;
  return `Booked ${String(row.amount)} ${unit} at ${location}, due ${due}, ${price}, ${row.transactionType}.`;
}

// The result line of an accept: the booking facts that Grocy stored, one
// sentence per stock log row, in the stock unit of the product. An empty
// list means that the server did not call Grocy.
export function bookingText(
  booking: Booking,
  unit: string,
  locations: readonly Named[] | undefined,
): string {
  return booking.bookings.length === 0
    ? 'No change. Grocy was not called.'
    : booking.bookings.map((row) => rowText(row, unit, locations)).join(' ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// The Problem Details body of a failed call, when the error of the API slice
// carries one. A network failure carries none.
function problemOf(error: unknown): null | ProblemFacts {
  if (!isRecord(error) || !isRecord(error['data'])) {
    return null;
  }
  const { detail, title, type } = error['data'];
  return typeof detail === 'string' &&
    typeof title === 'string' &&
    typeof type === 'string'
    ? { detail, title, type }
    : null;
}

// The failure line of an accept: the title and the detail of the problem,
// or the words for a call that got no answer.
export function failureText(error: unknown): string {
  const problem = problemOf(error);
  return problem === null
    ? 'The accept did not reach the API.'
    : `${problem.title}. ${problem.detail}`;
}

// Grocy refused the change. The row keeps the Grocy message as its error,
// so the row shows the message and the result line stays silent.
export function isGrocyRefused(error: unknown): boolean {
  return problemOf(error)?.type === GROCY_REFUSED;
}
