import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { summaryText } from './result-text';

// One line of the result panel: the name of the row and the booking facts,
// or the problem. The key is unique on the page, because one row can fail
// and then be accepted again.
export interface ResultLine {
  isOk: boolean;
  key: number;
  message: string;
  name: string;
}

// The result panel above the list: one line per accepted or failed row,
// most recent at the top, and the count of booked and failed rows.
export function ResultPanel({
  lines,
  onClose,
}: Readonly<{ lines: readonly ResultLine[]; onClose: () => void }>) {
  if (lines.length === 0) {
    return null;
  }
  const bookedCount = lines.filter((line) => line.isOk).length;
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-lg border bg-muted/50 p-3"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {summaryText(bookedCount, lines.length - bookedCount)}
        </span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
          Close
        </Button>
      </div>
      <ul className="flex flex-col gap-0.5 text-xs">
        {lines.map((line) => {
          return (
            <li key={line.key} className="flex items-start gap-1.5">
              {line.isOk ? (
                <Check
                  className="
                    mt-px size-3.5 shrink-0 text-green-700
                    dark:text-green-400
                  "
                />
              ) : (
                <X className="mt-px size-3.5 shrink-0 text-destructive" />
              )}
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
