import type { PendingScan } from '../api/next-api';
import type { ResultLine } from './result-panel';
import type { QueueLists } from './use-review-queue';

import { isSameRows } from './chain-rows';

// The props of one row of the table and of one card. The chain rows are the
// older rows of the same product, which the stock entry lines read. The
// toggle takes the id, so all rows share one toggle.
export interface RowProperties {
  chainRows: readonly PendingScan[];
  isChecked: boolean;
  lists: QueueLists;
  onChanged: () => void;
  onResult: (line: Omit<ResultLine, 'key'>) => void;
  onToggle: (id: number) => void;
  scan: PendingScan;
}

// Whether a row or a card can skip a draw. A poll keeps the identity of each
// row that did not change, and the lists and the callbacks keep their
// identity too. The chain rows are a new array on each draw, so they compare
// row by row.
export function isSameRowProperties(
  first: Readonly<RowProperties>,
  second: Readonly<RowProperties>,
): boolean {
  return (
    first.scan === second.scan &&
    first.isChecked === second.isChecked &&
    first.lists === second.lists &&
    first.onChanged === second.onChanged &&
    first.onResult === second.onResult &&
    first.onToggle === second.onToggle &&
    isSameRows(first.chainRows, second.chainRows)
  );
}
