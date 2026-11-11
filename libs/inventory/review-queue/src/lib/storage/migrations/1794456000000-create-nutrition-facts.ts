import type { Driver, MigrationInterface, QueryRunner } from 'typeorm';
import type { TableColumnOptions } from 'typeorm/schema-builder/options/TableColumnOptions.js';

import { Table } from 'typeorm';

import type { ColumnType } from './table-columns.ts';

import { NUTRIENT_BASES, NUTRIENTS } from '../stored-nutrition-facts.ts';
import { columnOf, idColumnOf } from './table-columns.ts';

const TABLE_NAME = 'nutrition_facts';

// The columns of the nutrition facts table, with the columns of ADR 0011.
function columnsOf(driver: Driver): TableColumnOptions[] {
  const column = (
    name: string,
    type: ColumnType,
    isNullable = true,
  ): TableColumnOptions => columnOf(driver, name, type, isNullable);
  return [
    idColumnOf(driver),
    column('code', 'varchar', false),
    column('productBarcodeId', 'integer'),
    column('productId', 'integer'),
    ...NUTRIENTS.flatMap((nutrient) =>
      NUTRIENT_BASES.map((basis) => column(`${nutrient}${basis}`, 'float')),
    ),
    column('dataBasis', 'varchar'),
    column('servingSize', 'varchar'),
    column('servingQuantity', 'float'),
    column('servingQuantityUnit', 'varchar'),
    column('nutriScoreGrade', 'varchar'),
    column('novaGroup', 'integer'),
    column('ecoScoreGrade', 'varchar'),
    column('ecoScoreScore', 'float'),
    column('nutrientLevels', 'text', false),
    column('ingredientsText', 'text'),
    column('allergenTags', 'text', false),
    column('traceTags', 'text', false),
    column('additiveTags', 'text', false),
    column('analysisTags', 'text', false),
    column('service', 'varchar', false),
    column('sourceUrl', 'varchar', false),
    column('licence', 'varchar', false),
    column('imageSourceUrl', 'varchar'),
    column('fetchedAt', Date, false),
    column('nutriments', 'text', false),
    column('createdAt', Date, false),
    column('updatedAt', Date, false),
  ];
}

// This migration creates the nutrition facts table of ADR 0011, the second
// migration of the review queue library.
export class CreateNutritionFacts1794456000000 implements MigrationInterface {
  // TypeORM reads the timestamp from the name. The name is explicit, so a
  // bundler that renames the class does not change it.
  name = 'CreateNutritionFacts1794456000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        columns: columnsOf(queryRunner.dataSource.driver),
        name: TABLE_NAME,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_NAME);
  }
}
