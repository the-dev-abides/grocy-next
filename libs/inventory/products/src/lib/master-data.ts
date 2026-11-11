import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { quantityUnitConversionSchema } from './product.ts';

// The master data lists of the Next API: the locations, the stores, the
// product groups, and the quantity units. Each item is the id and the name
// of one active row of the Grocy table. The list of the household quantity
// unit conversions is the fifth list. The lists exist because the web app
// reads nothing from Grocy directly. Milestone 4 and milestone 6 widen the
// shapes, so each table has a schema of its own.
function masterDataRowSchema(id: string, noun: string) {
  return z
    .strictObject({
      id: z.int().meta({ description: `The id of the ${noun}.` }),
      name: z.string().meta({ description: `The name of the ${noun}.` }),
    })
    .meta({ id });
}

// A list is an `items` envelope and nothing else, as ADR 0014 decided. A
// full list has no cut-off.
function masterDataListSchema<Row extends z.ZodType>(
  rowSchema: Row,
  description: string,
) {
  return z.strictObject({
    items: z.array(rowSchema).meta({ description }),
  });
}

const locationSchema = masterDataRowSchema('Location', 'location');
const storeSchema = masterDataRowSchema('Store', 'store');
const productGroupSchema = masterDataRowSchema('ProductGroup', 'product group');
const quantityUnitSchema = masterDataRowSchema('QuantityUnit', 'quantity unit');

// The DTO classes carry the list schemas into the OpenAPI document and the
// validation pipe. The class name is the schema name in the document. The
// row schemas enter the document through their meta id.
export class LocationList extends createZodDto(
  masterDataListSchema(locationSchema, 'Every active location.'),
) {}
export class StoreList extends createZodDto(
  masterDataListSchema(storeSchema, 'Every active store.'),
) {}
export class ProductGroupList extends createZodDto(
  masterDataListSchema(productGroupSchema, 'Every active product group.'),
) {}
export class QuantityUnitList extends createZodDto(
  masterDataListSchema(quantityUnitSchema, 'Every active quantity unit.'),
) {}

// The household quantity unit conversions: the conversions with no product.
// The short product form reads them for the stock unit proposal.
export class QuantityUnitConversionList extends createZodDto(
  masterDataListSchema(
    quantityUnitConversionSchema,
    'Every household quantity unit conversion.',
  ),
) {}
