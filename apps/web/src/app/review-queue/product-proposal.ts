import type { PendingScan } from '../api/next-api';

interface Named {
  id: number;
  name: string;
}

// One entry of the stock unit name list: the names of a household unit that
// measures the net quantity unit, and how many of the net quantity unit one
// such unit holds. The first entry of each list is the unit itself. The
// other entries are the units with a conversion to it.
interface StockUnitNames {
  names: readonly string[];
  perUnit: number;
}

// The built-in name list of the stock units for g and ml, as ADR 0011
// decided. A household unit matches an entry when its name is in the list,
// case ignored. The Next API has no operation for the Grocy unit
// conversions, so the conversions through kg and l are in this list.
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

// One entry of the package name list: the words of a label quantity text
// that name the package, and the names of the household units for it. The
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

// The stock unit proposal: the household unit whose name matches the net
// quantity unit, or a household unit with a conversion to it, with the net
// quantity converted. No match, no net quantity, or a unit outside g and ml
// gives no proposal.
export function proposeStockUnit(
  netQuantity: null | number,
  netQuantityUnit: null | string,
  units: readonly Named[] | undefined,
): null | StockUnitProposal {
  if (netQuantity === null || !isNetQuantityUnit(netQuantityUnit)) {
    return null;
  }
  const entries = STOCK_UNIT_NAMES[netQuantityUnit];
  for (const entry of entries) {
    const unit = unitNamed(units, entry.names);
    if (unit !== undefined) {
      return { amount: netQuantity / entry.perUnit, unitId: unit.id };
    }
  }
  return null;
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
): Pick<
  ProductProposal,
  'purchaseToStockFactor' | 'purchaseUnitId' | 'stockUnitId'
> {
  const stockUnit =
    lookup === null
      ? null
      : proposeStockUnit(lookup.netQuantity, lookup.netQuantityUnit, units);
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
// write-in name, as ADR 0011 decided: the write-in name, else the lookup
// name, the description with the brand and the label quantity text, the two
// units, and the factor from the net quantity in the stock unit.
export function proposeProduct(
  scan: Pick<PendingScan, 'lookupResult' | 'writeInName'>,
  units: readonly Named[] | undefined,
): ProductProposal {
  const lookup = scan.lookupResult;
  return {
    description: descriptionOf(lookup),
    name: scan.writeInName ?? lookup?.name ?? '',
    ...unitsOf(lookup, units),
  };
}
