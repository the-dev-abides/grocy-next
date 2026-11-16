// PROTOTYPE. The state of a row and what the accept of rows does.
import { LOCATIONS, nameOf, productOf, type Row } from './prototype-data';
import { applyRow, type Plan, plansOf, type StockMap } from './prototype-plan';
import { amountText, lineText, nameOfRow } from './prototype-text';

export type RowState =
  'failed' | 'needs-count' | 'needs-product' | 'needs-to' | 'ready';

export const STATE_LABEL: Record<RowState, string> = {
  failed: 'Accept failed',
  'needs-count': 'Needs a count',
  'needs-product': 'Needs a product',
  'needs-to': 'Needs a "to" location',
  ready: 'Ready',
};

export const ROW_STATES: readonly RowState[] = [
  'needs-product',
  'needs-count',
  'needs-to',
  'failed',
  'ready',
];

export function stateOf(row: Row): RowState {
  if (row.error !== null) {
    return 'failed';
  }
  if (row.productId === null) {
    return 'needs-product';
  }
  if (row.bookingType === 'inventory' && row.amount === null) {
    return 'needs-count';
  }
  if (row.bookingType === 'transfer' && row.toLocationId === null) {
    return 'needs-to';
  }
  return 'ready';
}

export function canAccept(state: RowState): boolean {
  return state === 'ready' || state === 'failed';
}

export interface ResultLine {
  isError: boolean;
  key: number;
  lines: string[];
}

const VERB: Record<Row['bookingType'], string> = {
  consume: 'Consumed',
  inventory: 'Counted',
  purchase: 'Purchased',
  transfer: 'Transferred',
};

// The booking facts of an accept, as the result panel shows them.
function resultOf(row: Row, plan: Plan | undefined): string[] {
  const verb = row.spoiled ? 'Consumed as spoiled' : VERB[row.bookingType];
  const amount = amountText(row.amount ?? 0, row.unit);
  const isTransfer = row.bookingType === 'transfer';
  const to = isTransfer ? ` to ${nameOf(LOCATIONS, row.toLocationId)}` : '';
  const lines = (plan?.lines ?? []).map((line) =>
    lineText(line, plan?.unit ?? '', isTransfer),
  );
  const isOpened = plan?.lines.some((line) => line.opensRest) === true;
  return [
    `${verb} ${amount} ${nameOfRow(row)}${to}.`,
    ...lines,
    ...(isOpened ? ['Grocy booked an open of the rest of the pack.'] : []),
  ];
}

function failureOf(row: Row, plan: Plan | undefined): null | string {
  const product = productOf(row.productId);
  const isTare = product !== undefined && product.tareWeight !== null;
  if (isTare && row.bookingType === 'transfer') {
    return 'Grocy: a product with tare weight handling cannot be transferred.';
  }
  if (plan !== undefined && plan.missing > 0) {
    return 'Grocy: the amount to consume cannot be more than the stock amount.';
  }
  return null;
}

export interface AcceptOutcome {
  done: number[];
  failed: Map<number, string>;
  results: Omit<ResultLine, 'key'>[];
  stock: StockMap;
}

// The accept of the given rows. The oldest row books first, as in the plans.
export function acceptRows(
  rows: readonly Row[],
  stock: StockMap,
  ids: readonly number[],
): AcceptOutcome {
  const outcome: AcceptOutcome = {
    done: [],
    failed: new Map(),
    results: [],
    stock,
  };
  const chosen = rows.filter(
    (item) => ids.includes(item.id) && canAccept(stateOf(item)),
  );
  for (const item of chosen.toReversed()) {
    const plan = plansOf([item], outcome.stock).get(item.id);
    const failure = failureOf(item, plan);
    if (failure === null) {
      outcome.results.push({ isError: false, lines: resultOf(item, plan) });
      outcome.stock = applyRow(item, outcome.stock);
      outcome.done.push(item.id);
    } else {
      const lines = [`${nameOfRow(item)}: ${failure}`];
      outcome.results.push({ isError: true, lines });
      outcome.failed.set(item.id, failure);
    }
  }
  return outcome;
}
