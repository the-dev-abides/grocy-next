// PROTOTYPE. The words of the plans and the rows.
import type { Plan, PlanLine } from './prototype-plan';

import { LOCATIONS, nameOf, productOf, type Row } from './prototype-data';

export function amountText(amount: number, unit: string): string {
  return `${String(Math.round(amount * 100) / 100)} ${unit}`;
}

export function dueText(date: string): string {
  return Temporal.PlainDate.from(date).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export function timeText(timestamp: string): string {
  return Temporal.Instant.from(timestamp).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function nameOfRow(row: Row): string {
  return productOf(row.productId)?.name ?? row.code;
}

export function amountOf(row: Row): string {
  return row.amount === null
    ? 'No count'
    : amountText(row.amount, row.unit || 'piece');
}

export function toText(row: Row): string {
  return row.toLocationId === null
    ? 'no "to" location'
    : nameOf(LOCATIONS, row.toLocationId);
}

function transferText(line: PlanLine, amount: string, tail: string): string {
  const what = line.entry.isOpened ? 'the opened pack' : 'a sealed pack';
  return line.kind === 'whole'
    ? `${amount}, all of ${what} ${tail}`
    : `${amount} of ${what} ${tail}. Grocy splits the pack.`;
}

// The words of one plan line, such as "0.4 l from the opened pack in Fridge,
// due 18 Nov".
export function lineText(
  line: PlanLine,
  unit: string,
  isTransfer: boolean,
): string {
  const amount = amountText(line.amount, unit);
  const where = nameOf(LOCATIONS, line.entry.locationId);
  const tail = `in ${where}, due ${dueText(line.entry.dueDate)}`;
  if (isTransfer) {
    return transferText(line, amount, tail);
  }
  if (line.entry.isOpened) {
    return `${amount} from the opened pack ${tail}`;
  }
  if (line.kind === 'whole') {
    return `${amount}, all of a sealed pack ${tail}`;
  }
  return line.opensRest
    ? `${amount} from a new pack ${tail}. Opens the rest.`
    : `${amount} from a sealed pack ${tail}. The product cannot be opened.`;
}

// The short words of the open on consume, as the Consume and Transfer scan
// screen shows them.
export function openText(plan: Plan | undefined): null | string {
  if (plan === undefined || plan.lines.length === 0) {
    return null;
  }
  if (plan.lines.some((line) => line.opensRest)) {
    return 'Opens a new pack';
  }
  return plan.lines.every((line) => line.entry.isOpened)
    ? 'From the opened pack'
    : null;
}

export function takenOf(plan: Plan): number {
  let sum = 0;
  for (const line of plan.lines) {
    sum += line.amount;
  }
  return sum;
}

export function missingText(plan: Plan | undefined): null | string {
  if (plan === undefined || plan.missing <= 0) {
    return null;
  }
  const have = amountText(takenOf(plan), plan.unit);
  return `Only ${have} in stock. The accept fails.`;
}
