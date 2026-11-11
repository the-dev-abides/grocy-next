import type { ComponentProps } from 'react';

import { useId } from 'react';

import { Input } from '@/components/ui/input';

// A labelled input. The props go to the input.
export function TextField({
  label,
  ...props
}: Readonly<ComponentProps<typeof Input> & { label: string }>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input id={id} {...props} />
    </div>
  );
}
