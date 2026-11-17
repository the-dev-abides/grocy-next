import { useId } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { DueRule } from './due-rule';

import { DEFAULT_DUE_DAYS } from './due-rule';

// The due date rule of the session defaults: the kind and its value.

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
export function DueRuleField({
  label,
  onChange,
  rule,
}: Readonly<{
  label: string;
  onChange: (rule: DueRule) => void;
  rule: DueRule;
}>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
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
