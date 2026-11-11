import { Checkbox } from '@/components/ui/checkbox';

import type { PendingScan } from '../api/next-api';
import type { ResultLine } from './result-panel';
import type { QueueLists } from './use-review-queue';
import type { Selection } from './use-selection';

import { QueueCard } from './queue-card';

// The cards view of the review queue. It shows one card per row that the filter
// shows. It has one column on a phone, two from `lg`, and three from `2xl`. The
// checkbox above the cards checks every shown card, as the header checkbox of
// the table does.
export function QueueCards({
  lists,
  onChanged,
  onResult,
  rows,
  selection,
}: Readonly<{
  lists: QueueLists;
  onChanged: () => void;
  onResult: (line: Omit<ResultLine, 'key'>) => void;
  rows: readonly PendingScan[];
  selection: Selection;
}>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Checkbox
          aria-label="Check all shown rows"
          checked={selection.isAllChecked}
          onCheckedChange={selection.toggleAll}
        />
        <span aria-hidden="true">Check all shown rows</span>
      </div>
      <ul
        aria-label="Pending scans"
        className="
          grid gap-3
          lg:grid-cols-2
          2xl:grid-cols-3
        "
      >
        {rows.map((scan) => {
          return (
            <QueueCard
              key={scan.id}
              isChecked={selection.isChecked(scan.id)}
              lists={lists}
              scan={scan}
              onChanged={onChanged}
              onResult={onResult}
              onToggle={() => {
                selection.toggle(scan.id);
              }}
            />
          );
        })}
        {rows.length === 0 && (
          <li className="py-8 text-center text-muted-foreground">
            The review queue is empty.
          </li>
        )}
      </ul>
    </div>
  );
}
