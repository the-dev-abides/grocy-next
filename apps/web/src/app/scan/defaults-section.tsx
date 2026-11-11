import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { DueRule } from './due-rule';
import type { DefaultsLists, SessionDefaults } from './session-defaults';

import { DEFAULT_DUE_DAYS } from './due-rule';
import { defaultsSummary } from './session-defaults';

// The value of the select row for no default.
const NONE = 'none';

interface Named {
  id: number;
  name: string;
}

// One master data select with a row for no default on top.
function RowSelect({
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

const DUE_KINDS: readonly { label: string; value: DueRule['kind'] }[] = [
  { label: 'Product default', value: 'none' },
  { label: 'Days from today', value: 'days' },
  { label: 'Fixed date', value: 'date' },
];

// The rule of a kind when the shopper picks the kind.
function dueRuleOfKind(kind: string): DueRule {
  if (kind === 'days') {
    return { days: DEFAULT_DUE_DAYS, kind };
  }
  if (kind === 'date') {
    return { date: '', kind };
  }
  return { kind: 'none' };
}

// The days or the date of the rule. The rule none has no value.
function DueValueField({
  onChange,
  rule,
}: Readonly<{ onChange: (rule: DueRule) => void; rule: DueRule }>) {
  if (rule.kind === 'days') {
    return (
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        className="w-20"
        aria-label="Days"
        value={rule.days}
        onChange={(event) => {
          const days = Number(event.target.value);
          onChange({ days: Number.isFinite(days) ? days : 0, kind: 'days' });
        }}
      />
    );
  }
  if (rule.kind === 'date') {
    return (
      <Input
        type="date"
        className="w-36"
        aria-label="Date"
        value={rule.date}
        onChange={(event) => {
          onChange({ date: event.target.value, kind: 'date' });
        }}
      />
    );
  }
  return null;
}

// The due date rule: the kind, and the days or the date of the kind.
function DueRuleField({
  onChange,
  rule,
}: Readonly<{ onChange: (rule: DueRule) => void; rule: DueRule }>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Due date
      </label>
      <div className="flex gap-2">
        <Select
          items={DUE_KINDS}
          value={rule.kind}
          onValueChange={(kind) => {
            onChange(dueRuleOfKind(kind ?? 'none'));
          }}
        >
          <SelectTrigger id={id} className="min-w-0 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DUE_KINDS.map((kind) => {
              return (
                <SelectItem key={kind.value} value={kind.value}>
                  {kind.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <DueValueField rule={rule} onChange={onChange} />
      </div>
    </div>
  );
}

// The four fields of the session defaults.
function DefaultsFields({
  defaults,
  lists,
  onChange,
}: Readonly<{
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
      <RowSelect
        label="Store"
        none="No store"
        rows={lists.stores}
        value={defaults.storeId}
        onChange={(storeId) => {
          onChange({ storeId });
        }}
      />
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
        rule={defaults.dueRule}
        onChange={(dueRule) => {
          onChange({ dueRule });
        }}
      />
    </div>
  );
}

// The collapsible section with the session defaults above the camera. The
// header button opens and closes it. The closed header shows the active
// defaults in one line. Reset puts every default back to unset.
export function DefaultsSection({
  defaults,
  lists,
  onChange,
  onReset,
}: Readonly<{
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
            {defaultsSummary(defaults, lists)}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3 border-b p-3">
          <DefaultsFields
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
