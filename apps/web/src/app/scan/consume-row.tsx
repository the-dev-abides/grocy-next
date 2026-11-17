import { Utensils } from 'lucide-react';

import type { PendingScan } from '../api/next-api';
import type { PendingScanRowLists } from './pending-scan-row';

import { PendingScanRow, RejectButton } from './pending-scan-row';
import { consumeDetailText, nameOf } from './scan-text';
import { WriteInNameField } from './write-in-name-field';

// One Consume row of the Consume and Transfer session list. The row starts
// with the fork and knife icon of the booking type. The detail line shows the
// time, the booking type, and the "from" location. The amount in its unit and
// the reject button are on the right. A row with no product and no lookup
// result has the write-in name field, as on the other scan screens.
export function ConsumeRow({
  lists,
  onReject,
  onWriteInName,
  scan,
}: Readonly<{
  lists: PendingScanRowLists;
  onReject: () => void;
  onWriteInName: (name: string) => void;
  scan: PendingScan;
}>) {
  const unit = nameOf(lists.quantityUnits, scan.quantityUnitId, '');
  return (
    <>
      <Utensils
        role="img"
        aria-label="Consume"
        className="size-5 shrink-0 text-primary"
      />
      <PendingScanRow
        lists={lists}
        scan={scan}
        details={[consumeDetailText(scan, lists.locations)]}
      >
        {scan.productId === null && scan.lookupResult === null && (
          <WriteInNameField name={scan.writeInName} onSubmit={onWriteInName} />
        )}
        <span className="text-center tabular-nums">
          {`${String(scan.amount ?? '')} ${unit}`.trim()}
        </span>
        <RejectButton onReject={onReject} />
      </PendingScanRow>
    </>
  );
}
