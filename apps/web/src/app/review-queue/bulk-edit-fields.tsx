import type { BulkEdit } from './bulk-edit';
import type { QueueLists } from './use-review-queue';

import { ChoiceSelect, choicesOf } from './choice-select';
import { KEEP, keepIdOf, keepValueOf, NONE } from './keep-choices';
import { TextField } from './text-field';

type Patch = (fields: Partial<BulkEdit>) => void;

const KEEP_TEXT = 'Keep as is';

// The value of the due date select for a fixed date.
const DATE = 'date';

const DUE_CHOICES = [
  { label: KEEP_TEXT, value: KEEP },
  { label: 'Product default', value: NONE },
  { label: 'Fixed date', value: DATE },
];

const PRICE_TYPE_CHOICES = [
  { label: KEEP_TEXT, value: KEEP },
  { label: 'per unit', value: 'unit' },
  { label: 'in total', value: 'total' },
];

function dueValueOf(dueDate: BulkEdit['dueDate']): string {
  if (dueDate === undefined) {
    return KEEP;
  }
  return dueDate === null ? NONE : DATE;
}

function dueDateOfValue(value: string): BulkEdit['dueDate'] {
  if (value === KEEP) {
    return undefined;
  }
  return value === NONE ? null : '';
}

function priceTypeOf(value: string): BulkEdit['priceType'] {
  return value === 'unit' || value === 'total' ? value : undefined;
}

// The due date: keep it, the product default, or a fixed date.
function DueDateFields({
  edit,
  patch,
}: Readonly<{ edit: BulkEdit; patch: Patch }>) {
  return (
    <>
      <ChoiceSelect
        choices={DUE_CHOICES}
        label="Due date"
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
function PriceFields({
  edit,
  patch,
}: Readonly<{ edit: BulkEdit; patch: Patch }>) {
  return (
    <>
      <TextField
        label="Price"
        inputMode="decimal"
        placeholder={KEEP_TEXT}
        value={edit.price}
        onChange={(event) => {
          patch({ price: event.target.value });
        }}
      />
      <ChoiceSelect
        choices={PRICE_TYPE_CHOICES}
        label="Price type"
        value={edit.priceType ?? KEEP}
        onChange={(value) => {
          patch({ priceType: priceTypeOf(value) });
        }}
      />
    </>
  );
}

// The master data selects: the location, the store, and the product group
// of a new product.
function RowSelects({
  edit,
  lists,
  patch,
}: Readonly<{ edit: BulkEdit; lists: QueueLists; patch: Patch }>) {
  const keep = { label: KEEP_TEXT, value: KEEP };
  return (
    <>
      <ChoiceSelect
        choices={choicesOf(
          [keep, { label: 'Product default', value: NONE }],
          lists.locations,
        )}
        label="Location"
        value={keepValueOf(edit.locationId)}
        onChange={(value) => {
          patch({ locationId: keepIdOf(value) });
        }}
      />
      <ChoiceSelect
        choices={choicesOf(
          [keep, { label: 'None', value: NONE }],
          lists.stores,
        )}
        label="Store"
        value={keepValueOf(edit.storeId)}
        onChange={(value) => {
          patch({ storeId: keepIdOf(value) });
        }}
      />
      <ChoiceSelect
        choices={choicesOf(
          [keep, { label: 'None', value: NONE }],
          lists.productGroups,
        )}
        label="Product group of a new product"
        value={keepValueOf(edit.productGroupId)}
        onChange={(value) => {
          patch({ productGroupId: keepIdOf(value) });
        }}
      />
    </>
  );
}

// The fields of the bulk edit, in the two-column grid of ADR 0013. The fields
// are the amount, the location, the due date, the store, and the price with its
// price type. Then come the product group of a new product and the note.
export function BulkEditFields({
  edit,
  lists,
  patch,
}: Readonly<{ edit: BulkEdit; lists: QueueLists; patch: Patch }>) {
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
      <RowSelects edit={edit} lists={lists} patch={patch} />
      <DueDateFields edit={edit} patch={patch} />
      <PriceFields edit={edit} patch={patch} />
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
