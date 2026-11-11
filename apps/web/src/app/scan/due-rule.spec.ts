import { dueDateOf, dueRuleText } from './due-rule';

describe('the due date rule of a scan session', () => {
  const today = Temporal.PlainDate.from('2026-11-11');

  it('gives no date for the rule none, so Grocy applies the product default', () => {
    expect(dueDateOf({ kind: 'none' }, today)).toBeNull();
  });

  it('gives the fixed date of the rule date', () => {
    expect(dueDateOf({ date: '2027-01-31', kind: 'date' }, today)).toBe(
      '2027-01-31',
    );
  });

  it('gives no date while the fixed date is still blank', () => {
    expect(dueDateOf({ date: '', kind: 'date' }, today)).toBeNull();
  });

  it('adds the days of the rule days to today, across a month end', () => {
    expect(dueDateOf({ days: 7, kind: 'days' }, today)).toBe('2026-11-18');
    expect(dueDateOf({ days: 30, kind: 'days' }, today)).toBe('2026-12-11');
    expect(dueDateOf({ days: 0, kind: 'days' }, today)).toBe('2026-11-11');
  });

  it('writes the rule in words for the summary line', () => {
    expect(dueRuleText({ kind: 'none' })).toBe('Product default');
    expect(dueRuleText({ days: 7, kind: 'days' })).toBe('+7 days');
    expect(dueRuleText({ date: '2027-01-31', kind: 'date' })).toBe(
      '2027-01-31',
    );
    expect(dueRuleText({ date: '', kind: 'date' })).toBe('Pick a date');
  });
});
