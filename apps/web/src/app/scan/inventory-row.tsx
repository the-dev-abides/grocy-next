import { skipToken } from '@reduxjs/toolkit/query';

import type { PendingScan } from '../api/next-api';
import type { ScanRowLists } from './scan-row';

import { useGetProductQuery } from '../api/next-api';
import { RejectButton, ScanRow } from './scan-row';
import { dueDateText, nameOf, stockText } from './scan-text';
import { WriteInNameField } from './write-in-name-field';

// One row of the Inventory session list: the Grocy stock from the product
// read, the location, and the due date on the detail line, the write-in
// name field for a row with no product and no lookup result, and the reject
// button. The row has no amount: the review queue sets the count.
export function InventoryRow({
  lists,
  onReject,
  onWriteInName,
  scan,
}: Readonly<{
  lists: ScanRowLists;
  onReject: () => void;
  onWriteInName: (name: string) => void;
  scan: PendingScan;
}>) {
  const product = useGetProductQuery(
    scan.productId === null ? skipToken : { id: scan.productId },
  ).data;
  const stock =
    scan.productId === null ? [] : [stockText(product, lists.quantityUnits)];
  return (
    <ScanRow
      lists={lists}
      scan={scan}
      details={[
        ...stock,
        nameOf(lists.locations, scan.locationId, 'Product default'),
        dueDateText(scan.dueDate),
      ]}
    >
      {scan.productId === null && scan.lookupResult === null && (
        <WriteInNameField name={scan.writeInName} onSubmit={onWriteInName} />
      )}
      <RejectButton onReject={onReject} />
    </ScanRow>
  );
}
