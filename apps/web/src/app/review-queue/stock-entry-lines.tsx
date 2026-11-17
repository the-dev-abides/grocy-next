import type { PendingScan, Product } from '../api/next-api';
import type { QueueLists } from './use-review-queue';

import { nameOf } from '../scan/scan-text';
import { planOfScan } from './plan-of-scan';
import { lineText, missingText } from './stock-plan-text';

// The stock entry lines of a Consume row and a Transfer row, under the name:
// one line for each stock entry that the accept takes. The rows that share a
// stock entry chain, so each row sees the stock after the older rows. A Consume
// of a parent product and a Consume of its sub-product share the stock entries
// of the sub-product. A Consume
// above the stock shows a red warning with the stock that Grocy has. The
// state of the row stays "Ready", and the server refuses the accept. A
// Consume of a parent product also takes the stock of the sub-products, as
// the accept does.
export function StockEntryLines({
  lists,
  product,
  scan,
}: Readonly<{
  lists: QueueLists;
  product: Product | undefined;
  scan: PendingScan;
}>) {
  if (product === undefined) {
    return null;
  }
  const unit = nameOf(lists.quantityUnits, product.stockUnitId, '');
  const products = new Map(lists.productReads);
  products.set(product.id, product);
  const plan = planOfScan(scan, lists.pendingScans ?? [], products, unit);
  if (plan === null) {
    return null;
  }
  const isTransfer = scan.bookingType === 'transfer';
  const warning = isTransfer ? null : missingText(plan);
  return (
    <ul
      aria-label="Stock entries"
      className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground"
    >
      {plan.lines.map((line) => {
        return (
          <li key={`${line.entry.stockId}-${String(line.entry.locationId)}`}>
            {lineText(line, { isTransfer, locations: lists.locations, unit })}
          </li>
        );
      })}
      {warning !== null && (
        <li className="font-medium text-destructive">{warning}</li>
      )}
    </ul>
  );
}
