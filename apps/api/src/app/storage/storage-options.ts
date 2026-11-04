import { DataSourceOptions } from 'typeorm';

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
const DEFAULT_POSTGRES_PORT = '5432';

const POSTGRES_REQUIRED = [DB_HOST, DB_NAME, DB_USER, DB_PASSWORD];

export type EnvironmentVariables = Record<string, string | undefined>;

// One DataSource serves both engines. This function reads the variables and
// builds the options. It throws on a wrong value, so the process exits with
// a clear message before the process listens. The caller adds the
// migrations.
export function readStorageOptions(
  variables: EnvironmentVariables,
): DataSourceOptions {
  const engine = variables[DB_ENGINE] ?? DEFAULT_ENGINE;
  if (!isEngine(engine)) {
    throw new Error(
      `${DB_ENGINE} must be "sqlite" or "postgres". The value is "${engine}".`,
    );
  }
  if (engine === 'postgres') {
    return readPostgresOptions(variables);
  }
  return {
    type: 'better-sqlite3',
    database: variables[DB_FILE] ?? DEFAULT_FILE,
  };
}

function readPostgresOptions(
  variables: EnvironmentVariables,
): DataSourceOptions {
  const missing = POSTGRES_REQUIRED.filter((name) => !variables[name]);
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
    type: 'postgres',
    host: variables[DB_HOST],
    port: Number(port),
    database: variables[DB_NAME],
    username: variables[DB_USER],
    password: variables[DB_PASSWORD],
  };
}

function isEngine(value: string): value is Engine {
  return (ENGINES as readonly string[]).includes(value);
}
