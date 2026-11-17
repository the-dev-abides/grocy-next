import { useState } from 'react';

// The dialogs of one row: the open dialog, and the dialogs that the user
// opened one time. A row draws a dialog only after its first open. Each closed
// dialog adds a part to the first draw of every row, and the user opens few
// of them. An opened dialog stays drawn after the close, so that it closes
// with its animation.
export function useRowDialogs<Name extends string>() {
  const [dialog, setDialog] = useState<Name | null>(null);
  const [drawn, setDrawn] = useState<ReadonlySet<Name>>(() => new Set());
  return {
    close: () => {
      setDialog(null);
    },
    dialog,
    isDrawn: (name: Name) => drawn.has(name),
    open: (name: Name) => {
      setDialog(name);
      setDrawn((current) => new Set([...current, name]));
    },
  };
}
