// PROTOTYPE. The fields of the bulk edit. The fields of Consume and Transfer
// show only when a checked row has that booking type. Each field says how
// many of the checked rows it changes.
import { Input } from '@/components/ui/input';

import { ChoiceSelect } from '../choice-select';
import {
  Field,
  idOf,
  KEEP,
  locationChoices,
  MOVE_CHOICES,
  NONE,
  numberOf,
  typeOf,
} from './form-parts';
import { type BookingType, canFlip, type Row } from './prototype-data';

export interface BulkForm {
  amount: string;
  bookingType: string;
  locationId: string;
  spoiled: string;
  toLocationId: string;
}

export const EMPTY_BULK: BulkForm = {
  amount: '',
  bookingType: KEEP,
  locationId: KEEP,
  spoiled: KEEP,
  toLocationId: KEEP,
};

function typeAfter(form: BulkForm, row: Row): BookingType {
  return canFlip(row.bookingType)
    ? (typeOf(form.bookingType) ?? row.bookingType)
    : row.bookingType;
}

// The patch of one row: only the fields that the user set, and only the
// fields that the booking type of the row has.
export function bulkPatch(form: BulkForm, row: Row): Partial<Row> {
  const type = typeAfter(form, row);
  const amount = numberOf(form.amount);
  return {
    ...(amount !== null && { amount }),
    ...(form.locationId !== KEEP && { locationId: idOf(form.locationId) }),
    bookingType: type,
    ...(type === 'transfer' &&
      form.toLocationId !== KEEP && { toLocationId: idOf(form.toLocationId) }),
    ...(type === 'consume' &&
      form.spoiled !== KEEP && { spoiled: form.spoiled === 'on' }),
  };
}

const KEEP_CHOICE = { label: 'Keep', value: KEEP };

function MoveBulkFields({
  form,
  rows,
  set,
}: Readonly<{
  form: BulkForm;
  rows: readonly Row[];
  set: (form: BulkForm) => void;
}>) {
  const scope = (count: number) => {
    return count === rows.length
      ? ''
      : ` (${String(count)} of ${String(rows.length)} rows)`;
  };
  const count = (type: BookingType) =>
    rows.filter((item) => typeAfter(form, item) === type).length;
  const moves = rows.filter((item) => canFlip(item.bookingType)).length;
  return (
    <>
      {moves > 0 && (
        <ChoiceSelect
          label={`Booking type${scope(moves)}`}
          choices={[KEEP_CHOICE, ...MOVE_CHOICES]}
          value={form.bookingType}
          onChange={(value) => {
            set({ ...form, bookingType: value });
          }}
        />
      )}
      {count('transfer') > 0 && (
        <ChoiceSelect
          label={`To${scope(count('transfer'))}`}
          choices={[
            KEEP_CHOICE,
            ...locationChoices({ label: 'Not set', value: NONE }),
          ]}
          value={form.toLocationId}
          onChange={(value) => {
            set({ ...form, toLocationId: value });
          }}
        />
      )}
      {count('consume') > 0 && (
        <ChoiceSelect
          label={`Spoiled${scope(count('consume'))}`}
          choices={[
            KEEP_CHOICE,
            { label: 'Spoiled', value: 'on' },
            { label: 'Not spoiled', value: 'off' },
          ]}
          value={form.spoiled}
          onChange={(value) => {
            set({ ...form, spoiled: value });
          }}
        />
      )}
    </>
  );
}

export function BulkFields({
  form,
  rows,
  set,
}: Readonly<{
  form: BulkForm;
  rows: readonly Row[];
  set: (form: BulkForm) => void;
}>) {
  const isAllMoves = rows.every((item) => canFlip(item.bookingType));
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      <Field label="Amount">
        <Input
          inputMode="decimal"
          placeholder="Keep"
          value={form.amount}
          onChange={(event) => {
            set({ ...form, amount: event.target.value });
          }}
        />
      </Field>
      <ChoiceSelect
        label={isAllMoves ? 'From' : 'Location, or "from" location'}
        choices={[
          KEEP_CHOICE,
          ...locationChoices({ label: 'Default', value: NONE }),
        ]}
        value={form.locationId}
        onChange={(value) => {
          set({ ...form, locationId: value });
        }}
      />
      <MoveBulkFields form={form} rows={rows} set={set} />
    </div>
  );
}
