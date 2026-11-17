import type { StockEntry } from '../api/next-api';
import type { Choice } from './choice-select';
import type { Plan, PlanLine, PlanProduct } from './stock-plan';

import { nameOf } from '../scan/scan-text';
import { stockEntriesAt } from './stock-plan';

interface Named {
  id: number;
  name: string;
}

// Grocy stores the due date 2999-12-31 for a stock entry with no due date.
const NO_DUE_DATE = '2999-12-31';

function amountText(amount: number, unit: string): string {
  return `${String(Math.round(amount * 1000) / 1000)} ${unit}`.trim();
}

// The due date as the browser locale writes the day and the short month,
// such as "22 Nov".
function dueText(dueDate: null | string, locale: Intl.LocalesArgument): string {
  if (dueDate === null || dueDate === NO_DUE_DATE) {
    return 'no due date';
  }
  const day = Temporal.PlainDate.from(dueDate).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
  });
  return `due ${day}`;
}

function transferText(line: PlanLine, amount: string, tail: string): string {
  const pack = line.entry.open ? 'the opened pack' : 'a sealed pack';
  return line.kind === 'whole'
    ? `${amount}, all of ${pack} ${tail}`
    : `${amount} of ${pack} ${tail}. Grocy splits the pack.`;
}

function consumeText(line: PlanLine, amount: string, tail: string): string {
  if (line.entry.open) {
    return `${amount} from the opened pack ${tail}`;
  }
  if (line.kind === 'whole') {
    return `${amount}, all of a sealed pack ${tail}`;
  }
  return line.opensRest
    ? `${amount} from a new pack ${tail}. Opens the rest.`
    : `${amount} from a sealed pack ${tail}. The rest stays sealed.`;
}

// The words of one stock entry line, such as "0.1 l from a new pack in
// Fridge, due 22 Nov. Opens the rest.".
export function lineText(
  line: PlanLine,
  facts: Readonly<{
    isTransfer: boolean;
    locale?: Intl.LocalesArgument;
    locations: readonly Named[] | undefined;
    unit: string;
  }>,
): string {
  const amount = amountText(line.amount, facts.unit);
  const where = nameOf(facts.locations, line.entry.locationId, 'no location');
  const tail = `in ${where}, ${dueText(line.entry.dueDate, facts.locale ?? [])}`;
  return facts.isTransfer
    ? transferText(line, amount, tail)
    : consumeText(line, amount, tail);
}

// The short words of the open on consume on the scan screen row: "Opens a
// new pack" when the accept opens the rest of a sealed pack, and "From the
// opened pack" when the accept takes from opened packs only.
export function openText(plan: null | Plan): null | string {
  if (plan === null || plan.lines.length === 0) {
    return null;
  }
  if (plan.lines.some((line) => line.opensRest)) {
    return 'Opens a new pack';
  }
  return plan.lines.every((line) => line.entry.open)
    ? 'From the opened pack'
    : null;
}

// The warning of a Consume above the stock, with the stock that Grocy has
// for the accept. The server refuses the accept.
export function missingText(plan: null | Plan): null | string {
  if (plan === null || plan.missing <= 0) {
    return null;
  }
  const stock = plan.lines.reduce((sum, line) => sum + line.amount, 0);
  return `Grocy has only ${amountText(stock, plan.unit)} for this Consume. The accept fails.`;
}

// The words of one stock entry in the stock entry select, as the Grocy
// consume form and transfer form write them.
export function stockEntryText(entry: StockEntry): string {
  const due = entry.dueDate ?? 'none';
  const bought = entry.purchasedDate ?? 'none';
  const open = entry.open ? 'Opened' : 'Not opened';
  return `Amount: ${String(entry.amount)}; Due on ${due}; Bought on ${bought}; ${open}`;
}

// The value of the first choice of the stock entry select: no stock entry,
// so Grocy takes the stock entries in its consume order.
export const ANY_STOCK_ENTRY = 'any';

function choiceOf(entry: StockEntry): Choice {
  return { label: stockEntryText(entry), value: entry.stockId };
}

// The choices of the stock entry select: no stock entry first, then the stock
// entries at the "from" location in the Grocy consume order. A stock entry
// of the row that the list does not hold, such as a stock entry that is used
// up, stays as a choice with its stock id, so the select shows it.
export function stockEntryChoices(
  product: Pick<PlanProduct, 'consumeLocationId' | 'stockEntries'> | undefined,
  locationId: null | number,
  stockEntryId: null | string,
): Choice[] {
  const entries =
    product === undefined ? [] : stockEntriesAt(product, locationId);
  const choices = [
    { label: 'Next in the Grocy consume order', value: ANY_STOCK_ENTRY },
    ...entries.map((entry) => choiceOf(entry)),
  ];
  return stockEntryId === null ||
    choices.some((choice) => choice.value === stockEntryId)
    ? choices
    : [
        ...choices,
        { label: `Stock entry ${stockEntryId}`, value: stockEntryId },
      ];
}
