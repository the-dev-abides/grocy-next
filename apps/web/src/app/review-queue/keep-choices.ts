// The values of a bulk edit select. A value keeps the field as it is, sets it
// to none, or sets it to the id of a row.
export const KEEP = 'keep';
export const NONE = 'none';

export function keepValueOf(id: null | number | undefined): string {
  if (id === undefined) {
    return KEEP;
  }
  return id === null ? NONE : String(id);
}

export function keepIdOf(value: string): null | number | undefined {
  if (value === KEEP) {
    return undefined;
  }
  return value === NONE ? null : Number(value);
}
