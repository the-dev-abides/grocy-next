import { LayoutGrid, Table2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import {
  type QueueView,
  storedView,
  VIEW_KEY,
  viewToStore,
} from './queue-view';

// The view of the review queue. The first render reads the choice that the
// browser kept, else the default by the width of the window. A change
// keeps the new choice in the browser.
export function useQueueView(): [QueueView, (view: QueueView) => void] {
  const [view, setView] = useState(() => {
    return storedView(
      () => globalThis.localStorage.getItem(VIEW_KEY),
      globalThis.innerWidth,
    );
  });
  return [
    view,
    (next) => {
      setView(next);
      viewToStore((value) => {
        globalThis.localStorage.setItem(VIEW_KEY, value);
      }, next);
    },
  ];
}

const CHOICES = [
  { icon: Table2, label: 'Table', view: 'table' },
  { icon: LayoutGrid, label: 'Cards', view: 'cards' },
] as const;

// The switch between the table view and the cards view. The button of the
// active view is pressed.
export function ViewSwitch({
  onChange,
  view,
}: Readonly<{ onChange: (view: QueueView) => void; view: QueueView }>) {
  return (
    <div role="group" aria-label="View" className="flex gap-1 self-end">
      {CHOICES.map((choice) => {
        const isActive = choice.view === view;
        return (
          <Button
            key={choice.view}
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={isActive}
            onClick={() => {
              onChange(choice.view);
            }}
          >
            <choice.icon data-icon="inline-start" /> {choice.label}
          </Button>
        );
      })}
    </div>
  );
}
