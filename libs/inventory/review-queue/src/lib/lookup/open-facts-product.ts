import { z } from 'zod';

import type { LookupResult } from '../pending-scan.ts';
import type {
  NutrientColumns,
  NutritionFactsFromLookup,
} from '../storage/stored-nutrition-facts.ts';
import type { LookupHit } from './lookup-provider.ts';

// The data of Open Facts is under the Open Database License. The nutrition
// facts record stores the licence with the source, so a later screen shows the
// attribution.
const OPEN_FACTS_LICENCE = 'Open Database License (ODbL)';

// The fields of the v3 read. The lookup result takes the first six. The
// nutrition facts record takes the rest.
export const OPEN_FACTS_FIELDS = [
  'product_name',
  'brands',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'image_front_url',
  'nutriments',
  'nutrition_data_per',
  'serving_size',
  'serving_quantity',
  'serving_quantity_unit',
  'nutriscore_grade',
  'nova_group',
  'ecoscore_grade',
  'ecoscore_score',
  'nutrient_levels',
  'ingredients_text',
  'allergens_tags',
  'traces_tags',
  'additives_tags',
  'ingredients_analysis_tags',
];

// The product of the v3 answer, as a record. The field names of Open Facts are
// snake_case, so the readers below take them as text keys.
type OpenFactsRecord = Record<string, unknown>;

const recordSchema = z.record(z.string(), z.unknown());
const tagsSchema = z.array(z.string());
const levelsSchema = z.record(z.string(), z.string());

// The v3 envelope: `status` is `success`, `success_with_warnings`, or
// `failure`, and `product` holds the fields of the read on a success.
export const openFactsAnswerSchema = z.looseObject({
  product: recordSchema.optional(),
  status: z.string(),
});

// An empty text counts as unset.
function textOf(record: OpenFactsRecord, key: string): null | string {
  const value = record[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

// Open Facts returns a number as a JSON number in most places and as text in
// some. Both count. Anything else is unset.
function numberOf(record: OpenFactsRecord, key: string): null | number {
  const value = record[key];
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function tagsOf(record: OpenFactsRecord, key: string): string[] {
  return tagsSchema.safeParse(record[key]).data ?? [];
}

function recordOf(record: OpenFactsRecord, key: string): OpenFactsRecord {
  return recordSchema.safeParse(record[key]).data ?? {};
}

// The standard nutrient set per 100 g or 100 ml and per serving. Open Facts
// names the first basis `_100g` for both 100 g and 100 ml.
function nutrientColumnsOf(nutriments: OpenFactsRecord): NutrientColumns {
  const value = (key: string): null | number => numberOf(nutriments, key);
  return {
    carbohydratesPer100: value('carbohydrates_100g'),
    carbohydratesPerServing: value('carbohydrates_serving'),
    energyKcalPer100: value('energy-kcal_100g'),
    energyKcalPerServing: value('energy-kcal_serving'),
    energyKjPer100: value('energy-kj_100g'),
    energyKjPerServing: value('energy-kj_serving'),
    fatPer100: value('fat_100g'),
    fatPerServing: value('fat_serving'),
    fiberPer100: value('fiber_100g'),
    fiberPerServing: value('fiber_serving'),
    proteinsPer100: value('proteins_100g'),
    proteinsPerServing: value('proteins_serving'),
    saltPer100: value('salt_100g'),
    saltPerServing: value('salt_serving'),
    saturatedFatPer100: value('saturated-fat_100g'),
    saturatedFatPerServing: value('saturated-fat_serving'),
    sodiumPer100: value('sodium_100g'),
    sodiumPerServing: value('sodium_serving'),
    sugarsPer100: value('sugars_100g'),
    sugarsPerServing: value('sugars_serving'),
  };
}

// The source of one hit: the service that held the product, the product page
// for the attribution link, and the time of the read.
export interface LookupSource {
  fetchedAt: string;
  service: string;
  sourceUrl: string;
}

// The lookup result of ADR 0010. The name is `product_name`, the name in the
// main language of the product. The image is the front image at 400 px.
function lookupResultOf(
  product: OpenFactsRecord,
  name: string,
  source: LookupSource,
): LookupResult {
  return {
    brand: textOf(product, 'brands'),
    imageUrl: textOf(product, 'image_front_url'),
    name,
    netQuantity: numberOf(product, 'product_quantity'),
    netQuantityUnit: textOf(product, 'product_quantity_unit'),
    quantityText: textOf(product, 'quantity'),
    service: source.service,
    sourceUrl: source.sourceUrl,
  };
}

// The nutrition facts of ADR 0011, with the raw `nutriments` object.
function nutritionFactsOf(
  product: OpenFactsRecord,
  source: LookupSource,
): NutritionFactsFromLookup {
  const nutriments = recordOf(product, 'nutriments');
  return {
    ...nutrientColumnsOf(nutriments),
    additiveTags: tagsOf(product, 'additives_tags'),
    allergenTags: tagsOf(product, 'allergens_tags'),
    analysisTags: tagsOf(product, 'ingredients_analysis_tags'),
    dataBasis: textOf(product, 'nutrition_data_per'),
    ecoScoreGrade: textOf(product, 'ecoscore_grade'),
    ecoScoreScore: numberOf(product, 'ecoscore_score'),
    fetchedAt: source.fetchedAt,
    imageSourceUrl: textOf(product, 'image_front_url'),
    ingredientsText: textOf(product, 'ingredients_text'),
    licence: OPEN_FACTS_LICENCE,
    novaGroup: numberOf(product, 'nova_group'),
    nutrientLevels:
      levelsSchema.safeParse(product['nutrient_levels']).data ?? {},
    nutriments,
    nutriScoreGrade: textOf(product, 'nutriscore_grade'),
    service: source.service,
    servingQuantity: numberOf(product, 'serving_quantity'),
    servingQuantityUnit: textOf(product, 'serving_quantity_unit'),
    servingSize: textOf(product, 'serving_size'),
    sourceUrl: source.sourceUrl,
    traceTags: tagsOf(product, 'traces_tags'),
  };
}

// This function builds the hit from the product of a success answer. A product
// with no name is a miss, because the lookup result needs a name.
export function toLookupHit(
  product: OpenFactsRecord,
  source: LookupSource,
): LookupHit | null {
  const name = textOf(product, 'product_name');
  if (name === null) {
    return null;
  }
  return {
    imageUrl: textOf(product, 'image_front_url'),
    lookupResult: lookupResultOf(product, name, source),
    nutritionFacts: nutritionFactsOf(product, source),
  };
}
