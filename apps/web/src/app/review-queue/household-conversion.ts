import type { QuantityUnitConversion } from '../api/next-api';

// One side of a household conversion: the household unit, the unit on the
// other side, and how many of the other unit one household unit holds.
export interface ConversionSide {
  otherId: number;
  otherPerUnit: number;
  unitId: number;
}

// The two sides of a household conversion. One from unit is the factor in to
// units, so one to unit is one divided by the factor in from units.
export function sidesOf(conversion: QuantityUnitConversion): ConversionSide[] {
  return [
    {
      otherId: conversion.toQuantityUnitId,
      otherPerUnit: conversion.factor,
      unitId: conversion.fromQuantityUnitId,
    },
    {
      otherId: conversion.fromQuantityUnitId,
      otherPerUnit: 1 / conversion.factor,
      unitId: conversion.toQuantityUnitId,
    },
  ];
}

// Whether the household conversions resolve a pair of two different units.
// Grocy resolves a conversion in both directions and through a chain of
// conversions. Thus the search does the same. When the household conversions
// resolve the pair, the Grocy trigger creates no conversion row for a new
// product. The search starts at the from unit and follows each conversion to a
// unit that it did not reach before, until no unit is left to visit.
export function isHouseholdResolved(
  fromId: number,
  toId: number,
  conversions: readonly QuantityUnitConversion[] | undefined,
): boolean {
  if (fromId === toId || conversions === undefined) {
    return false;
  }
  const sides = conversions.flatMap((conversion) => sidesOf(conversion));
  const reached = new Set([fromId]);
  const toVisit = [fromId];
  let unitId = toVisit.pop();
  while (unitId !== undefined) {
    for (const side of sides) {
      if (side.unitId !== unitId || reached.has(side.otherId)) {
        continue;
      }
      reached.add(side.otherId);
      toVisit.push(side.otherId);
    }
    unitId = toVisit.pop();
  }
  return reached.has(toId);
}
