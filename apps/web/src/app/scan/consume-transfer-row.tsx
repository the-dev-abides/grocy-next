import type { PendingScan } from '../api/next-api';
import type { PendingScanRowLists } from './pending-scan-row';

import { FlipButton } from './flip-button';
import { PendingScanRow, RejectButton } from './pending-scan-row';
import { consumeDetailText, nameOf, transferDetailText } from './scan-text';
import { WriteInNameField } from './write-in-name-field';

// One row of the Consume and Transfer session list. The row starts with the
// icon of its booking type. A tap on the icon flips the row between Consume
// and Transfer. The detail line shows the time, the booking type,
// and the locations. A Transfer row with no "to" location shows the line in
// red. The amount in its unit and the reject button are on the right. A row
// with no product and no lookup result has the write-in name field, as on the
// other scan screens.
export function ConsumeTransferRow({
  lists,
  onFlip,
  onReject,
  onWriteInName,
  scan,
}: Readonly<{
  lists: PendingScanRowLists;
  onFlip: (bookingType: 'consume' | 'transfer') => void;
  onReject: () => void;
  onWriteInName: (name: string) => void;
  scan: PendingScan;
}>) {
  const unit = nameOf(lists.quantityUnits, scan.quantityUnitId, '');
  const isTransfer = scan.bookingType === 'transfer';
  return (
    <>
      <FlipButton
        bookingType={isTransfer ? 'transfer' : 'consume'}
        onFlip={onFlip}
      />
      <PendingScanRow
        isWarning={isTransfer && scan.toLocationId === null}
        lists={lists}
        scan={scan}
        details={[
          isTransfer
            ? transferDetailText(scan, lists.locations)
            : consumeDetailText(scan, lists.locations),
        ]}
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
