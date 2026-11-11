import type { PendingScan, QuantityUnitConversion } from '../api/next-api';

interface Named {
  id: number;
  name: string;
}

// One entry of the stock unit name list. It holds the names of a household unit
// that measures the net quantity unit. It also holds how many of the net
// quantity unit one such unit holds. The first entry of each list is the unit
// itself. The other entries are the units with a conversion to it.
interface StockUnitNames {
  names: readonly string[];
  perUnit: number;
}

// The built-in name list of the stock units for g and ml, as ADR 0011
// decided. A household unit matches an entry when its name is in the list,
// case ignored. The list holds kg and l with their factors, so a name match
// needs no household conversion.
const STOCK_UNIT_NAMES: Readonly<
  Record<'g' | 'ml', readonly StockUnitNames[]>
> = {
  g: [
    {
      names: ['g', 'gram', 'grams', 'gramm', 'gramme', 'grammes'],
      perUnit: 1,
    },
    {
      names: [
        'kg',
        'kilogram',
        'kilograms',
        'kilogramm',
        'kilogramme',
        'kilogrammes',
        'kilo',
        'kilos',
      ],
      perUnit: 1000,
    },
  ],
  ml: [
    {
      names: ['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
      perUnit: 1,
    },
    {
      names: ['l', 'litre', 'litres', 'liter', 'liters'],
      perUnit: 1000,
    },
  ],
};

// One entry of the package name list. It holds the words of a label quantity
// text that name the package, and the names of the household units for it. The
// last entry has no word. It is the package when the label names none.
interface PackageNames {
  names: readonly string[];
  words: readonly string[];
}

// The built-in package name list for the purchase unit, as ADR 0011 decided.
const PACKAGE_NAMES: readonly PackageNames[] = [
  { names: ['jar', 'glass'], words: ['jar', 'glass'] },
  { names: ['bottle'], words: ['bottle'] },
  { names: ['can', 'tin'], words: ['can', 'tin'] },
  { names: ['bag', 'sack', 'pouch'], words: ['bag', 'sack', 'pouch'] },
  { names: ['box', 'carton'], words: ['box', 'carton'] },
  { names: ['bar'], words: ['bar'] },
  { names: ['cup', 'pot', 'tub'], words: ['cup', 'pot', 'tub'] },
  { names: ['pack', 'package', 'packet', 'piece'], words: [] },
];

export interface StockUnitProposal {
  amount: number;
  unitId: number;
}

function unitNamed(
  units: readonly Named[] | undefined,
  names: readonly string[],
): Named | undefined {
  return units?.find((unit) => names.includes(unit.name.trim().toLowerCase()));
}

function isNetQuantityUnit(unit: null | string): unit is 'g' | 'ml' {
  return unit === 'g' || unit === 'ml';
}

// The entry of the name list that a household unit matches, if any.
function entryOf(
  entries: readonly StockUnitNames[],
  unit: Named,
): StockUnitNames | undefined {
  const name = unit.name.trim().toLowerCase();
  return entries.find((entry) => entry.names.includes(name));
}

// One side of a household conversion: the household unit, the unit on the
// other side, and how many of the other unit one household unit holds.
interface ConversionSide {
  otherId: number;
  otherPerUnit: number;
  unitId: number;
}

// The two sides of a household conversion. One from unit is the factor in to
// units, so one to unit is one divided by the factor in from units.
function sidesOf(conversion: QuantityUnitConversion): ConversionSide[] {
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

// The proposal of one side of a household conversion. The household unit must
// not match the name list itself, so a conversion between g and kg leaves the
// name match alone. The other unit must match the name list. The net quantity
// is in g or ml, so the amount is the net quantity divided by the g or ml of
// one household unit.
function sideProposal(
  netQuantity: number,
  entries: readonly StockUnitNames[],
  units: readonly Named[],
  side: ConversionSide,
): null | StockUnitProposal {
  const unit = units.find((candidate) => candidate.id === side.unitId);
  const other = units.find((candidate) => candidate.id === side.otherId);
  if (unit === undefined || other === undefined || entryOf(entries, unit)) {
    return null;
  }
  const entry = entryOf(entries, other);
  return entry === undefined
    ? null
    : {
        amount: netQuantity / (side.otherPerUnit * entry.perUnit),
        unitId: unit.id,
      };
}

// The first household unit with a household conversion to a unit that matches
// the name list, in the order of the conversion list.
function conversionProposal(
  netQuantity: number,
  entries: readonly StockUnitNames[],
  units: readonly Named[],
  conversions: readonly QuantityUnitConversion[],
): null | StockUnitProposal {
  const sides = conversions.flatMap((conversion) => sidesOf(conversion));
  for (const side of sides) {
    const proposal = sideProposal(netQuantity, entries, units, side);
    if (proposal !== null) {
      return proposal;
    }
  }
  return null;
}

// The household unit whose name matches the net quantity unit, in the order
// of the name list.
function nameProposal(
  netQuantity: number,
  entries: readonly StockUnitNames[],
  units: readonly Named[] | undefined,
): null | StockUnitProposal {
  for (const entry of entries) {
    const unit = unitNamed(units, entry.names);
    if (unit !== undefined) {
      return { amount: netQuantity / entry.perUnit, unitId: unit.id };
    }
  }
  return null;
}

// The stock unit proposal. It is a household unit with a household conversion
// to a unit that matches the net quantity unit, else the household unit whose
// name matches the net quantity unit. The conversion comes first, because a
// household that has a conversion to g also has the unit g. The proposal
// converts the net quantity to that unit. No match, no net quantity, or a unit
// outside g and ml gives no proposal.
export function proposeStockUnit(
  netQuantity: null | number,
  netQuantityUnit: null | string,
  units: readonly Named[] | undefined,
  conversions: readonly QuantityUnitConversion[] | undefined,
): null | StockUnitProposal {
  if (netQuantity === null || !isNetQuantityUnit(netQuantityUnit)) {
    return null;
  }
  const entries = STOCK_UNIT_NAMES[netQuantityUnit];
  const byConversion =
    units === undefined
      ? null
      : conversionProposal(netQuantity, entries, units, conversions ?? []);
  return byConversion ?? nameProposal(netQuantity, entries, units);
}

// The purchase unit proposal: the household unit of the package that the
// label quantity text names, or the pack when the label names none. No
// household unit of the package list gives no proposal.
export function proposePurchaseUnit(
  quantityText: null | string,
  units: readonly Named[] | undefined,
): null | number {
  const words = new Set(
    (quantityText ?? '')
      .toLowerCase()
      .split(/[^a-z]+/u)
      .map((word) => word.replace(/s$/u, '')),
  );
  const entry =
    PACKAGE_NAMES.find((candidate) =>
      candidate.words.some((word) => words.has(word)),
    ) ?? PACKAGE_NAMES.at(-1);
  return unitNamed(units, entry?.names ?? [])?.id ?? null;
}

export interface ProductProposal {
  description: string;
  name: string;
  purchaseToStockFactor: number;
  purchaseUnitId: null | number;
  stockUnitId: null | number;
}

// The description: the brand and the label quantity text, when the lookup
// has them.
function descriptionOf(lookup: PendingScan['lookupResult']): string {
  const parts = lookup === null ? [] : [lookup.brand, lookup.quantityText];
  return parts.filter((part) => part !== null && part !== '').join(', ');
}

// The two unit proposals and the factor. No stock unit match gives no unit
// proposal and the factor one.
function unitsOf(
  lookup: PendingScan['lookupResult'],
  units: readonly Named[] | undefined,
  conversions: readonly QuantityUnitConversion[] | undefined,
): Pick<
  ProductProposal,
  'purchaseToStockFactor' | 'purchaseUnitId' | 'stockUnitId'
> {
  const stockUnit =
    lookup === null
      ? null
      : proposeStockUnit(
          lookup.netQuantity,
          lookup.netQuantityUnit,
          units,
          conversions,
        );
  if (lookup === null || stockUnit === null) {
    return {
      purchaseToStockFactor: 1,
      purchaseUnitId: null,
      stockUnitId: null,
    };
  }
  return {
    purchaseToStockFactor: stockUnit.amount,
    purchaseUnitId: proposePurchaseUnit(lookup.quantityText, units),
    stockUnitId: stockUnit.unitId,
  };
}

// The proposal of the short product form from the lookup result and the
// write-in name, as ADR 0011 decided. The name is the write-in name, else the
// lookup name. The description has the brand and the label quantity text. The
// proposal also has the two units, and the factor from the net quantity in the
// stock unit. The household conversions take part in the stock unit proposal.
export function proposeProduct(
  scan: Pick<PendingScan, 'lookupResult' | 'writeInName'>,
  units: readonly Named[] | undefined,
  conversions: readonly QuantityUnitConversion[] | undefined,
): ProductProposal {
  const lookup = scan.lookupResult;
  return {
    description: descriptionOf(lookup),
    name: scan.writeInName ?? lookup?.name ?? '',
    ...unitsOf(lookup, units, conversions),
  };
}
