// PROTOTYPE. The fields of one row, by booking type. A Consume and a Transfer
// have the stock entry select of the Grocy consume form and transfer form.
import { Input } from '@/components/ui/input';

import type { StockMap } from './prototype-plan';

import { ChoiceSelect } from '../choice-select';
import {
  Field,
  idOf,
  locationChoices,
  MOVE_CHOICES,
  NONE,
  numberOf,
  typeOf,
  valueOf,
} from './form-parts';
import { LOCATIONS, nameOf, productOf, type Row } from './prototype-data';
import { dueText } from './prototype-text';

interface FieldProperties {
  patch: (fields: Partial<Row>) => void;
  row: Row;
}

function isMove(row: Row): boolean {
  return row.bookingType === 'consume' || row.bookingType === 'transfer';
}

function AmountFields({ patch, row }: Readonly<FieldProperties>) {
  const product = productOf(row.productId);
  return (
    <>
      <Field label="Amount">
        <Input
          inputMode="decimal"
          value={row.amount === null ? '' : String(row.amount)}
          onChange={(event) => {
            patch({ amount: numberOf(event.target.value) });
          }}
        />
      </Field>
      {product !== undefined && (
        <ChoiceSelect
          label="Unit"
          choices={product.units.map((unit) => {
            return {
              label: unit.name,
              value: unit.name,
            };
          })}
          value={row.unit}
          onChange={(value) => {
            patch({ unit: value });
          }}
        />
      )}
      <ChoiceSelect
        label={isMove(row) ? 'From' : 'Location'}
        choices={locationChoices({
          label:
            row.bookingType === 'consume' ? 'Any location' : 'Product default',
          value: NONE,
        })}
        value={valueOf(row.locationId)}
        onChange={(value) => {
          patch({ locationId: idOf(value) });
        }}
      />
    </>
  );
}

function StockEntrySelect({
  patch,
  row,
  stock,
}: Readonly<FieldProperties & { stock: StockMap }>) {
  const entries =
    row.productId === null ? [] : (stock.get(row.productId) ?? []);
  const choices = entries.map((entry) => {
    const state = entry.isOpened ? 'opened' : 'sealed';
    const where = nameOf(LOCATIONS, entry.locationId);
    return {
      label: `${String(entry.amount)} ${row.unit}, ${state}, ${where}, due ${dueText(entry.dueDate)}`,
      value: String(entry.id),
    };
  });
  return (
    <ChoiceSelect
      label="Stock entry"
      choices={[{ label: 'Any, in the Grocy order', value: NONE }, ...choices]}
      value={valueOf(row.stockEntryId)}
      onChange={(value) => {
        patch({ stockEntryId: idOf(value) });
      }}
    />
  );
}

function MoveFields({
  patch,
  row,
  stock,
}: Readonly<FieldProperties & { stock: StockMap }>) {
  return (
    <>
      {row.bookingType === 'transfer' && (
        <ChoiceSelect
          label="To"
          choices={locationChoices({ label: 'Not set', value: NONE })}
          value={valueOf(row.toLocationId)}
          onChange={(value) => {
            patch({ toLocationId: idOf(value) });
          }}
        />
      )}
      <StockEntrySelect patch={patch} row={row} stock={stock} />
      {row.bookingType === 'consume' && (
        <label className="flex items-center gap-2 self-end text-sm font-medium">
          <input
            type="checkbox"
            checked={row.spoiled}
            onChange={(event) => {
              patch({ spoiled: event.target.checked });
            }}
          />
          Spoiled
        </label>
      )}
    </>
  );
}

function PurchaseFields({ patch, row }: Readonly<FieldProperties>) {
  return (
    <>
      <Field label="Due date">
        <Input
          type="date"
          value={row.dueDate ?? ''}
          onChange={(event) => {
            patch({ dueDate: event.target.value || null });
          }}
        />
      </Field>
      <Field label="Price">
        <Input
          inputMode="decimal"
          value={row.price === null ? '' : String(row.price)}
          onChange={(event) => {
            patch({ price: numberOf(event.target.value) });
          }}
        />
      </Field>
    </>
  );
}

export function RowFields({
  patch,
  row,
  stock,
}: Readonly<FieldProperties & { stock: StockMap }>) {
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      {isMove(row) && (
        <ChoiceSelect
          label="Booking type"
          choices={MOVE_CHOICES}
          value={row.bookingType}
          onChange={(value) => {
            patch({ bookingType: typeOf(value) ?? row.bookingType });
          }}
        />
      )}
      <AmountFields patch={patch} row={row} />
      {isMove(row) && <MoveFields patch={patch} row={row} stock={stock} />}
      {row.bookingType === 'purchase' && (
        <PurchaseFields patch={patch} row={row} />
      )}
    </div>
  );
}
