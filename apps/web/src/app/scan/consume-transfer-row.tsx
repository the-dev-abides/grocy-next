import { ArrowRightLeft, Utensils } from 'lucide-react';

import type { PendingScan } from '../api/next-api';
import type { PendingScanRowLists } from './pending-scan-row';

import { PendingScanRow, RejectButton } from './pending-scan-row';
import { consumeDetailText, nameOf, transferDetailText } from './scan-text';
import { useOpenText } from './use-open-text';
import { WriteInNameField } from './write-in-name-field';

// The icon of the booking type: the fork and knife of Consume and the two
// arrows of Transfer. The icon has the name of the booking type for a screen
// reader.
function BookingIcon({
  bookingType,
}: Readonly<{ bookingType: PendingScan['bookingType'] }>) {
  const className = 'size-5 shrink-0 text-primary';
  return bookingType === 'transfer' ? (
    <ArrowRightLeft role="img" aria-label="Transfer" className={className} />
  ) : (
    <Utensils role="img" aria-label="Consume" className={className} />
  );
}

// One row of the Consume and Transfer session list. The row starts with the
// icon of its booking type. The detail line shows the time, the booking type,
// and the locations. A Consume row also says "Opens a new pack" or "From the
// opened pack". A Transfer row with no "to" location shows the line in red. The amount in its unit and the reject button are on the right. A row
// with no product and no lookup result has the write-in name field, as on the
// other scan screens.
export function ConsumeTransferRow({
  lists,
  onReject,
  onWriteInName,
  rows,
  scan,
}: Readonly<{
  lists: PendingScanRowLists;
  onReject: () => void;
  onWriteInName: (name: string) => void;
  rows: readonly PendingScan[];
  scan: PendingScan;
}>) {
  const open = useOpenText(scan, rows);
  const unit = nameOf(lists.quantityUnits, scan.quantityUnitId, '');
  const isTransfer = scan.bookingType === 'transfer';
  return (
    <>
      <BookingIcon bookingType={scan.bookingType} />
      <PendingScanRow
        isWarning={isTransfer && scan.toLocationId === null}
        lists={lists}
        scan={scan}
        details={[
          isTransfer
            ? transferDetailText(scan, lists.locations)
            : consumeDetailText(scan, lists.locations),
          ...(open === null ? [] : [open]),
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
