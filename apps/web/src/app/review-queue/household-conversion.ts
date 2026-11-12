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
