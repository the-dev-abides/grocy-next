import type { PendingScan, Product } from '../api/next-api';
import type { ChainRow } from './chain-rows';
import type { QueueLists } from './use-review-queue';

import { InventoryLines } from './inventory-lines';
import { StockEntryLines } from './stock-entry-lines';

// The lines under the name of a row and of a card: the inventory lines of an
// Inventory row, and the stock entry lines of a Consume row and a Transfer
// row. The chain rows are the older rows that share a stock entry with the
// row.
export function ProductLines({
  chainRows,
  lists,
  product,
  scan,
  unit,
}: Readonly<{
  chainRows: readonly ChainRow[];
  lists: QueueLists;
  product: Product | undefined;
  scan: PendingScan;
  unit: string;
}>) {
  return (
    <>
      <InventoryLines lists={lists} product={product} scan={scan} unit={unit} />
      <StockEntryLines
        chainRows={chainRows}
        lists={lists}
        product={product}
        scan={scan}
      />
    </>
  );
}
