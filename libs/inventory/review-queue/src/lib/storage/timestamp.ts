// The time of a change as RFC 3339 text in UTC with milliseconds, the precision
// that both storage engines keep.
export function now(): string {
  return Temporal.Now.instant().toString({ fractionalSecondDigits: 3 });
}
