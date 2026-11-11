import { useState } from 'react';

import type { PendingScan } from '../api/next-api';
import type { ResultLine } from './result-panel';
import type { ReviewQueue } from './use-review-queue';

import { Page } from '../shell/page';
import { Attribution } from './attribution';
import { BulkEditDialog } from './bulk-edit-dialog';
import { BulkToolbar } from './bulk-toolbar';
import { FilterBar } from './filter-bar';
import { filterRows, NO_FILTER } from './queue-filter';
import { QueueTable } from './queue-table';
import { ResultPanel } from './result-panel';
import { useBulkActions } from './use-bulk-actions';
import { useReviewQueue } from './use-review-queue';
import { useSelection } from './use-selection';

// The lines of the result panel, most recent at the top.
function useResultLines() {
  const [lines, setLines] = useState<readonly ResultLine[]>([]);
  return {
    addLine: (line: Omit<ResultLine, 'key'>) => {
      setLines((current) => {
        const key = (current[0]?.key ?? 0) + 1;
        return [{ ...line, key }, ...current];
      });
    },
    clear: () => {
      setLines([]);
    },
    lines,
  };
}

// The filter, the bulk actions, the result panel, and the table of the
// rows that the filter shows.
function QueueBody({
  queue,
  rows,
}: Readonly<{ queue: ReviewQueue; rows: readonly PendingScan[] }>) {
  const [filter, setFilter] = useState(NO_FILTER);
  const [editRows, setEditRows] = useState<null | PendingScan[]>(null);
  const results = useResultLines();
  const shown = filterRows(rows, filter);
  const selection = useSelection(shown.map(({ id }) => id));
  const actions = useBulkActions({
    lists: queue.lists,
    onChanged: queue.refetch,
    onClear: results.clear,
    onResult: results.addLine,
  });
  return (
    <>
      <FilterBar filter={filter} lists={queue.lists} onChange={setFilter} />
      <BulkToolbar
        actions={actions}
        checkedCount={selection.checkedIds.length}
        shown={shown}
        totalCount={rows.length}
        onBulkEdit={() => {
          setEditRows(
            shown.filter(({ id }) => selection.checkedIds.includes(id)),
          );
        }}
      />
      <ResultPanel lines={results.lines} onClose={results.clear} />
      <QueueTable
        lists={queue.lists}
        rows={shown}
        selection={selection}
        onChanged={queue.refetch}
        onResult={results.addLine}
      />
      <BulkEditDialog
        lists={queue.lists}
        rows={editRows}
        onApply={(body) => {
          if (editRows !== null) {
            actions.editAll(editRows, body);
          }
        }}
        onClose={() => {
          setEditRows(null);
        }}
      />
    </>
  );
}

// The review queue screen of ADR 0006: every pending scan of both booking types as a table, most recent at the top, refreshed every three seconds.
// The filter narrows the table, and the bulk actions act on the rows that
// it shows. The result panel above the table shows the booking facts of
// each accept. The cards view comes with a later ticket.
export function ReviewQueuePage() {
  const queue = useReviewQueue();
  return (
    <Page title="Review queue">
      {queue.isLoading && <p>The review queue loads.</p>}
      {queue.isError && (
        <p role="alert">
          The review queue did not load. Check that the API runs.
        </p>
      )}
      {queue.rows && <QueueBody queue={queue} rows={queue.rows} />}
      <Attribution />
    </Page>
  );
}
