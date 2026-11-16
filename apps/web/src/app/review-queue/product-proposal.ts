import type { PendingScan, QuantityUnitConversion } from '../api/next-api';
import type { ConversionSide } from './household-conversion';
import type { Named } from './named-unit';

import { sidesOf } from './household-conversion';
import { unitNamed } from './named-unit';
import { proposePurchaseUnit } from './purchase-unit-proposal';

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

export interface StockUnitProposal {
  amount: number;
  unitId: number;
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

// The stock unit proposal, as ADR 0011 decided. It is the household unit whose
// name matches the net quantity unit, else a household unit with a household
// conversion to a unit that matches the net quantity unit. The proposal
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
  const byName = nameProposal(netQuantity, entries, units);
  return byName !== null || units === undefined
    ? byName
    : conversionProposal(netQuantity, entries, units, conversions ?? []);
}

// The net quantity in one household unit. A unit that matches the name list
// takes the net quantity with the factor of its entry. A unit with a household
// conversion to a unit that matches the name list takes the net quantity
// through that conversion. Any other unit gives nothing.
function netQuantityIn(
  netQuantity: number,
  entries: readonly StockUnitNames[],
  lists: {
    conversions: readonly QuantityUnitConversion[];
    units: readonly Named[];
  },
  unitId: number,
): null | number {
  const unit = lists.units.find((candidate) => candidate.id === unitId);
  const entry = unit === undefined ? undefined : entryOf(entries, unit);
  if (unit === undefined || entry !== undefined) {
    return entry === undefined ? null : netQuantity / entry.perUnit;
  }
  const sides = lists.conversions
    .flatMap((conversion) => sidesOf(conversion))
    .filter((side) => side.unitId === unitId);
  const amounts = sides.map(
    (side) => sideProposal(netQuantity, entries, lists.units, side)?.amount,
  );
  return amounts.find((amount) => amount !== undefined) ?? null;
}

// The net quantity of the lookup and the name list of its unit, or null when
// the lookup has no net quantity in g or ml.
function measureOf(lookup: PendingScan['lookupResult']): null | {
  entries: readonly StockUnitNames[];
  netQuantity: number;
} {
  const netQuantity = lookup?.netQuantity ?? null;
  const netQuantityUnit = lookup?.netQuantityUnit ?? null;
  return netQuantity === null || !isNetQuantityUnit(netQuantityUnit)
    ? null
    : { entries: STOCK_UNIT_NAMES[netQuantityUnit], netQuantity };
}

// The two units of a product: the unit that the household buys and the unit
// that the household stocks.
interface UnitPair {
  purchaseUnitId: number;
  stockUnitId: number;
}

// The factor proposal from the net quantity: the net quantity in the stock
// unit, divided by the net quantity in the purchase unit. A purchase unit that
// does not measure the net quantity is a package, and one package holds the
// whole net quantity. The proposal is nothing when the lookup has no net
// quantity in g or ml, or the stock unit does not measure it.
export function proposeFactor(
  lookup: PendingScan['lookupResult'],
  pair: UnitPair,
  units: readonly Named[] | undefined,
  conversions: readonly QuantityUnitConversion[] | undefined,
): null | number {
  const measure = measureOf(lookup);
  if (units === undefined || measure === null) {
    return null;
  }
  const { entries, netQuantity } = measure;
  const lists = { conversions: conversions ?? [], units };
  const inStock = netQuantityIn(netQuantity, entries, lists, pair.stockUnitId);
  const inPurchase =
    netQuantityIn(netQuantity, entries, lists, pair.purchaseUnitId) ?? 1;
  return inStock === null ? null : inStock / inPurchase;
}

export interface ProductProposal {
  description: string;
  name: string;
  purchaseUnitId: null | number;
  stockUnitId: null | number;
}

// The description: the brand and the label quantity text, when the lookup
// has them.
function descriptionOf(lookup: PendingScan['lookupResult']): string {
  const parts = lookup === null ? [] : [lookup.brand, lookup.quantityText];
  return parts.filter((part) => part !== null && part !== '').join(', ');
}

// The two unit proposals. No stock unit match gives no unit proposal.
function unitsOf(
  lookup: PendingScan['lookupResult'],
  units: readonly Named[] | undefined,
  conversions: readonly QuantityUnitConversion[] | undefined,
): Pick<ProductProposal, 'purchaseUnitId' | 'stockUnitId'> {
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
    return { purchaseUnitId: null, stockUnitId: null };
  }
  return {
    purchaseUnitId: proposePurchaseUnit(
      lookup.quantityText,
      lookup.packageShapes ?? [],
      units,
    ),
    stockUnitId: stockUnit.unitId,
  };
}

// The proposal of the short product form from the lookup result and the
// write-in name, as ADR 0011 decided. The name is the write-in name, else the
// lookup name. The description has the brand and the label quantity text. The
// proposal also has the two units. The household conversions take part in the
// stock unit proposal. The factor proposal is a function of its own, because
// the form computes it again when the user changes a unit.
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
