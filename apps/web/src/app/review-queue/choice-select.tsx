import { useId } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Choice {
  label: string;
  value: string;
}

interface Named {
  id: number;
  name: string;
}

// The choices of the rows of a master data list, after the given first
// choices.
export function choicesOf(
  first: readonly Choice[],
  rows: readonly Named[] | undefined,
): Choice[] {
  return [
    ...first,
    ...(rows ?? []).map((row) => ({ label: row.name, value: String(row.id) })),
  ];
}

// A labelled select over a list of choices.
export function ChoiceSelect({
  choices,
  label,
  onChange,
  value,
}: Readonly<{
  choices: readonly Choice[];
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select
        items={choices}
        value={value}
        onValueChange={(next) => {
          if (next !== null) {
            onChange(next);
          }
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => {
            return (
              <SelectItem key={choice.value} value={choice.value}>
                {choice.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
