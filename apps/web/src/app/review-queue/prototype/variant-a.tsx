// PROTOTYPE. Variant A: the review queue of milestone 2 with the new booking types mixed in. The table gets a booking type column at the left. The icon flips a Consume row and a Transfer row. The location column shows "From → To". Under the name, the row lists the stock entries that the accept takes.
// The filter gets a booking type select. The cards view has the same parts.
import { useState } from 'react';

import { ChoiceSelect } from '../choice-select';
import { BulkBar, BulkEditDialog, ViewSwitch } from './prototype-bulk-edit';
import { BOOKING_TYPES, LOCATIONS, type Row, TYPE } from './prototype-data';
import { ResultPanel } from './prototype-result-panel';
import { RowFormDialog } from './prototype-row-form';
import { ROW_STATES, STATE_LABEL, stateOf } from './prototype-state';
import { type PrototypeQueue } from './use-prototype-queue';
import { CardsView } from './variant-a-cards';
import { TableView } from './variant-a-table';

const ALL = 'all';

interface Filter {
  locationId: string;
  state: string;
  type: string;
}

const TYPE_CHOICES = [
  { label: 'All booking types', value: ALL },
  ...BOOKING_TYPES.map((type) => ({ label: TYPE[type].label, value: type })),
];

const LOCATION_CHOICES = [
  { label: 'All locations', value: ALL },
  ...LOCATIONS.map((item) => ({ label: item.name, value: String(item.id) })),
];

const STATE_CHOICES = [
  { label: 'All states', value: ALL },
  ...ROW_STATES.map((state) => ({ label: STATE_LABEL[state], value: state })),
];

// A Transfer matches a location filter by its "from" location or its "to"
// location.
function isMatch(row: Row, filter: Filter): boolean {
  const location = Number(filter.locationId);
  const isPlace =
    filter.locationId === ALL ||
    row.locationId === location ||
    row.toLocationId === location;
  return (
    (filter.type === ALL || row.bookingType === filter.type) &&
    (filter.state === ALL || stateOf(row) === filter.state) &&
    isPlace
  );
}

function FilterBar({
  filter,
  set,
}: Readonly<{ filter: Filter; set: (filter: Filter) => void }>) {
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-3
        lg:max-w-3xl
      "
    >
      <ChoiceSelect
        label="Booking type"
        choices={TYPE_CHOICES}
        value={filter.type}
        onChange={(value) => {
          set({ ...filter, type: value });
        }}
      />
      <ChoiceSelect
        label="Location"
        choices={LOCATION_CHOICES}
        value={filter.locationId}
        onChange={(value) => {
          set({ ...filter, locationId: value });
        }}
      />
      <ChoiceSelect
        label="State"
        choices={STATE_CHOICES}
        value={filter.state}
        onChange={(value) => {
          set({ ...filter, state: value });
        }}
      />
    </div>
  );
}

export function VariantA({ queue }: Readonly<{ queue: PrototypeQueue }>) {
  const [filter, setFilter] = useState<Filter>({
    locationId: ALL,
    state: ALL,
    type: ALL,
  });
  const [isTable, setIsTable] = useState(true);
  const [editRow, setEditRow] = useState<null | Row>(null);
  const [bulkRows, setBulkRows] = useState<null | readonly Row[]>(null);
  const shown = queue.rows.filter((row) => isMatch(row, filter));
  return (
    <>
      <ViewSwitch isTable={isTable} set={setIsTable} />
      <FilterBar filter={filter} set={setFilter} />
      <BulkBar queue={queue} shown={shown} onEdit={setBulkRows} />
      <ResultPanel queue={queue} />
      {isTable ? (
        <TableView queue={queue} rows={shown} onEdit={setEditRow} />
      ) : (
        <CardsView queue={queue} rows={shown} onEdit={setEditRow} />
      )}
      {shown.length === 0 && (
        <p className="text-muted-foreground">
          No pending scan matches the filter.
        </p>
      )}
      <RowFormDialog
        queue={queue}
        row={editRow}
        onClose={() => {
          setEditRow(null);
        }}
      />
      <BulkEditDialog
        queue={queue}
        rows={bulkRows}
        onClose={() => {
          setBulkRows(null);
        }}
      />
    </>
  );
}
