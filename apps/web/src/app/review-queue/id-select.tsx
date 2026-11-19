import type { QueueLists } from './use-review-queue';

import { ChoiceSelect, choicesOf } from './choice-select';
import { keepIdOf, keepValueOf, NONE } from './keep-choices';

// A select of a master data list with a row for none on top.
export function IdSelect({
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
