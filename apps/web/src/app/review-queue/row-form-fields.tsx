import { useId } from 'react';

import { Checkbox } from '@/components/ui/checkbox';

import type { PendingScan, Product } from '../api/next-api';
import type { RowForm } from './row-form';
import type { QueueLists } from './use-review-queue';

import {
  bookingTypeChoices,
  isSwitchBookingType,
  SWITCH_BOOKING_TYPES,
} from '../booking-types';
import { nameOf } from '../scan/scan-text';
import { ChoiceSelect } from './choice-select';
import { IdSelect } from './id-select';
import { rowFormFieldsOf, unitChoices } from './row-form';
import { StorePriceFields } from './row-store-price-fields';
import { defaultUnitLabel } from './row-text';
import { StockEntrySelect } from './stock-entry-select';
import { TextField } from './text-field';

type Patch = (fields: Partial<RowForm>) => void;

interface FieldsProperties {
  form: RowForm;
  lists: QueueLists;
  patch: Patch;
  product: Product | undefined;
  scan: PendingScan;
}

const BOOKING_TYPE_CHOICES = bookingTypeChoices(SWITCH_BOOKING_TYPES);

// The booking type of a Consume row and of a Transfer row. The user can
// change it between Consume and Transfer only.
function BookingTypeField({ form, patch }: Readonly<FieldsProperties>) {
  return (
    <ChoiceSelect
      choices={BOOKING_TYPE_CHOICES}
      label="Booking type"
      value={form.bookingType}
      onChange={(value) => {
        if (isSwitchBookingType(value)) {
          patch({ bookingType: value });
        }
      }}
    />
  );
}

// The spoiled flag of a Consume row.
function SpoiledField({ form, patch }: Readonly<FieldsProperties>) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 self-end py-2">
      <Checkbox
        id={id}
        checked={form.spoiled}
        onCheckedChange={(checked) => {
          patch({ spoiled: checked });
        }}
      />
      <label htmlFor={id} className="text-sm font-medium">
        Spoiled
      </label>
    </div>
  );
}

// The amount and the unit of the amount. The empty unit is the default unit
// of the booking type. An Inventory amount is the count in the stock unit of
// the product.
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
        none={defaultUnitLabel(form.bookingType, product, lists.quantityUnits)}
        rows={unitChoices(product, lists.quantityUnits)}
        value={form.quantityUnitId}
        onChange={(quantityUnitId) => {
          patch({ quantityUnitId });
        }}
      />
    </>
  );
}

function locationLabel(bookingType: PendingScan['bookingType']): string {
  if (bookingType === 'inventory') {
    return 'Location of added stock';
  }
  return bookingType === 'purchase' ? 'Location' : 'From';
}

// The location, and on a Transfer row the "to" location. A Consume and a
// Transfer take the stock from the "from" location. A new location clears the
// stock entry, as in the Grocy consume form and transfer form.
function LocationFields({ form, lists, patch }: Readonly<FieldsProperties>) {
  return (
    <>
      <IdSelect
        label={locationLabel(form.bookingType)}
        none="Product default"
        rows={lists.locations}
        value={form.locationId}
        onChange={(locationId) => {
          patch({ locationId, stockEntryId: null });
        }}
      />
      {rowFormFieldsOf(form.bookingType).hasToLocation && (
        <IdSelect
          label="To"
          none="Not set"
          rows={lists.locations}
          value={form.toLocationId}
          onChange={(toLocationId) => {
            patch({ toLocationId });
          }}
        />
      )}
    </>
  );
}

// The fields of a Purchase row and of an Inventory row after the locations:
// the due date, the store, and the price. Only a Purchase row has the price type.
function StockFields(props: Readonly<FieldsProperties>) {
  const { form, patch, scan } = props;
  const isInventory = scan.bookingType === 'inventory';
  const fields = rowFormFieldsOf(scan.bookingType);
  return (
    <>
      <TextField
        label={isInventory ? 'Due date of added stock' : 'Due date'}
        type="date"
        value={form.dueDate}
        onChange={(event) => {
          patch({ dueDate: event.target.value });
        }}
      />
      {fields.hasStore && (
        <StorePriceFields {...props} hasPriceType={fields.hasPriceType} />
      )}
    </>
  );
}

// Every field of one row, in the two-column grid of ADR 0013, as in the
// prototype. The price, the store, and the due date do not apply to a Consume
// or a Transfer, so only a Purchase row and an Inventory row show them. A
// Consume row and a Transfer row show the booking type, and a Consume row
// shows the spoiled flag. A row with no product has the product group of a
// new product. The note comes last.
export function RowFormFields(props: Readonly<FieldsProperties>) {
  const { form, lists, patch, scan } = props;
  const fields = rowFormFieldsOf(scan.bookingType);
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      {fields.hasBookingType && <BookingTypeField {...props} />}
      {rowFormFieldsOf(form.bookingType).hasSpoiled && (
        <SpoiledField {...props} />
      )}
      <AmountFields {...props} />
      <LocationFields {...props} />
      {isSwitchBookingType(scan.bookingType) && (
        <StockEntrySelect
          bookingType={form.bookingType}
          locationId={form.locationId}
          product={props.product}
          stockEntryId={form.stockEntryId}
          onChange={(stockEntryId) => {
            patch({ stockEntryId });
          }}
        />
      )}
      {fields.hasDueDate && <StockFields {...props} />}
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
