import { z } from 'zod';

// The Grocy master data tables behind the four lists of the Next API, as the
// Grocy objects endpoint names them. The store is `shopping_locations` in
// Grocy.
export type GrocyMasterDataTable =
  'locations' | 'product_groups' | 'quantity_units' | 'shopping_locations';

// One row of a Grocy master data table, with the fields that the lists
// read. Grocy returns a number as a JSON string in many places, so the
// schema coerces the id. The schema is loose, because each table has more
// fields than the lists read.
const grocyMasterDataRowSchema = z.looseObject({
  id: z.coerce.number(),
  name: z.string(),
});

export const grocyMasterDataRowsSchema = z.array(grocyMasterDataRowSchema);

// One item of a master data list in the Next API: the id and the name.
export interface MasterDataRow {
  id: number;
  name: string;
}

export function toMasterDataRows(
  rows: z.infer<typeof grocyMasterDataRowsSchema>,
): MasterDataRow[] {
  return rows.map((row) => ({ id: row.id, name: row.name }));
}
