import type { ValueTransformer } from 'typeorm';

import { EntitySchema } from 'typeorm';

// The standard nutrient set of ADR 0011, per 100 g or 100 ml and per serving.
// Each nutrient is one typed column per basis.
export const NUTRIENTS = [
  'energyKj',
  'energyKcal',
  'fat',
  'saturatedFat',
  'carbohydrates',
  'sugars',
  'fiber',
  'proteins',
  'salt',
  'sodium',
] as const;
type Nutrient = (typeof NUTRIENTS)[number];

export const NUTRIENT_BASES = ['Per100', 'PerServing'] as const;
type NutrientBasis = (typeof NUTRIENT_BASES)[number];

type NutrientColumn = `${Nutrient}${NutrientBasis}`;
export type NutrientColumns = Record<NutrientColumn, null | number>;

// The nutrient levels of Open Facts: a level word per nutrient, such as `high`
// for `fat`.
type NutrientLevels = Record<string, string>;

// The raw `nutriments` object of the source, kept as one JSON value.
type Nutriments = Record<string, unknown>;

// The facts that one lookup returned, before the row links them to a pending
// scan code and a product.
export interface NutritionFactsFromLookup extends NutrientColumns {
  additiveTags: string[];
  allergenTags: string[];
  analysisTags: string[];
  dataBasis: null | string;
  ecoScoreGrade: null | string;
  ecoScoreScore: null | number;
  fetchedAt: string;
  imageSourceUrl: null | string;
  ingredientsText: null | string;
  licence: string;
  novaGroup: null | number;
  nutrientLevels: NutrientLevels;
  nutriments: Nutriments;
  nutriScoreGrade: null | string;
  service: string;
  servingQuantity: null | number;
  servingQuantityUnit: null | string;
  servingSize: null | string;
  sourceUrl: string;
  traceTags: string[];
}

// One nutrition facts record as the Grocy Next storage holds it: one row per
// successful lookup, linked to the product barcode and, once the row gets a
// product, to the product.
export interface StoredNutritionFacts extends NutritionFactsFromLookup {
  code: string;
  createdAt: string;
  id: number;
  productBarcodeId: null | number;
  productId: null | number;
  updatedAt: string;
}

// A timestamp column holds a date and time in UTC. TypeORM writes the RFC 3339
// text as the driver wants it and reads a `Date`. The transformer gives the
// text back.
const timestamp: ValueTransformer = {
  from: (value: Date | null): null | string => value?.toISOString() ?? null,
  to: (value: null | string): null | string => value,
};

// One typed nutrient column.
const NUTRIENT_COLUMN = { nullable: true, type: 'float' } as const;

// The entity of the nutrition facts record, with the Data Mapper pattern of ADR
// 0008. The column types are the TypeORM names that both drivers map, as the
// pending scan entity. The migration creates the table with the same mapping.
export const storedNutritionFactsSchema =
  new EntitySchema<StoredNutritionFacts>({
    columns: {
      additiveTags: { type: 'simple-json' },
      allergenTags: { type: 'simple-json' },
      analysisTags: { type: 'simple-json' },
      carbohydratesPer100: NUTRIENT_COLUMN,
      carbohydratesPerServing: NUTRIENT_COLUMN,
      code: { type: 'varchar' },
      createdAt: { transformer: timestamp, type: Date },
      dataBasis: { nullable: true, type: 'varchar' },
      ecoScoreGrade: { nullable: true, type: 'varchar' },
      ecoScoreScore: { nullable: true, type: 'float' },
      energyKcalPer100: NUTRIENT_COLUMN,
      energyKcalPerServing: NUTRIENT_COLUMN,
      energyKjPer100: NUTRIENT_COLUMN,
      energyKjPerServing: NUTRIENT_COLUMN,
      fatPer100: NUTRIENT_COLUMN,
      fatPerServing: NUTRIENT_COLUMN,
      fetchedAt: { transformer: timestamp, type: Date },
      fiberPer100: NUTRIENT_COLUMN,
      fiberPerServing: NUTRIENT_COLUMN,
      id: { generated: 'increment', primary: true, type: 'integer' },
      imageSourceUrl: { nullable: true, type: 'varchar' },
      ingredientsText: { nullable: true, type: 'text' },
      licence: { type: 'varchar' },
      novaGroup: { nullable: true, type: 'integer' },
      nutrientLevels: { type: 'simple-json' },
      nutriments: { type: 'simple-json' },
      nutriScoreGrade: { nullable: true, type: 'varchar' },
      productBarcodeId: { nullable: true, type: 'integer' },
      productId: { nullable: true, type: 'integer' },
      proteinsPer100: NUTRIENT_COLUMN,
      proteinsPerServing: NUTRIENT_COLUMN,
      saltPer100: NUTRIENT_COLUMN,
      saltPerServing: NUTRIENT_COLUMN,
      saturatedFatPer100: NUTRIENT_COLUMN,
      saturatedFatPerServing: NUTRIENT_COLUMN,
      service: { type: 'varchar' },
      servingQuantity: { nullable: true, type: 'float' },
      servingQuantityUnit: { nullable: true, type: 'varchar' },
      servingSize: { nullable: true, type: 'varchar' },
      sodiumPer100: NUTRIENT_COLUMN,
      sodiumPerServing: NUTRIENT_COLUMN,
      sourceUrl: { type: 'varchar' },
      sugarsPer100: NUTRIENT_COLUMN,
      sugarsPerServing: NUTRIENT_COLUMN,
      traceTags: { type: 'simple-json' },
      updatedAt: { transformer: timestamp, type: Date },
    },
    name: 'StoredNutritionFacts',
    tableName: 'nutrition_facts',
  });
