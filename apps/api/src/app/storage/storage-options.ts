import type { DataSourceOptions } from 'typeorm';

import { existsSync } from 'node:fs';
import path from 'node:path';

// The storage reads these variables. `DB_ENGINE` selects the engine. Unset
// means `sqlite`. The SQLite engine reads `DB_FILE`. The PostgreSQL engine
// reads the host, the port, the database, the user, and the password.
const DB_ENGINE = 'DB_ENGINE';
const DB_FILE = 'DB_FILE';
const DB_HOST = 'DB_HOST';
const DB_PORT = 'DB_PORT';
const DB_NAME = 'DB_NAME';
const DB_USER = 'DB_USER';
const DB_PASSWORD = 'DB_PASSWORD';

const ENGINES = ['sqlite', 'postgres'] as const;
type Engine = (typeof ENGINES)[number];

const DEFAULT_ENGINE: Engine = 'sqlite';
const DEFAULT_FILE = '/data/grocy-next.db';
// better-sqlite3 opens a database in memory for this file name.
const IN_MEMORY_FILE = ':memory:';
const DEFAULT_POSTGRES_PORT = '5432';

const POSTGRES_REQUIRED = [DB_HOST, DB_NAME, DB_USER, DB_PASSWORD];

export type EnvironmentVariables = Record<string, string | undefined>;

// One DataSource serves both engines. This function reads the variables and
// builds the options. It throws on a wrong value, so the process exits with
// a clear message before the process listens. The caller adds the
// migrations. With no argument, it reads the process environment. This file
// is the one place that reads it.
export function readStorageOptions(
  variables: EnvironmentVariables = process.env,
): DataSourceOptions {
  const engine = variables[DB_ENGINE] ?? DEFAULT_ENGINE;
  if (!isEngine(engine)) {
    throw new Error(
      `${DB_ENGINE} must be "sqlite" or "postgres". The value is "${engine}".`,
    );
  }
  return engine === 'postgres'
    ? readPostgresOptions(variables)
    : readSqliteOptions(variables);
}

// The driver retries a connection that fails. A missing folder does not
// appear after a retry, so the check stops the process at once.
function readSqliteOptions(variables: EnvironmentVariables): DataSourceOptions {
  const file = variables[DB_FILE] ?? DEFAULT_FILE;
  const folder = path.dirname(file);
  if (file !== IN_MEMORY_FILE && !existsSync(folder)) {
    throw new Error(
      `The folder "${folder}" for the SQLite file does not exist. ` +
        `Create the folder, or set ${DB_FILE} to a file in a folder that exists.`,
    );
  }
  return {
    database: file,
    type: 'better-sqlite3',
  };
}

function readPostgresOptions(
  variables: EnvironmentVariables,
): DataSourceOptions {
  const missing = POSTGRES_REQUIRED.filter((name) => isBlank(variables[name]));
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(', ')} must be set when ${DB_ENGINE} is "postgres".`,
    );
  }
  const port = variables[DB_PORT] ?? DEFAULT_POSTGRES_PORT;
  if (!/^\d+$/.test(port)) {
    throw new Error(`${DB_PORT} must be a number. The value is "${port}".`);
  }
  return {
    database: requireVariable(variables, DB_NAME),
    host: requireVariable(variables, DB_HOST),
    password: requireVariable(variables, DB_PASSWORD),
    port: Number(port),
    type: 'postgres',
    username: requireVariable(variables, DB_USER),
  };
}

// The check above lists every missing variable in one message. This
// function reads one variable after that check, so the type is a string.
function requireVariable(
  variables: EnvironmentVariables,
  name: string,
): string {
  const value = variables[name];
  if (isBlank(value)) {
    throw new Error(`${name} must be set when ${DB_ENGINE} is "postgres".`);
  }
  return value;
}

function isEngine(value: string): value is Engine {
  return ENGINES.some((engine) => engine === value);
}

function isBlank(value: string | undefined): value is '' | undefined {
  return value === undefined || value === '';
}
