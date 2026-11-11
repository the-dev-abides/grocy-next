import { cn } from 'cn';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { PendingScan } from '../api/next-api';
import type { ResultLine } from './result-panel';
import type { QueueLists } from './use-review-queue';
import type { Selection } from './use-selection';

import { QueueRow } from './queue-row';

const COLUMN_COUNT = 10;

// The columns that hide below a breakpoint, as in the row.
const FROM_MD = 'hidden md:table-cell';
const FROM_XL = 'hidden xl:table-cell';
const FROM_2XL = 'hidden 2xl:table-cell';

// The header row on the muted colour. The columns of the prototype table
// appear by breakpoint. The checkbox of the header checks every shown row.
function QueueHeader({ selection }: Readonly<{ selection: Selection }>) {
  return (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="w-8">
          <Checkbox
            aria-label="Check all shown rows"
            checked={selection.isAllChecked}
            onCheckedChange={selection.toggleAll}
          />
        </TableHead>
        <TableHead>Product</TableHead>
        <TableHead
          className="
            w-20 text-right
            md:w-36
          "
        >
          Amount
        </TableHead>
        <TableHead className={FROM_MD}>Location</TableHead>
        <TableHead className={FROM_XL}>Due date</TableHead>
        <TableHead className={cn(FROM_XL, 'text-right')}>Price</TableHead>
        <TableHead className={FROM_2XL}>Store</TableHead>
        <TableHead className={FROM_2XL}>Scanned</TableHead>
        <TableHead className={FROM_MD}>State</TableHead>
        <TableHead className="text-right">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

// The table of the review queue, in the density of ADR 0013: a header row on
// the muted colour and a border around the table.
export function QueueTable({
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
    <div className="rounded-lg border">
      <Table aria-label="Pending scans">
        <QueueHeader selection={selection} />
        <TableBody>
          {rows.map((scan) => {
            return (
              <QueueRow
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
            <TableRow>
              <TableCell
                colSpan={COLUMN_COUNT}
                className="py-8 text-center text-muted-foreground"
              >
                The review queue is empty.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
