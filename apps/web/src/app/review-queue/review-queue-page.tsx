import { useState } from 'react';

import type { ResultLine } from './result-panel';

import { Page } from '../shell/page';
import { Attribution } from './attribution';
import { QueueTable } from './queue-table';
import { ResultPanel } from './result-panel';
import { useReviewQueue } from './use-review-queue';

// The review queue screen of ADR 0006: every pending scan of both booking types as a table, most recent at the top, refreshed every three seconds.
// The result panel above the table shows the booking facts of each accept.
// The cards view, the filter, and the bulk actions come with later tickets.
export function ReviewQueuePage() {
  const queue = useReviewQueue();
  const [lines, setLines] = useState<readonly ResultLine[]>([]);
  const addLine = (line: Omit<ResultLine, 'key'>) => {
    setLines((current) => {
      const key = (current[0]?.key ?? 0) + 1;
      return [{ ...line, key }, ...current];
    });
  };

  return (
    <Page title="Review queue">
      {queue.rows && (
        <p className="text-muted-foreground">
          {queue.rows.length} pending{' '}
          {queue.rows.length === 1 ? 'scan' : 'scans'}.
        </p>
      )}
      <ResultPanel
        lines={lines}
        onClose={() => {
          setLines([]);
        }}
      />
      {queue.isLoading && <p>The review queue loads.</p>}
      {queue.isError && (
        <p role="alert">
          The review queue did not load. Check that the API runs.
        </p>
      )}
      {queue.rows && (
        <QueueTable
          lists={queue.lists}
          rows={queue.rows}
          onChanged={queue.refetch}
          onResult={addLine}
        />
      )}
      <Attribution />
    </Page>
  );
}
