import type { PendingScan } from '../api/next-api';
import type { RowActions } from './use-row-actions';

import { SpoiledButton } from '../scan/spoiled-button';

// The trash can of a Consume row in the table and on a card. A tap sends
// one update that turns the spoiled flag on or off. Other rows have no trash
// can.
export function RowSpoiledButton({
  actions,
  scan,
  size = 'icon',
}: Readonly<{
  actions: RowActions;
  scan: PendingScan;
  size?: 'icon' | 'icon-lg';
}>) {
  if (scan.bookingType !== 'consume') {
    return null;
  }
  return (
    <SpoiledButton
      isDisabled={actions.isBusy}
      isSpoiled={scan.spoiled}
      size={size}
      onToggle={() => {
        actions.save({ spoiled: !scan.spoiled });
      }}
    />
  );
}
