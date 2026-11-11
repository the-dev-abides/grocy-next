import type { ReactNode } from 'react';

import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';

import type { PendingScan } from '../api/next-api';
import type { ProductForm } from './product-form';
import type { QueueLists } from './use-review-queue';

import { RowSelect } from '../scan/defaults-section';
import { nameOf } from '../scan/scan-text';
import { Attribution } from './attribution';

export type Patch = (patch: Partial<ProductForm>) => void;

// A labelled text or number field.
function Field({
  children,
  label,
}: Readonly<{ children: (id: string) => ReactNode; label: string }>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

// The front image of the lookup result, from the Open Facts host in the
// browser, as ADR 0011 decided. A failed load hides the image.
function LookupImage({ src }: Readonly<{ src: null | string }>) {
  const [isHidden, setIsHidden] = useState(false);
  if (src === null || isHidden) {
    return null;
  }
  return (
    <img
      src={src}
      alt=""
      className="size-20 shrink-0 rounded-md bg-muted object-contain"
      onError={() => {
        setIsHidden(true);
      }}
    />
  );
}

// The name and the description beside the lookup image.
export function NameFields({
  form,
  patch,
  scan,
}: Readonly<{ form: ProductForm; patch: Patch; scan: PendingScan }>) {
  return (
    <div className="flex gap-3">
      <LookupImage src={scan.lookupResult?.imageUrl ?? null} />
      <div className="grid min-w-0 flex-1 gap-3">
        <Field label="Name">
          {(id) => {
            return (
              <Input
                id={id}
                value={form.name}
                onChange={(event) => {
                  patch({ name: event.target.value });
                }}
              />
            );
          }}
        </Field>
        <Field label="Description">
          {(id) => {
            return (
              <Input
                id={id}
                value={form.description}
                onChange={(event) => {
                  patch({ description: event.target.value });
                }}
              />
            );
          }}
        </Field>
      </div>
    </div>
  );
}

// The factor from the purchase unit to the stock unit, when the two units
// are set and differ.
function FactorField({
  form,
  patch,
  quantityUnits,
}: Readonly<{
  form: ProductForm;
  patch: Patch;
  quantityUnits: QueueLists['quantityUnits'];
}>) {
  if (
    form.purchaseUnitId === null ||
    form.stockUnitId === null ||
    form.purchaseUnitId === form.stockUnitId
  ) {
    return null;
  }
  const purchase = nameOf(quantityUnits, form.purchaseUnitId, '');
  const stock = nameOf(quantityUnits, form.stockUnitId, '');
  return (
    <Field label={`One ${purchase} is how many ${stock}`}>
      {(id) => {
        return (
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={form.factor}
            onChange={(event) => {
              patch({ factor: event.target.value });
            }}
          />
        );
      }}
    </Field>
  );
}

// The stock unit, the purchase unit, and the factor between them.
function UnitFields({
  form,
  patch,
  quantityUnits,
}: Readonly<{
  form: ProductForm;
  patch: Patch;
  quantityUnits: QueueLists['quantityUnits'];
}>) {
  return (
    <>
      <RowSelect
        label="Stock unit"
        none="Pick one"
        rows={quantityUnits}
        value={form.stockUnitId}
        onChange={(stockUnitId) => {
          patch({ stockUnitId });
        }}
      />
      <RowSelect
        label="Purchase unit"
        none="Pick one"
        rows={quantityUnits}
        value={form.purchaseUnitId}
        onChange={(purchaseUnitId) => {
          patch({ purchaseUnitId });
        }}
      />
      <FactorField form={form} patch={patch} quantityUnits={quantityUnits} />
    </>
  );
}

// The location, the product group, the units, and the due days, in the
// two-column grid of ADR 0013.
export function ProductFields({
  form,
  lists,
  patch,
}: Readonly<{ form: ProductForm; lists: QueueLists; patch: Patch }>) {
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      <RowSelect
        label="Default location"
        none="Pick one"
        rows={lists.locations}
        value={form.locationId}
        onChange={(locationId) => {
          patch({ locationId });
        }}
      />
      <RowSelect
        label="Product group"
        none="None"
        rows={lists.productGroups}
        value={form.productGroupId}
        onChange={(productGroupId) => {
          patch({ productGroupId });
        }}
      />
      <UnitFields
        form={form}
        patch={patch}
        quantityUnits={lists.quantityUnits}
      />
      <Field label="Default due days">
        {(id) => {
          return (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={-1}
              step={1}
              value={form.defaultDueDays}
              onChange={(event) => {
                patch({ defaultDueDays: event.target.value });
              }}
            />
          );
        }}
      </Field>
    </div>
  );
}

// The notes under the fields: the label quantity text when the lookup gave
// no unit proposal, and the attribution line of ADR 0011 with the service
// that held the product as a link to the product page.
export function FormNotes({
  hasUnitProposal,
  scan,
}: Readonly<{ hasUnitProposal: boolean; scan: PendingScan }>) {
  const lookup = scan.lookupResult;
  if (lookup === null) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1">
      {!hasUnitProposal && (
        <p className="text-xs text-muted-foreground">
          The label says &quot;{lookup.quantityText ?? 'nothing'}&quot;. No unit
          proposal. Pick the units.
        </p>
      )}
      <Attribution lookupResult={lookup} />
      {lookup.imageUrl !== null && (
        <p className="text-xs text-muted-foreground">
          The picture is copied to Grocy.
        </p>
      )}
    </div>
  );
}
