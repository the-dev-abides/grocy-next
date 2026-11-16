// PROTOTYPE. The result panel: one line for each accept, with the stock
// entries that the accept took.
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { ResultLine } from './prototype-state';
import type { PrototypeQueue } from './use-prototype-queue';

function ResultItem({
  isError,
  texts,
}: Readonly<{ isError: boolean; texts: readonly string[] }>) {
  return (
    <li className="flex items-start gap-1.5">
      {isError ? (
        <X className="mt-px size-3.5 shrink-0 text-destructive" />
      ) : (
        <Check
          className="
            mt-px size-3.5 shrink-0 text-green-700
            dark:text-green-400
          "
        />
      )}
      <span>
        <span className="font-medium">{texts[0]}</span>
        {texts.slice(1).map((text) => {
          return (
            <span key={text} className="block text-muted-foreground">
              {text}
            </span>
          );
        })}
      </span>
    </li>
  );
}

function ResultList({ lines }: Readonly<{ lines: readonly ResultLine[] }>) {
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {lines.map((line) => {
        return (
          <ResultItem
            key={line.key}
            isError={line.isError}
            texts={line.lines}
          />
        );
      })}
    </ul>
  );
}

export function ResultPanel({ queue }: Readonly<{ queue: PrototypeQueue }>) {
  if (queue.results.length === 0) {
    return null;
  }
  const failed = queue.results.filter((line) => line.isError).length;
  const booked = queue.results.length - failed;
  const lines = queue.results;
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-lg border bg-muted/50 p-3"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {booked} booked, {failed} failed
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={queue.clearResults}
        >
          Close
        </Button>
      </div>
      <ResultList lines={lines} />
    </div>
  );
}
