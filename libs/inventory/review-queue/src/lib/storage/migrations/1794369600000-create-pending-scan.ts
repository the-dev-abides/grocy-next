import type { Driver, MigrationInterface, QueryRunner } from 'typeorm';
import type { TableColumnOptions } from 'typeorm/schema-builder/options/TableColumnOptions.js';

import { Table } from 'typeorm';

const TABLE_NAME = 'pending_scan';

type ColumnType =
  'date' | 'float' | 'integer' | 'text' | 'varchar' | DateConstructor;

// One column of the table. The driver of the connection maps the TypeORM
// type name to its own type.
function columnOf(
  driver: Driver,
  name: string,
  type: ColumnType,
  isNullable = true,
): TableColumnOptions {
  return { isNullable, name, type: driver.normalizeType({ type }) };
}

// The columns of the pending scan table. The types are the TypeORM names of
// the entity schema, so one migration creates the table on SQLite and
// PostgreSQL.
function columnsOf(driver: Driver): TableColumnOptions[] {
  const column = (
    name: string,
    type: ColumnType,
    isNullable = true,
  ): TableColumnOptions => columnOf(driver, name, type, isNullable);
  return [
    {
      generationStrategy: 'increment',
      isGenerated: true,
      isPrimary: true,
      name: 'id',
      type: driver.normalizeType({ type: 'integer' }),
    },
    column('code', 'varchar'),
    column('bookingType', 'varchar', false),
    column('productId', 'integer'),
    column('writeInName', 'varchar'),
    column('lookupResult', 'text'),
    column('error', 'text'),
    column('amount', 'float'),
    column('quantityUnitId', 'integer'),
    column('locationId', 'integer'),
    column('productGroupId', 'integer'),
    column('storeId', 'integer'),
    column('dueDate', 'date'),
    column('price', 'float'),
    column('priceType', 'varchar', false),
    column('note', 'text'),
    column('scannedAt', Date, false),
    column('lastLookupAt', Date),
    column('createdAt', Date, false),
    column('updatedAt', Date, false),
    column('productBarcodeId', 'integer'),
  ];
}

// This migration creates the pending scan table of ADR 0010.
export class CreatePendingScan1794369600000 implements MigrationInterface {
  // TypeORM reads the timestamp from the name. The name is explicit, so a
  // bundler that renames the class does not change it.
  name = 'CreatePendingScan1794369600000';

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
