import { DataSourceOptions } from 'typeorm';

// The storage reads these variables. `DB_ENGINE` selects the engine. Unset
// means `sqlite`. The SQLite engine reads `DB_FILE`. The PostgreSQL engine
// reads the host, the port, the database, the user, and the password.
export const DB_ENGINE = 'DB_ENGINE';
export const DB_FILE = 'DB_FILE';
export const DB_HOST = 'DB_HOST';
export const DB_PORT = 'DB_PORT';
export const DB_NAME = 'DB_NAME';
export const DB_USER = 'DB_USER';
export const DB_PASSWORD = 'DB_PASSWORD';

const ENGINES = ['sqlite', 'postgres'] as const;
type Engine = (typeof ENGINES)[number];

const DEFAULT_ENGINE: Engine = 'sqlite';
const DEFAULT_FILE = '/data/grocy-next.db';
const DEFAULT_POSTGRES_PORT = '5432';

const POSTGRES_REQUIRED = [DB_HOST, DB_NAME, DB_USER, DB_PASSWORD];

type Variables = Record<string, string | undefined>;

// The config module calls this function at start. It throws on a wrong
// value, so the process exits with a clear message before it listens.
export function validateStorageVariables(variables: Variables): Variables {
  const engine = variables[DB_ENGINE] ?? DEFAULT_ENGINE;
  if (!isEngine(engine)) {
    throw new Error(
      `${DB_ENGINE} must be "sqlite" or "postgres". The value is "${engine}".`,
    );
  }
  if (engine === 'postgres') {
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
  }
  return variables;
}

// One DataSource serves both engines. The caller adds the migrations.
export function storageOptions(
  read: (name: string) => string | undefined,
): DataSourceOptions {
  const engine = (read(DB_ENGINE) ?? DEFAULT_ENGINE) as Engine;
  if (engine === 'postgres') {
    return {
      type: 'postgres',
      host: read(DB_HOST),
      port: Number(read(DB_PORT) ?? DEFAULT_POSTGRES_PORT),
      database: read(DB_NAME),
      username: read(DB_USER),
      password: read(DB_PASSWORD),
    };
  }
  return {
    type: 'better-sqlite3',
    database: read(DB_FILE) ?? DEFAULT_FILE,
  };
}

function isEngine(value: string): value is Engine {
  return (ENGINES as readonly string[]).includes(value);
}
