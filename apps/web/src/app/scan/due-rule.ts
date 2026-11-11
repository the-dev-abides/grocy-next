// The due date rule of a scan session, as ADR 0010 decided: none, a fixed
// date, or a number of days from today. The screen holds the rule and turns
// it into a date at scan time.
export type DueRule =
  | { date: string; kind: 'date' }
  | { days: number; kind: 'days' }
  | { kind: 'none' };

// The default of the rule days when the shopper picks it.
export const DEFAULT_DUE_DAYS = 7;

// This function turns the rule into the due date of one scan. The date is
// the calendar date of the browser, because the shopper reads the due date
// on the shelf in local time. A blank fixed date is no date, so Grocy
// applies the product default.
export function dueDateOf(
  rule: DueRule,
  today: Temporal.PlainDate = Temporal.Now.plainDateISO(),
): null | string {
  switch (rule.kind) {
    case 'date': {
      return rule.date === '' ? null : rule.date;
    }
    case 'days': {
      return today.add({ days: rule.days }).toString();
    }
    case 'none': {
      return null;
    }
  }
}

// The rule in words, for the summary line of the collapsed defaults section.
export function dueRuleText(rule: DueRule): string {
  switch (rule.kind) {
    case 'date': {
      return rule.date === '' ? 'Pick a date' : rule.date;
    }
    case 'days': {
      return `+${String(rule.days)} days`;
    }
    case 'none': {
      return 'Product default';
    }
  }
}
