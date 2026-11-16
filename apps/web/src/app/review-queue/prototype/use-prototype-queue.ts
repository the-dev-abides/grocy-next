// PROTOTYPE. The review queue in memory: the rows, the Grocy stock, the
// result lines, and the checked rows. The state lives above the variants, so
// it stays when the variant changes.
import { useState } from 'react';

import { flipped, type Row } from './prototype-data';
import { initialStock, plansOf, type StockMap } from './prototype-plan';
import { INITIAL_ROWS } from './prototype-rows';
import { acceptRows, type ResultLine } from './prototype-state';

function toggled(list: readonly number[], id: number): number[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function useQueueState() {
  const [rows, setRows] = useState<readonly Row[]>(INITIAL_ROWS);
  const [stock, setStock] = useState<StockMap>(initialStock);
  const [results, setResults] = useState<readonly ResultLine[]>([]);
  const [checked, setChecked] = useState<readonly number[]>([]);
  const update = (ids: readonly number[], change: (row: Row) => Row) => {
    setRows((list) =>
      list.map((item) => (ids.includes(item.id) ? change(item) : item)),
    );
  };
  const remove = (ids: readonly number[]) => {
    setRows((list) => list.filter((item) => !ids.includes(item.id)));
    setChecked((list) => list.filter((id) => !ids.includes(id)));
  };
  const addResults = (lines: readonly Omit<ResultLine, 'key'>[]) => {
    setResults((current) => {
      const first = current[0]?.key ?? 0;
      const added = lines.map((line, index) => {
        return {
          ...line,
          key: first + index + 1,
        };
      });
      return [...added.toReversed(), ...current];
    });
  };
  const reset = () => {
    setRows(INITIAL_ROWS);
    setStock(initialStock());
    setResults([]);
    setChecked([]);
  };
  return {
    addResults,
    checked,
    remove,
    reset,
    results,
    rows,
    setChecked,
    setResults,
    setStock,
    stock,
    update,
  };
}

export function usePrototypeQueue() {
  const state = useQueueState();
  const { checked, results, rows, setChecked, stock, update } = state;
  return {
    acceptAll: (ids: readonly number[]) => {
      const outcome = acceptRows(rows, stock, ids);
      state.addResults(outcome.results);
      update(ids, (row) => {
        return {
          ...row,
          error: outcome.failed.get(row.id) ?? row.error,
        };
      });
      state.setStock(outcome.stock);
      state.remove(outcome.done);
    },
    checked,
    clearResults: () => {
      state.setResults([]);
    },
    edit: (ids: readonly number[], patch: Partial<Row>) => {
      update(ids, (row) => ({ ...row, ...patch, error: null }));
    },
    flip: (ids: readonly number[]) => {
      update(ids, (row) => {
        return {
          ...row,
          bookingType: flipped(row.bookingType),
          error: null,
        };
      });
    },
    plans: plansOf(rows, stock),
    rejectAll: state.remove,
    reset: state.reset,
    results,
    rows,
    setChecked,
    stock,
    toggleChecked: (id: number) => {
      setChecked((list) => toggled(list, id));
    },
    toggleSpoiled: (id: number) => {
      update([id], (row) => ({ ...row, spoiled: !row.spoiled }));
    },
  };
}

export type PrototypeQueue = ReturnType<typeof usePrototypeQueue>;
