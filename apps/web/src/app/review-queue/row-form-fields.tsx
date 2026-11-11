import type { PendingScan, Product } from '../api/next-api';
import type { RowForm } from './row-form';
import type { QueueLists } from './use-review-queue';

import { nameOf } from '../scan/scan-text';
import { ChoiceSelect, choicesOf } from './choice-select';
import { keepIdOf, keepValueOf, NONE } from './keep-choices';
import { unitChoices } from './row-form';
import { TextField } from './text-field';

type Patch = (fields: Partial<RowForm>) => void;

interface FieldsProperties {
  form: RowForm;
  lists: QueueLists;
  patch: Patch;
  product: Product | undefined;
  scan: PendingScan;
}

const PRICE_TYPE_CHOICES = [
  { label: 'per unit', value: 'unit' },
  { label: 'in total', value: 'total' },
];

// A select of a master data list with a row for none on top.
function IdSelect({
  label,
  none,
  onChange,
  rows,
  value,
}: Readonly<{
  label: string;
  none: string;
  onChange: (id: null | number) => void;
  rows: QueueLists['locations'];
  value: null | number;
}>) {
  return (
    <ChoiceSelect
      choices={choicesOf([{ label: none, value: NONE }], rows)}
      label={label}
      value={keepValueOf(value)}
      onChange={(value) => {
        onChange(keepIdOf(value) ?? null);
      }}
    />
  );
}

// The amount, and on a Purchase row the unit of the amount. An Inventory
// amount is the count in the stock unit of the product.
function AmountFields({
  form,
  lists,
  patch,
  product,
  scan,
}: Readonly<FieldsProperties>) {
  const stockUnit =
    product === undefined
      ? 'the stock unit'
      : nameOf(lists.quantityUnits, product.stockUnitId, '');
  if (scan.bookingType === 'inventory') {
    return (
      <TextField
        label={`Count in ${stockUnit}`}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        placeholder={
          product === undefined ? '' : `${String(product.stockAmount)} now`
        }
        value={form.amount}
        onChange={(event) => {
          patch({ amount: event.target.value });
        }}
      />
    );
  }
  return (
    <>
      <TextField
        label="Amount"
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={form.amount}
        onChange={(event) => {
          patch({ amount: event.target.value });
        }}
      />
      <IdSelect
        label="Unit"
        none="Purchase unit"
        rows={unitChoices(product, lists.quantityUnits)}
        value={form.quantityUnitId}
        onChange={(quantityUnitId) => {
          patch({ quantityUnitId });
        }}
      />
    </>
  );
}

// The store and the price with its price type of a Purchase row.
function PurchaseFields({ form, lists, patch }: Readonly<FieldsProperties>) {
  return (
    <>
      <IdSelect
        label="Store"
        none="None"
        rows={lists.stores}
        value={form.storeId}
        onChange={(storeId) => {
          patch({ storeId });
        }}
      />
      <TextField
        label="Price"
        inputMode="decimal"
        placeholder="0.00"
        value={form.price}
        onChange={(event) => {
          patch({ price: event.target.value });
        }}
      />
      <ChoiceSelect
        choices={PRICE_TYPE_CHOICES}
        label="Price type"
        value={form.priceType}
        onChange={(value) => {
          patch({ priceType: value === 'total' ? 'total' : 'unit' });
        }}
      />
    </>
  );
}

// Every field of one row, in the two-column grid of ADR 0013, as in the
// prototype: the amount and the unit, the location, the due date, the store
// and the price of a Purchase row, the product group of a new product on a
// row with no product, and the note.
export function RowFormFields(props: Readonly<FieldsProperties>) {
  const { form, lists, patch, scan } = props;
  const isInventory = scan.bookingType === 'inventory';
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      <AmountFields {...props} />
      <IdSelect
        label={isInventory ? 'Location of added stock' : 'Location'}
        none="Product default"
        rows={lists.locations}
        value={form.locationId}
        onChange={(locationId) => {
          patch({ locationId });
        }}
      />
      <TextField
        label={isInventory ? 'Due date of added stock' : 'Due date'}
        type="date"
        value={form.dueDate}
        onChange={(event) => {
          patch({ dueDate: event.target.value });
        }}
      />
      {!isInventory && <PurchaseFields {...props} />}
      {scan.productId === null && (
        <IdSelect
          label="Product group of the new product"
          none="None"
          rows={lists.productGroups}
          value={form.productGroupId}
          onChange={(productGroupId) => {
            patch({ productGroupId });
          }}
        />
      )}
      <TextField
        label="Note"
        value={form.note}
        onChange={(event) => {
          patch({ note: event.target.value });
        }}
      />
    </div>
  );
}
