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

// The factor from one unit to a different unit through the household
// conversions, or null when they do not resolve the pair. Grocy resolves a
// conversion in both directions and through a chain of conversions. Thus the
// search does the same. When the household conversions resolve the pair, the
// Grocy trigger creates no conversion row for a new product. The search starts
// at the from unit and follows each conversion to a unit that it did not reach
// before.
export function householdFactorOf(
  fromId: number,
  toId: number,
  conversions: readonly QuantityUnitConversion[] | undefined,
): null | number {
  if (fromId === toId || conversions === undefined) {
    return null;
  }
  const sides = conversions.flatMap((conversion) => sidesOf(conversion));
  const reached = new Map<number, number>([[fromId, 1]]);
  const queue = [fromId];
  let next = 0;
  while (next < queue.length) {
    const unitId = queue[next] ?? fromId;
    const factor = reached.get(unitId) ?? 1;
    next += 1;
    for (const side of sides) {
      if (side.unitId !== unitId || reached.has(side.otherId)) {
        continue;
      }
      reached.set(side.otherId, factor * side.otherPerUnit);
      queue.push(side.otherId);
    }
  }
  return reached.get(toId) ?? null;
}
