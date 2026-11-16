// A household quantity unit as the unit proposals read it: the id and the name.
export interface Named {
  id: number;
  name: string;
}

// The first household unit whose name is in the list, case ignored.
export function unitNamed(
  units: readonly Named[] | undefined,
  names: readonly string[],
): Named | undefined {
  return units?.find((unit) => names.includes(unit.name.trim().toLowerCase()));
}
