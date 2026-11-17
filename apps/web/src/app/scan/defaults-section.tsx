import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { PendingScan } from '../api/next-api';
import type { DefaultsLists, SessionDefaults } from './session-defaults';

import { DueRuleField } from './due-rule-field';
import { defaultsSummary } from './session-defaults';

// The value of the select row for no default.
const NONE = 'none';

interface Named {
  id: number;
  name: string;
}

// One master data select with a row for no default on top.
export function RowSelect({
  label,
  none,
  onChange,
  rows,
  value,
}: Readonly<{
  label: string;
  none: string;
  onChange: (id: null | number) => void;
  rows: readonly Named[] | undefined;
  value: null | number;
}>) {
  const id = useId();
  const items: Record<string, string> = { [NONE]: none };
  if (rows != null) {
    for (const row of rows) {
      items[String(row.id)] = row.name;
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select
        items={items}
        value={value === null ? NONE : String(value)}
        onValueChange={(next) => {
          onChange(next === NONE || next === null ? null : Number(next));
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{none}</SelectItem>
          {(rows ?? []).map((row) => {
            return (
              <SelectItem key={row.id} value={String(row.id)}>
                {row.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

// The fields of the session defaults: the location, on the Purchase screen
// the store, the product group, and the due date rule. On the Inventory
// screen the due date is the due date of the stock that an increase adds.
function DefaultsFields({
  bookingType,
  defaults,
  lists,
  onChange,
}: Readonly<{
  bookingType: PendingScan['bookingType'];
  defaults: SessionDefaults;
  lists: DefaultsLists;
  onChange: (patch: Partial<SessionDefaults>) => void;
}>) {
  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
        lg:grid-cols-1
      "
    >
      <RowSelect
        label="Location"
        none="Product default"
        rows={lists.locations}
        value={defaults.locationId}
        onChange={(locationId) => {
          onChange({ locationId });
        }}
      />
      {bookingType === 'purchase' && (
        <RowSelect
          label="Store"
          none="No store"
          rows={lists.stores}
          value={defaults.storeId}
          onChange={(storeId) => {
            onChange({ storeId });
          }}
        />
      )}
      <RowSelect
        label="Product group"
        none="Product default"
        rows={lists.productGroups}
        value={defaults.productGroupId}
        onChange={(productGroupId) => {
          onChange({ productGroupId });
        }}
      />
      <DueRuleField
        label={
          bookingType === 'purchase' ? 'Due date' : 'Due date of added stock'
        }
        rule={defaults.dueRule}
        onChange={(dueRule) => {
          onChange({ dueRule });
        }}
      />
    </div>
  );
}

// The fields of the open section. The Consume screen has one default: the
// "from" location.
function SectionFields({
  bookingType,
  defaults,
  lists,
  onChange,
}: Readonly<{
  bookingType: PendingScan['bookingType'];
  defaults: SessionDefaults;
  lists: DefaultsLists;
  onChange: (patch: Partial<SessionDefaults>) => void;
}>) {
  if (bookingType !== 'consume') {
    return (
      <DefaultsFields
        bookingType={bookingType}
        defaults={defaults}
        lists={lists}
        onChange={onChange}
      />
    );
  }
  return (
    <RowSelect
      label="From"
      none="Product default"
      rows={lists.locations}
      value={defaults.locationId}
      onChange={(locationId) => {
        onChange({ locationId });
      }}
    />
  );
}

// The collapsible section with the session defaults above the camera. The
// header button opens and closes it. The closed header shows the active
// defaults in one line. Reset puts every default back to unset.
export function DefaultsSection({
  bookingType,
  defaults,
  lists,
  onChange,
  onReset,
}: Readonly<{
  bookingType: PendingScan['bookingType'];
  defaults: SessionDefaults;
  lists: DefaultsLists;
  onChange: (patch: Partial<SessionDefaults>) => void;
  onReset: () => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        className="
          flex h-11 w-full items-center gap-2 border-b px-3 text-left
          hover:bg-muted
        "
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium">Defaults</span>
        {!isOpen && (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {defaultsSummary(defaults, lists, bookingType)}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3 border-b p-3">
          <SectionFields
            bookingType={bookingType}
            defaults={defaults}
            lists={lists}
            onChange={onChange}
          />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
