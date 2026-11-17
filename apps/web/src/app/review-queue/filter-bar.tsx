import type { PendingScan } from '../api/next-api';
import type { QueueFilter } from './queue-filter';
import type { QueueLists } from './use-review-queue';

import { ChoiceSelect, choicesOf } from './choice-select';
import { type RowState, stateLabel } from './row-state';
import { bookingTypeLabel } from './row-text';

// The value of a select for no filter.
const ALL = 'all';

const STATES: readonly RowState[] = [
  'needs-product',
  'needs-count',
  'needs-to-location',
  'failed',
  'ready',
];

const STATE_CHOICES = [
  { label: 'All states', value: ALL },
  ...STATES.map((state) => ({ label: stateLabel[state], value: state })),
];

const BOOKING_TYPES: readonly PendingScan['bookingType'][] = [
  'purchase',
  'inventory',
  'consume',
  'transfer',
];

const BOOKING_TYPE_CHOICES = [
  { label: 'All booking types', value: ALL },
  ...BOOKING_TYPES.map((type) => {
    return {
      label: bookingTypeLabel[type],
      value: type,
    };
  }),
];

function bookingTypeOf(value: string): QueueFilter['bookingType'] {
  return BOOKING_TYPES.find((type) => type === value) ?? null;
}

function idOf(value: string): null | number {
  return value === ALL ? null : Number(value);
}

function valueOf(id: null | number): string {
  return id === null ? ALL : String(id);
}

function stateOfValue(value: string): null | RowState {
  return STATES.find((state) => state === value) ?? null;
}

// The filter above the table: a booking type, a location, a product group, and a state, as the spec decided.
// The filter narrows the table and the rows that the bulk actions act on.
export function FilterBar({
  filter,
  lists,
  onChange,
}: Readonly<{
  filter: QueueFilter;
  lists: QueueLists;
  onChange: (filter: QueueFilter) => void;
}>) {
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
        lg:max-w-4xl lg:grid-cols-4
      "
    >
      <ChoiceSelect
        choices={BOOKING_TYPE_CHOICES}
        label="Booking type"
        value={filter.bookingType ?? ALL}
        onChange={(value) => {
          onChange({ ...filter, bookingType: bookingTypeOf(value) });
        }}
      />
      <ChoiceSelect
        choices={choicesOf(
          [{ label: 'All locations', value: ALL }],
          lists.locations,
        )}
        label="Location"
        value={valueOf(filter.locationId)}
        onChange={(value) => {
          onChange({ ...filter, locationId: idOf(value) });
        }}
      />
      <ChoiceSelect
        choices={choicesOf(
          [{ label: 'All product groups', value: ALL }],
          lists.productGroups,
        )}
        label="Product group"
        value={valueOf(filter.productGroupId)}
        onChange={(value) => {
          onChange({ ...filter, productGroupId: idOf(value) });
        }}
      />
      <ChoiceSelect
        choices={STATE_CHOICES}
        label="State"
        value={filter.state ?? ALL}
        onChange={(value) => {
          onChange({ ...filter, state: stateOfValue(value) });
        }}
      />
    </div>
  );
}
