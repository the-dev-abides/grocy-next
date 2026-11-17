import type { PendingScan } from '../api/next-api';
import type { BulkEdit, BulkField } from './bulk-edit';
import type { QueueLists } from './use-review-queue';

import { bulkFieldCounts, bulkFieldLabel } from './bulk-edit';
import {
  BOOKING_TYPE_CHOICES,
  bookingTypeOf,
  DUE_CHOICES,
  dueDateOfValue,
  dueValueOf,
  KEEP_CHOICE,
  KEEP_TEXT,
  PRICE_TYPE_CHOICES,
  priceTypeOf,
  SPOILED_CHOICES,
  spoiledOf,
  spoiledValueOf,
} from './bulk-edit-choices';
import { ChoiceSelect, choicesOf } from './choice-select';
import { KEEP, keepIdOf, keepValueOf, NONE } from './keep-choices';
import { TextField } from './text-field';

type Patch = (fields: Partial<BulkEdit>) => void;

// The label of a field with the count of the checked rows that it changes.
type LabelOf = (field: BulkField, label: string) => string;

interface FieldsProperties {
  edit: BulkEdit;
  labelOf: LabelOf;
  lists: QueueLists;
  patch: Patch;
}

// The due date: keep it, the product default, or a fixed date.
function DueDateFields({ edit, labelOf, patch }: Readonly<FieldsProperties>) {
  return (
    <>
      <ChoiceSelect
        choices={DUE_CHOICES}
        label={labelOf('dueDate', 'Due date')}
        value={dueValueOf(edit.dueDate)}
        onChange={(value) => {
          patch({ dueDate: dueDateOfValue(value) });
        }}
      />
      {typeof edit.dueDate === 'string' && (
        <TextField
          label="Fixed due date"
          type="date"
          value={edit.dueDate}
          onChange={(event) => {
            patch({ dueDate: event.target.value });
          }}
        />
      )}
    </>
  );
}

// The price and its price type.
function PriceFields({ edit, labelOf, patch }: Readonly<FieldsProperties>) {
  return (
    <>
      <TextField
        label={labelOf('price', 'Price')}
        inputMode="decimal"
        placeholder={KEEP_TEXT}
        value={edit.price}
        onChange={(event) => {
          patch({ price: event.target.value });
        }}
      />
      <ChoiceSelect
        choices={PRICE_TYPE_CHOICES}
        label={labelOf('price', 'Price type')}
        value={edit.priceType ?? KEEP}
        onChange={(value) => {
          patch({ priceType: priceTypeOf(value) });
        }}
      />
    </>
  );
}

// The fields of a Consume row and of a Transfer row: the booking type, the
// "to" location of a Transfer, and spoiled of a Consume.
function MoveFields({
  counts,
  edit,
  labelOf,
  lists,
  patch,
}: Readonly<FieldsProperties & { counts: Record<BulkField, number> }>) {
  return (
    <>
      {counts.bookingType > 0 && (
        <ChoiceSelect
          choices={BOOKING_TYPE_CHOICES}
          label={labelOf('bookingType', 'Booking type')}
          value={edit.bookingType ?? KEEP}
          onChange={(value) => {
            patch({ bookingType: bookingTypeOf(value) });
          }}
        />
      )}
      {counts.toLocation > 0 && (
        <ChoiceSelect
          choices={choicesOf(
            [KEEP_CHOICE, { label: 'None', value: NONE }],
            lists.locations,
          )}
          label={labelOf('toLocation', 'To')}
          value={keepValueOf(edit.toLocationId)}
          onChange={(value) => {
            patch({ toLocationId: keepIdOf(value) });
          }}
        />
      )}
      {counts.spoiled > 0 && (
        <ChoiceSelect
          choices={SPOILED_CHOICES}
          label={labelOf('spoiled', 'Spoiled')}
          value={spoiledValueOf(edit.spoiled)}
          onChange={(value) => {
            patch({ spoiled: spoiledOf(value) });
          }}
        />
      )}
    </>
  );
}

// The store of a Purchase row.
function StoreField({
  edit,
  labelOf,
  lists,
  patch,
}: Readonly<FieldsProperties>) {
  return (
    <ChoiceSelect
      choices={choicesOf(
        [KEEP_CHOICE, { label: 'None', value: NONE }],
        lists.stores,
      )}
      label={labelOf('store', 'Store')}
      value={keepValueOf(edit.storeId)}
      onChange={(value) => {
        patch({ storeId: keepIdOf(value) });
      }}
    />
  );
}

// The master data selects: the location, the store of a Purchase row, and
// the product group of a new product.
function RowSelects({
  hasStore,
  locationLabel,
  ...props
}: Readonly<FieldsProperties & { hasStore: boolean; locationLabel: string }>) {
  const { edit, labelOf, lists, patch } = props;
  return (
    <>
      <ChoiceSelect
        choices={choicesOf(
          [KEEP_CHOICE, { label: 'Product default', value: NONE }],
          lists.locations,
        )}
        label={labelOf('location', locationLabel)}
        value={keepValueOf(edit.locationId)}
        onChange={(value) => {
          patch({ locationId: keepIdOf(value) });
        }}
      />
      {hasStore && <StoreField {...props} />}
      <ChoiceSelect
        choices={choicesOf(
          [KEEP_CHOICE, { label: 'None', value: NONE }],
          lists.productGroups,
        )}
        label={labelOf('productGroup', 'Product group of a new product')}
        value={keepValueOf(edit.productGroupId)}
        onChange={(value) => {
          patch({ productGroupId: keepIdOf(value) });
        }}
      />
    </>
  );
}

// A Consume and a Transfer take the stock from the "from" location. When
// every checked row is a Consume or a Transfer, the location is "From".
function locationLabelOf(rows: readonly Pick<PendingScan, 'bookingType'>[]) {
  return rows.every(
    (scan) => scan.bookingType === 'consume' || scan.bookingType === 'transfer',
  )
    ? 'From'
    : 'Location';
}

// The fields of the bulk edit, in the two-column grid of ADR 0013. A field shows only when it changes at least one checked row, as the spec decided.
// A field that changes only a part of the checked rows names the count in its label.
export function BulkEditFields({
  edit,
  lists,
  patch,
  rows,
}: Readonly<{
  edit: BulkEdit;
  lists: QueueLists;
  patch: Patch;
  rows: readonly PendingScan[];
}>) {
  const counts = bulkFieldCounts(edit, rows);
  const labelOf: LabelOf = (field, label) =>
    bulkFieldLabel(label, counts[field], rows.length);
  const props = { edit, labelOf, lists, patch };
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      <TextField
        label="Amount"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        placeholder={KEEP_TEXT}
        value={edit.amount}
        onChange={(event) => {
          patch({ amount: event.target.value });
        }}
      />
      <MoveFields {...props} counts={counts} />
      <RowSelects
        {...props}
        hasStore={counts.store > 0}
        locationLabel={locationLabelOf(rows)}
      />
      {counts.dueDate > 0 && <DueDateFields {...props} />}
      {counts.price > 0 && <PriceFields {...props} />}
      <TextField
        label="Note"
        placeholder={KEEP_TEXT}
        value={edit.note}
        onChange={(event) => {
          patch({ note: event.target.value });
        }}
      />
    </div>
  );
}
