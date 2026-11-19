import { useCallback, useState } from 'react';

export interface Selection {
  isAllChecked: boolean;
  isChecked: (id: number) => boolean;
  toggle: (id: number) => void;
  toggleAll: () => void;
}

// The checkbox of each row and the checkbox of the header. A row that the
// filter hides or that left the queue does not count as checked. Thus the
// checked rows are always rows in front of the user.
export function useSelection(shownIds: readonly number[]): Selection & {
  checkedIds: number[];
} {
  const [checked, setChecked] = useState<ReadonlySet<number>>(() => new Set());
  const checkedIds = shownIds.filter((id) => checked.has(id));
  const isAllChecked =
    shownIds.length > 0 && checkedIds.length === shownIds.length;
  // The toggle keeps its identity between draws, so a row that did not
  // change does not draw again.
  const toggle = useCallback((id: number) => {
    setChecked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }, []);
  return {
    checkedIds,
    isAllChecked,
    isChecked: (id) => checked.has(id),
    toggle,
    toggleAll: () => {
      setChecked(isAllChecked ? new Set() : new Set(shownIds));
    },
  };
}
