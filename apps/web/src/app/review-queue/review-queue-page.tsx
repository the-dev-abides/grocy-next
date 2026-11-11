import { type ComponentProps, useState } from 'react';

import type { PendingScan } from '../api/next-api';
import type { QueueView } from './queue-view';
import type { ResultLine } from './result-panel';
import type { ReviewQueue } from './use-review-queue';

import { Page } from '../shell/page';
import { Attribution } from './attribution';
import { BulkEditDialog } from './bulk-edit-dialog';
import { BulkToolbar } from './bulk-toolbar';
import { FilterBar } from './filter-bar';
import { QueueCards } from './queue-cards';
import { filterRows, NO_FILTER } from './queue-filter';
import { QueueTable } from './queue-table';
import { ResultPanel } from './result-panel';
import { useBulkActions } from './use-bulk-actions';
import { useReviewQueue } from './use-review-queue';
import { useSelection } from './use-selection';
import { useQueueView, ViewSwitch } from './view-switch';

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

// The table or the cards, as the view switch decides.
function ViewBody({
  view,
  ...properties
}: Readonly<ComponentProps<typeof QueueTable> & { view: QueueView }>) {
  return view === 'table' ? (
    <QueueTable {...properties} />
  ) : (
    <QueueCards {...properties} />
  );
}

// The view switch, the filter, the bulk actions, the result panel, and the
// table or the cards of the rows that the filter shows. Both views share the
// filter, the checked rows, and the bulk actions.
function QueueBody({
  queue,
  rows,
}: Readonly<{ queue: ReviewQueue; rows: readonly PendingScan[] }>) {
  const [view, setView] = useQueueView();
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
      <ViewSwitch view={view} onChange={setView} />
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
      <ViewBody
        view={view}
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

// The review queue screen of ADR 0006: every pending scan of both booking types as a table or as cards, most recent at the top, refreshed every three seconds.
// The filter narrows the rows, and the bulk actions act on the rows that
// it shows. The result panel above the rows shows the booking facts of
// each accept. A switch changes between the table and the cards.
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
