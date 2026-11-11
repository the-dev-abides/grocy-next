import type { MasterDataRow } from './grocy/grocy-master-data.ts';
import type { CreateProduct } from './product.ts';

// The active rows of the three master data tables that a product create
// names: the locations, the product groups, and the quantity units.
export interface ProductMasterData {
  locations: readonly MasterDataRow[];
  productGroups: readonly MasterDataRow[];
  quantityUnits: readonly MasterDataRow[];
}

// One id of the create body, the rows that it must name one of, and the
// noun of the detail text.
interface IdCheck {
  id: number | undefined;
  noun: string;
  rows: readonly MasterDataRow[];
}

// This function returns the detail text of the unknown-id problem for the
// first id of a product create that names no active row, or null when every
// id names one. Grocy does not check that the ids exist, so the server
// checks them before the create. An inactive row counts as unknown, because
// the master data lists of the Next API hold the active rows only.
export function unknownIdOf(
  product: CreateProduct,
  masterData: ProductMasterData,
): null | string {
  const checks: IdCheck[] = [
    { id: product.locationId, noun: 'location', rows: masterData.locations },
    {
      id: product.productGroupId,
      noun: 'product group',
      rows: masterData.productGroups,
    },
    {
      id: product.stockUnitId,
      noun: 'quantity unit',
      rows: masterData.quantityUnits,
    },
    {
      id: product.purchaseUnitId,
      noun: 'quantity unit',
      rows: masterData.quantityUnits,
    },
  ];
  const unknown = checks.find((check) => {
    return (
      check.id !== undefined && check.rows.every((row) => row.id !== check.id)
    );
  });
  return unknown === undefined
    ? null
    : `No ${unknown.noun} has the id ${String(unknown.id)}.`;
}
