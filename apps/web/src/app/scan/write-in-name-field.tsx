import { useState } from 'react';

import { Input } from '@/components/ui/input';

// The write-in name of an Inventory row with no product and no lookup
// result, as ADR 0010 decided. The field holds the typed name until Enter
// or the loss of the focus, then sends it when it changed. The short product
// form of the review queue takes the name as the product name.
export function WriteInNameField({
  name,
  onSubmit,
}: Readonly<{ name: null | string; onSubmit: (name: string) => void }>) {
  const [typed, setTyped] = useState(name ?? '');
  const submit = () => {
    const next = typed.trim();
    if (next !== '' && next !== name) {
      onSubmit(next);
    }
  };
  return (
    <Input
      aria-label="Product name"
      placeholder="Type the product name"
      className="mt-1 h-8 max-w-xs"
      value={typed}
      onBlur={submit}
      onChange={(event) => {
        setTyped(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') {
          return;
        }

        event.preventDefault();
        submit();
      }}
    />
  );
}
