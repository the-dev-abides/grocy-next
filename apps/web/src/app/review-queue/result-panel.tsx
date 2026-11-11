import { Check, Minus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { summaryText } from './result-text';

// One line of the result panel: the name of the row and the booking facts,
// the problem, or why the bulk accept skipped the row. The key is unique on
// the page, because one row can fail and then be accepted again.
export interface ResultLine {
  key: number;
  message: string;
  name: string;
  outcome: 'booked' | 'failed' | 'skipped';
}

function countOf(
  lines: readonly ResultLine[],
  outcome: ResultLine['outcome'],
): number {
  return lines.filter((line) => line.outcome === outcome).length;
}

// The icon of a line: a check for a booking, an X for a problem, and a dash
// for a skipped row.
function OutcomeIcon({ outcome }: Readonly<Pick<ResultLine, 'outcome'>>) {
  if (outcome === 'booked') {
    return (
      <Check
        className="
          mt-px size-3.5 shrink-0 text-green-700
          dark:text-green-400
        "
      />
    );
  }
  if (outcome === 'skipped') {
    return <Minus className="mt-px size-3.5 shrink-0 text-muted-foreground" />;
  }
  return <X className="mt-px size-3.5 shrink-0 text-destructive" />;
}

// The result panel above the list: one line per accepted or failed row,
// most recent at the top, and the count of booked, failed, and skipped rows.
export function ResultPanel({
  lines,
  onClose,
}: Readonly<{ lines: readonly ResultLine[]; onClose: () => void }>) {
  if (lines.length === 0) {
    return null;
  }
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-lg border bg-muted/50 p-3"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {summaryText({
            booked: countOf(lines, 'booked'),
            failed: countOf(lines, 'failed'),
            skipped: countOf(lines, 'skipped'),
          })}
        </span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
          Close
        </Button>
      </div>
      <ul className="flex flex-col gap-0.5 text-xs">
        {lines.map((line) => {
          return (
            <li key={line.key} className="flex items-start gap-1.5">
              <OutcomeIcon outcome={line.outcome} />
              <span>
                <span className="font-medium">{line.name}</span>: {line.message}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
