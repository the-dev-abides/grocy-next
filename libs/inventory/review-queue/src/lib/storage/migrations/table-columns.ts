import type { Driver } from 'typeorm';
import type { TableColumnOptions } from 'typeorm/schema-builder/options/TableColumnOptions.js';

// The column types of the review queue tables. The types are the TypeORM names
// of the entity schemas, so one migration creates a table on SQLite and
// PostgreSQL. A `Date` column is `datetime` on SQLite and `timestamp` on
// PostgreSQL. A JSON column is `text`, as the `simple-json` type of the entity
// schema stores it.
export type ColumnType =
  'date' | 'float' | 'integer' | 'text' | 'varchar' | DateConstructor;

// One column of a table. The driver of the connection maps the TypeORM type
// name to its own type.
export function columnOf(
  driver: Driver,
  name: string,
  type: ColumnType,
  isNullable = true,
): TableColumnOptions {
  return { isNullable, name, type: driver.normalizeType({ type }) };
}

// The integer auto-increment id of ADR 0014.
export function idColumnOf(driver: Driver): TableColumnOptions {
  return {
    generationStrategy: 'increment',
    isGenerated: true,
    isPrimary: true,
    name: 'id',
    type: driver.normalizeType({ type: 'integer' }),
  };
}
