// The two views of the review queue screen, as the spec decided: the dense
// table and the cards with big controls.
const VIEWS = ['cards', 'table'] as const;

export type QueueView = (typeof VIEWS)[number];

// The key under which the browser keeps the view choice. The prototype kept
// no choice, so it names no key.
export const VIEW_KEY = 'grocy-next.review-queue.view';

// The table is the default on 1024px and wider, the cards below.
const TABLE_MIN_WIDTH = 1024;

function defaultView(width: number): QueueView {
  return width >= TABLE_MIN_WIDTH ? 'table' : 'cards';
}

// The view that the browser kept, else the default view by the width. A
// storage that throws, such as a blocked storage, and a value that is not a
// view give the default.
export function storedView(
  read: () => null | string,
  width: number,
): QueueView {
  let value: null | string;
  try {
    value = read();
  } catch {
    return defaultView(width);
  }
  return VIEWS.find((view) => view === value) ?? defaultView(width);
}

// The browser keeps the choice. A storage that throws keeps nothing, and the
// screen keeps the view until the next visit.
export function viewToStore(
  write: (value: string) => void,
  view: QueueView,
): void {
  try {
    write(view);
  } catch {
    // The choice is lost on the next visit, and the default applies.
  }
}
