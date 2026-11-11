import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// The field for a typed code, such as a four-digit produce code. The submit
// sends the code to the same create call as a camera scan and clears the
// field. A blank code sends nothing.
export function TypeCodeField({
  onSubmit,
}: Readonly<{ onSubmit: (code: string) => void }>) {
  const [code, setCode] = useState('');
  return (
    <form
      className="flex gap-2 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        const typed = code.trim();
        if (typed !== '') {
          onSubmit(typed);
        }
        setCode('');
      }}
    >
      <Input
        inputMode="numeric"
        aria-label="Code"
        placeholder="Type a code, for example 4011"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
        }}
      />
      <Button type="submit">Add</Button>
    </form>
  );
}
