import type { RowForm } from './row-form';
import type { QueueLists } from './use-review-queue';

import { ChoiceSelect } from './choice-select';
import { IdSelect } from './id-select';
import { TextField } from './text-field';

const PRICE_TYPE_CHOICES = [
  { label: 'per unit', value: 'unit' },
  { label: 'in total', value: 'total' },
];

// The store and the price of a Purchase row and of an Inventory row, and the
// price type of a Purchase row.
export function StorePriceFields({
  form,
  hasPriceType,
  lists,
  patch,
}: Readonly<{
  form: RowForm;
  hasPriceType: boolean;
  lists: QueueLists;
  patch: (fields: Partial<RowForm>) => void;
}>) {
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
      {hasPriceType && (
        <ChoiceSelect
          choices={PRICE_TYPE_CHOICES}
          label="Price type"
          value={form.priceType}
          onChange={(value) => {
            patch({ priceType: value === 'total' ? 'total' : 'unit' });
          }}
        />
      )}
    </>
  );
}
