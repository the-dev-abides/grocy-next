import type { MigrationInterface, QueryRunner } from 'typeorm';

import { TableColumn } from 'typeorm';

import { columnOf } from './table-columns.ts';

const TABLE_NAME = 'pending_scan';

// This migration adds the three fields of the Consume and the Transfer
// pending scans of ADR 0010 to the pending scan table. A row from before the
// migration gets `spoiled` false, no "to" location, and no stock entry. The
// SQL literal `false` is a boolean on PostgreSQL and on SQLite.
export class AddConsumeTransferFields1794891600000 implements MigrationInterface {
  // TypeORM reads the timestamp from the name. The name is explicit, so a
  // bundler that renames the class does not change it.
  name = 'AddConsumeTransferFields1794891600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const { driver } = queryRunner.dataSource;
    await queryRunner.addColumns(TABLE_NAME, [
      new TableColumn({
        ...columnOf(driver, 'spoiled', 'boolean', false),
        default: 'false',
      }),
      new TableColumn(columnOf(driver, 'toLocationId', 'integer')),
      new TableColumn(columnOf(driver, 'stockEntryId', 'varchar')),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns(TABLE_NAME, [
      'spoiled',
      'toLocationId',
      'stockEntryId',
    ]);
  }
}
