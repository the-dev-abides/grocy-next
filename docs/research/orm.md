# Research: ORM, TypeORM against Drizzle and MikroORM

Ticket: [#3](https://github.com/the-dev-abides/grocy-next/issues/3). Date: 2026-11-01.

## Question

Which ORM or query layer serves Grocy Next best: TypeORM 1.x (the default),
Drizzle, or MikroORM? The criteria are:

1. One schema that runs on SQLite and on PostgreSQL.
2. Migrations.
3. Mapping of DDD aggregates.
4. Transaction control for bulk all-or-nothing writes.
5. The "database is locked" problem with SQLite under concurrent writes.

An ORM (object-relational mapper) maps classes to database tables. A query
builder only builds SQL. Drizzle is a query builder with a schema layer.

## Summary

All three libraries run on SQLite and on PostgreSQL. Only MikroORM lets one
entity set produce the correct column types on both databases without
per-database code. Drizzle needs one schema file per dialect, so it fails
criterion 1. TypeORM accepts one entity set, but each column type must be in
the support list of the active driver, so the team must restrict itself to a
portable subset.

All three generate SQL migrations from a schema diff. The generated SQL is
database-specific in all three, so the project must generate and store one
migration set per database. All three rebuild the table for SQLite column
changes.

MikroORM is the only one with a Unit of Work. One `flush()` writes all changes
in one database transaction. Cascade persist is on by default. Embeddables
cover value objects. This is the closest fit to DDD aggregates. TypeORM has
embedded entities and cascades, but cascades are off by default and there is
no change tracking. Drizzle has no entity mapping at all.

All three give an all-or-nothing transaction with savepoints for nesting.

All three use the `better-sqlite3` driver. Its busy timeout is 5000 ms by
default. TypeORM exposes the timeout and WAL mode as data source options.
MikroORM passes driver options through and maps "database is locked" to a typed
exception. Drizzle is the only one that can start a SQLite transaction with
`BEGIN IMMEDIATE`, which SQLite recommends to avoid a busy error in the middle
of a transaction.

The recommendation is MikroORM. The maintainer decides.

## Findings

### Versions

All versions come from `npm view <name> version` on 2026-11-01.

| Package | Version | Note |
|---|---|---|
| `typeorm` | 1.1.2 | 1.0.0 published 2026-05-19. `latest` tag. |
| `@nestjs/typeorm` | 12.0.2 | Maintained by the NestJS team. |
| `drizzle-orm` | 0.45.4 | `latest` tag. `rc` tag is 1.0.0-rc.5 (2026-10-21). |
| `drizzle-kit` | 0.31.11 | `latest` tag. `rc` tag is 1.0.0-rc.5. |
| `@nestjs/drizzle` | 0.0.2 | Published 2026-10-12. Maintained by the NestJS team. |
| `@mikro-orm/core` | 7.2.6 | 7.0.0 published 2026-03-11. |
| `@mikro-orm/sqlite` | 7.2.6 | Depends on `better-sqlite3` 13.0.3 and `kysely` 0.29.7. |
| `@mikro-orm/postgresql` | 7.2.6 | |
| `@mikro-orm/nestjs` | 7.1.0 | Maintained by the MikroORM team. Peer: `@nestjs/core` 11 or 12. |
| `@nestjs/core` | 12.3.2 | |
| `better-sqlite3` | 13.0.3 | TypeORM peer range is `^12.0.0`. |
| `pg` | 8.23.1 | |

Runtime requirements:

- TypeORM 1.x: Node.js 20 or later (the upgrade guide). The npm `engines`
  field says `^20.19.0 || ^22.13.0 || >=24.11.0`.
- MikroORM 7: Node.js 22.17 or later, TypeScript 5.8 or later. The package is
  native ESM (ECMAScript modules). CommonJS projects need `require(esm)`.
- Drizzle: no `engines` field.

### Criterion 1: one schema on SQLite and on PostgreSQL

**TypeORM.** The entity docs say "Column types are database-type specific".
The metadata validator runs `driver.normalizeType(column)` and throws
`DataTypeNotSupportedError` when the result is not in the driver's
`supportedDataTypes` list. The SQLite list has `datetime`, `json`, `jsonb`,
`text`, `integer`, `decimal`, `boolean`, `date`, and `blob`. It has no `uuid`,
`timestamptz`, or `enum`. The PostgreSQL list has those and many more. One
entity set works only when every column type is in both lists. The portable
column types `simple-json`, `simple-array`, and `simple-enum` help here.
`simple-enum` becomes a native enum on PostgreSQL and a `CHECK` constraint on
SQLite. A column that must be `uuid` or `timestamptz` on PostgreSQL needs a
per-driver type switch in the entity file.

**Drizzle.** The schema docs say "there is no such thing as a common table
object in drizzle". A table is `pgTable` from `drizzle-orm/pg-core` or
`sqliteTable` from `drizzle-orm/sqlite-core`. The column builders differ too.
SQLite has `integer({ mode: 'boolean' })` and `integer({ mode: 'timestamp' })`
because SQLite has no boolean or date type. PostgreSQL has `boolean()`,
`timestamp({ withTimezone: true })`, `uuid()`, `jsonb()`, and `pgEnum()`. A
project that targets both databases keeps two schema files and two relation
definitions, and keeps them equal by hand or with a generator. The relational
query API and the SQL-like API are the same on both dialects.

**MikroORM.** A property has a type class. The type class asks the active
`Platform` for the column declaration. `DateTimeType.getColumnType` returns
`platform.getDateTimeTypeDeclarationSQL(...)`. `JsonType.getColumnType`
returns `platform.getJsonDeclarationSQL()`. The default `Platform` returns
`datetime`, `boolean`, `json`, and `varchar(36)` for UUID. `SqlitePlatform`
overrides boolean to `integer` and datetime to `datetime`. One entity set
produces the correct declaration on each driver. The escape hatches
`columnType`, `defaultRaw`, and `generated` are raw SQL and are not portable.
The `forceUtcTimezone` option is on by default for SQL drivers in v7.

### Criterion 2: migrations

**TypeORM.** `typeorm migration:generate -d <datasource> <name>` compares the
entities with the connected database and writes a class with `up` and `down`.
The body is raw SQL through `queryRunner.query(...)`. The SQL is for the
connected driver. `migrationsTransactionMode` is `all` (default), `each`, or
`none`. `migrationsRun: true` runs pending migrations at start. For SQLite,
`changeColumns`, `dropColumns`, `addColumns`, `renameTable`, and every
constraint change call `recreateTable`, which builds a new table, copies the
rows, and renames it. The query runner sets `PRAGMA foreign_keys = OFF` around
the rebuild. The `migration:run` command needs compiled `.js` files or
`ts-node`.

**Drizzle.** `drizzle-kit generate` reads the schema, builds a JSON snapshot,
compares it with the last snapshot, and writes `migration.sql` plus
`snapshot.json` in a timestamped folder. `dialect` is required in
`drizzle.config.ts`. `drizzle-kit migrate` or the programmatic `migrate()`
applies the files and records them in `__drizzle_migrations`. The SQLite
migrator wraps the whole run in one `BEGIN` and `COMMIT`. For SQLite, the
`SQLiteRecreateTableConvertor` emits `PRAGMA foreign_keys=OFF`, a
`__new_<table>` create, a copy, a drop, a rename, and `PRAGMA foreign_keys=ON`.
`drizzle-kit push` applies the schema directly without files. The push docs
present it as a production flow for some teams. The `--force` flag accepts
"data-loss statements" without a prompt.

**MikroORM.** `migration:create` compares the entity metadata with a stored
snapshot and writes a class with `addSql(...)` raw SQL. The snapshot is saved
next to the migration files. `migration:up` and `migration:down` apply and
revert. Each migration runs in a transaction, and the whole run is wrapped in
a master transaction (`allOrNothing: true` by default). `migration:fresh`
drops and recreates. The v7 migration engine is built in and no longer uses
Umzug. For SQLite, `SqliteSchemaHelper.getAlterTempTableSQL` builds a
`<table>__temp_alter` table, copies the rows, and renames it, with
`pragma foreign_keys = off` around it.

In all three, one migration set per database is needed. The SQL for PostgreSQL
and for SQLite differs in type names and in the table rebuild.

### Criterion 3: mapping of DDD aggregates

An aggregate is a cluster of entities and value objects with one root. A write
saves the whole cluster or nothing. For Grocy Next, a transaction with its
bookings is one aggregate (see `GLOSSARY.md`).

**TypeORM.** TypeORM offers Active Record or Data Mapper. The docs say Data
Mapper "helps with maintainability, which is more effective in larger apps".
Embedded entities merge the columns of a value class into the owner table with
a prefix, and they can nest. Relations have `cascade` options `insert`,
`update`, `remove`, `soft-remove`, and `recover`. The default is no cascade.
The docs warn that cascades "may also bring bugs and security issues" and that
cascade remove "only traverses relations that are populated on the object".
`save()` with an array "saves all given entities in a single transaction".
There is no identity map and no change tracking. `save()` loads the current
row, compares, and writes the difference.

**Drizzle.** Drizzle describes itself as "a headless TypeScript ORM with a
head" and says "If you know SQL, you know Drizzle". Rows are plain objects.
Relational queries return nested objects for reads. The docs show no nested
writes. The application maps an aggregate to rows and back by hand, and writes
each table in a `db.transaction`. This is the most code but also the most
explicit.

**MikroORM.** MikroORM implements Unit of Work and Identity Map. Loading the
same primary key twice returns the same instance. `em.persist(root)` marks the
root. `em.flush()` computes the change set of every managed entity and writes
only the changed fields. Cascade persist is on by default, so persisting the
root persists new children. `orphanRemoval: true` deletes a child that the
code removes from a collection. Embeddables map a value object inline with a
prefix, as a JSON column with `object: true`, as a JSON array, or as a
polymorphic set with a discriminator. `flush()` batches one query per
operation per entity type. This matches the aggregate pattern: load the root,
mutate the object graph, flush.

The cost is discipline. Every request needs its own `EntityManager` fork. The
NestJS package registers a `RequestContext` middleware for HTTP. Queue
handlers and scheduled jobs need `@CreateRequestContext()`. Use of the global
`EntityManager` outside a context throws a `ValidationError`.

### Criterion 4: transactions for bulk all-or-nothing writes

The requirements ask for bulk create, update, and delete with a result per
item, and an all-or-nothing option. The result per item needs application code
in all three.

**TypeORM.** `dataSource.transaction(async (manager) => { ... })` or a manual
`QueryRunner` with `startTransaction`, `commitTransaction`, and
`rollbackTransaction`. All work inside the callback must use the given manager.
`transactionSupport` is `nested` for SQLite and for PostgreSQL. Nested calls
use `SAVEPOINT typeorm_<depth>`. An isolation level can be passed per
transaction or set as a `DataSource` default. The NestJS docs recommend the
`QueryRunner` form "because it gives you full control over the transaction".
There is no decorator. Transaction propagation across services needs a library
such as `nestjs-cls` or explicit manager passing.

**Drizzle.** `db.transaction(async (tx) => { ... })`. `tx.rollback()` throws
and rolls back. Nested `tx.transaction` uses `savepoint sp<n>`. On PostgreSQL,
`isolationLevel`, `accessMode`, and `deferrable` can be set. On SQLite,
`behavior` can be `deferred` (default), `immediate`, or `exclusive`. The NestJS
docs say queries must run through `tx`, and that a repository method on the
injected database does not join a transaction started elsewhere. They suggest
`nestjs-cls` for propagation.

**MikroORM.** `em.flush()` wraps all queued writes in one transaction.
`em.transactional(cb)` starts an explicit transaction and flushes before
commit. `em.begin()`, `em.commit()`, and `em.rollback()` give manual control.
`@Transactional()` wraps a method. Propagation options are `REQUIRED` (the
decorator default), `NESTED` (the `em.transactional` default, a savepoint),
`REQUIRES_NEW`, `SUPPORTS`, `MANDATORY`, `NOT_SUPPORTED`, and `NEVER`.
Isolation levels are `READ_UNCOMMITTED`, `READ_COMMITTED`, `SNAPSHOT`,
`REPEATABLE_READ`, and `SERIALIZABLE`. The transaction context is carried by
the `EntityManager` fork, so service methods do not pass a handle.

### Criterion 5: "database is locked" with SQLite

SQLite facts, from sqlite.org:

- `SQLITE_BUSY` means the file "could not be written (or in some cases read)
  because of concurrent activity by some other database connection, usually a
  database connection in a separate process".
- In WAL (write-ahead log) mode, readers do not block writers and writers do
  not block readers. There is still "only one writer at a time". WAL mode is
  stored in the file, so one `PRAGMA journal_mode=WAL` applies to every later
  connection.
- `SQLITE_BUSY_SNAPSHOT` occurs in WAL mode when a read transaction tries to
  become a write transaction after another connection wrote.
- "To avoid encountering SQLITE_BUSY errors in the middle of a transaction,
  the application can use BEGIN IMMEDIATE instead of just BEGIN."
- `PRAGMA busy_timeout` sets how long a connection waits for a lock.

Driver facts, from the `better-sqlite3` docs:

- The constructor option `timeout` is "the number of milliseconds to wait when
  executing queries on a locked database" before `SQLITE_BUSY`. Default 5000.
- The performance guide recommends `db.pragma('journal_mode = WAL')`.
- `.transaction()` has `.deferred()`, `.immediate()`, and `.exclusive()`
  variants.

The current Grocy problem comes from PHP, where each request is a separate
process. Grocy Next is one Node.js process. All three libraries use
`better-sqlite3` by default. The lock risk is then another process on the same
file, for example a backup, the Grocy importer, or a CLI migration while the
server runs.

**TypeORM.** The `better-sqlite3` data source options are `timeout` (default
5000), `enableWAL` (default `false`), `prepareDatabase` (a hook with the raw
driver object), `readonly`, `fileMustExist`, and `statementCacheSize`. The
driver runs `PRAGMA foreign_keys = ON` and, with `enableWAL`,
`PRAGMA journal_mode = WAL` at connect. Functional tests check both. The
transaction starts with `BEGIN TRANSACTION` (deferred). The 1.0 upgrade guide
renames `busyTimeout` to `timeout` and drops the `sqlite3` package.

**Drizzle.** The application constructs `new Database(path, { timeout })` and
runs the WAL pragma itself. Drizzle adds the `behavior: 'immediate'`
transaction option, which calls the driver's `.immediate()` and so issues
`BEGIN IMMEDIATE`. This is the only one of the three that exposes the SQLite
recommendation directly.

**MikroORM.** `SqliteConnection.createKyselyDialect` calls
`new Database(dbName, options)` with the `driverOptions` object, so
`driverOptions: { timeout: 10000 }` reaches the driver. The connection runs
`pragma foreign_keys = on` at connect. There is no WAL option. The
`onCreateConnection` hook is ignored by SQLite. The application can run the
pragma once through `em.execute(...)` or `getNativeClient()`, and WAL then
persists in the file. `SqliteExceptionConverter` maps "database is locked" to
`LockWaitTimeoutException`, which lets a service catch one typed error and
retry. The `BEGIN` form that Kysely issues was not verified.

### NestJS integration

- `@nestjs/typeorm` 12.0.2: `forRoot`, `forFeature`, `autoLoadEntities`,
  `retryAttempts`. The NestJS team maintains it. The docs chapter is the most
  detailed of the three.
- `@nestjs/drizzle` 0.0.2: `DrizzleModule.forRoot({ drizzle, connection })` or
  a prebuilt `db`, `@InjectDrizzle()`, `autoCloseConnection`. The NestJS team
  maintains it. The docs chapter installs `drizzle-orm@rc`, that is 1.0.0-rc.5,
  and says the module also supports 0.35 and later.
- `@mikro-orm/nestjs` 7.1.0: `MikroOrmModule.forRoot`, `forFeature`,
  `autoLoadEntities`, automatic `RequestContext` middleware,
  `@CreateRequestContext()`. The MikroORM team maintains it. The NestJS docs
  say issues go to the `mikro-orm/nestjs` repository.

### Maturity and activity

From the GitHub API and the npm download API on 2026-11-01:

| Repository | Stars | Open issues | Last push | Weekly downloads |
|---|---|---|---|---|
| typeorm/typeorm | 36666 | 732 | 2026-10-29 | 7.2 M |
| drizzle-team/drizzle-orm | 36201 | 2061 | 2026-10-30 | 42.8 M |
| mikro-orm/mikro-orm | 9264 | 48 | 2026-11-01 | 1.4 M |

TypeORM 1.0 removed the `sqlite3` driver, `findByIds`, custom repositories by
decorator, and the `TYPEORM_*` environment variables. The `@typeorm/codemod`
package automates most of the upgrade. MikroORM 7 replaced Knex with Kysely,
renamed `@mikro-orm/knex` to `@mikro-orm/sql`, moved decorators to
`@mikro-orm/decorators`, and removed `persistAndFlush`. Drizzle 1.0 is a release
candidate with a new relational query API (`defineRelations`).

## Comparison table

| Criterion | TypeORM 1.1.2 | Drizzle 0.45.4 | MikroORM 7.2.6 |
|---|---|---|---|
| One schema, SQLite and PostgreSQL | Yes, with a portable type subset. Validator throws on an unsupported type. | No. One schema file per dialect. | Yes. Platform picks the column type. |
| Migration generation | Entity diff against the live database. Raw SQL per driver. | Snapshot diff. Raw SQL per dialect. | Snapshot diff. Raw SQL per driver. |
| Migration run transaction | `all`, `each`, or `none`. | SQLite: one `BEGIN`/`COMMIT` for the run. | Each in a transaction, plus a master transaction. |
| SQLite table rebuild | `recreateTable`. | `SQLiteRecreateTableConvertor`. | `getAlterTempTableSQL`. |
| Aggregate mapping | Embedded entities, cascades off by default, no change tracking. | None. Hand mapping. | Unit of Work, identity map, cascade persist default, embeddables. |
| All-or-nothing write | `dataSource.transaction` or `QueryRunner`. Savepoints. | `db.transaction`. Savepoints. | `flush()` is one transaction. `transactional`, decorator, propagation. |
| Busy timeout | `timeout` option. | Driver constructor by hand. | `driverOptions.timeout` passthrough. |
| WAL | `enableWAL` option. | Pragma by hand. | Pragma by hand. |
| `BEGIN IMMEDIATE` | No. | `behavior: 'immediate'`. | Not verified. |
| Typed lock error | No. | No. | `LockWaitTimeoutException`. |
| NestJS package | `@nestjs/typeorm` 12.0.2, NestJS team. | `@nestjs/drizzle` 0.0.2, NestJS team. | `@mikro-orm/nestjs` 7.1.0, MikroORM team. |
| Node.js minimum | 20 | Not stated | 22.17 |
| Module format | CJS and ESM | CJS and ESM | ESM only |
| Weekly downloads | 7.2 M | 42.8 M | 1.4 M |
| Open issues | 732 | 2061 | 48 |

## Recommendation

Use MikroORM 7 with `@mikro-orm/sqlite`, `@mikro-orm/postgresql`, and
`@mikro-orm/nestjs`.

Reason: MikroORM is the only option that meets criterion 1 and criterion 3
without extra code. One entity set produces correct columns on SQLite and on
PostgreSQL because the platform decides the type. The Unit of Work makes an
aggregate write one `flush()` in one transaction, which is also the
all-or-nothing bulk write that the requirements ask for. The migration engine
wraps a run in a master transaction. The lock error has a typed exception.

Costs to accept:

- The community is smaller. Weekly downloads are one fifth of TypeORM.
- MikroORM 7 is eight months old and ESM only. It needs Node.js 22.17.
- Every non-HTTP entry point needs a request context decorator.
- The project still keeps two migration folders, one per database. This is
  true for all three options.
- WAL mode and the busy timeout need a few lines of startup code.

If the maintainer keeps TypeORM, the costs are: a per-driver type switch for
`uuid` and `timestamptz` columns, no change tracking, cascades that must be
enabled per relation, and 732 open issues. The benefits are the largest
NestJS documentation and first-class `timeout` and `enableWAL` options.

Drizzle is not recommended for this project. The two-schema requirement
conflicts with criterion 1. The 1.0 release is still a release candidate.

## Sources

TypeORM:

- Release 1.0.0: https://github.com/typeorm/typeorm/releases/tag/1.0.0
- Upgrading from 0.3 to 1.0: https://github.com/typeorm/typeorm/blob/master/docs/docs/releases/1.0/02-upgrading-from-0.3.md
- Data source options: https://typeorm.io/docs/data-source/data-source-options
- SQLite driver: https://github.com/typeorm/typeorm/blob/master/docs/docs/drivers/sqlite.md
- PostgreSQL driver: https://typeorm.io/docs/drivers/postgres
- Entities and column types: https://typeorm.io/docs/entity/entities
- Embedded entities: https://typeorm.io/docs/entity/embedded-entities
- Relations and cascades: https://typeorm.io/docs/relations/relations
- Active Record and Data Mapper: https://typeorm.io/docs/guides/active-record-data-mapper
- Repository API, `save`: https://typeorm.io/docs/working-with-entity-manager/repository-api
- Transactions: https://github.com/typeorm/typeorm/blob/master/docs/docs/transactions.mdx
- Migrations setup: https://github.com/typeorm/typeorm/blob/master/docs/docs/migrations/02-setup.md
- Migrations generating: https://github.com/typeorm/typeorm/blob/master/docs/docs/migrations/04-generating.md
- Migrations executing: https://github.com/typeorm/typeorm/blob/master/docs/docs/migrations/05-executing.md
- Source, `BetterSqlite3Driver.ts`: https://github.com/typeorm/typeorm/blob/master/packages/typeorm/src/driver/better-sqlite3/BetterSqlite3Driver.ts
- Source, `AbstractSqliteQueryRunner.ts`: https://github.com/typeorm/typeorm/blob/master/packages/typeorm/src/driver/sqlite-abstract/AbstractSqliteQueryRunner.ts
- Source, `AbstractSqliteDriver.ts`: https://github.com/typeorm/typeorm/blob/master/packages/typeorm/src/driver/sqlite-abstract/AbstractSqliteDriver.ts
- Source, `PostgresDriver.ts`: https://github.com/typeorm/typeorm/blob/master/packages/typeorm/src/driver/postgres/PostgresDriver.ts
- Source, `EntityMetadataValidator.ts`: https://github.com/typeorm/typeorm/blob/master/packages/typeorm/src/metadata-builder/EntityMetadataValidator.ts
- Source, `BaseDataSourceOptions.ts`: https://github.com/typeorm/typeorm/blob/master/packages/typeorm/src/data-source/BaseDataSourceOptions.ts
- Tests, `enable-wal.test.ts` and `busy-timeout.test.ts`: https://github.com/typeorm/typeorm/tree/master/packages/typeorm/test/functional/driver/better-sqlite3

Drizzle:

- Overview: https://orm.drizzle.team/docs/overview
- Schema declaration: https://orm.drizzle.team/docs/sql-schema-declaration
- SQLite column types: https://orm.drizzle.team/docs/column-types/sqlite
- PostgreSQL column types: https://orm.drizzle.team/docs/column-types/pg
- SQLite drivers: https://orm.drizzle.team/docs/get-started-sqlite
- Relational queries: https://orm.drizzle.team/docs/rqb
- Transactions: https://orm.drizzle.team/docs/transactions
- Drizzle Kit overview: https://orm.drizzle.team/docs/kit-overview
- `drizzle-kit generate`: https://orm.drizzle.team/docs/drizzle-kit-generate
- `drizzle-kit migrate`: https://orm.drizzle.team/docs/drizzle-kit-migrate
- `drizzle-kit push`: https://orm.drizzle.team/docs/drizzle-kit-push
- Source, `better-sqlite3/session.ts`: https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/better-sqlite3/session.ts
- Source, `sqlite-core/session.ts`: https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/sqlite-core/session.ts
- Source, `sqlite-core/dialect.ts` (migrate): https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-orm/src/sqlite-core/dialect.ts
- Source, `drizzle-kit/src/sqlgenerator.ts`: https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-kit/src/sqlgenerator.ts

MikroORM:

- Upgrading v6 to v7: https://mikro-orm.io/docs/upgrading-v6-to-v7
- Usage with SQL drivers: https://mikro-orm.io/docs/usage-with-sql
- Configuration: https://github.com/mikro-orm/mikro-orm/blob/master/docs/docs/configuration.md
- Defining entities: https://mikro-orm.io/docs/defining-entities
- Embeddables: https://mikro-orm.io/docs/embeddables
- Cascading: https://mikro-orm.io/docs/cascading
- Unit of Work: https://mikro-orm.io/docs/unit-of-work
- Entity manager: https://mikro-orm.io/docs/entity-manager
- Transactions: https://mikro-orm.io/docs/transactions
- Migrations: https://github.com/mikro-orm/mikro-orm/blob/master/docs/docs/migrations.md
- Usage with NestJS: https://mikro-orm.io/docs/usage-with-nestjs
- Source, `SqliteConnection.ts`: https://github.com/mikro-orm/mikro-orm/blob/master/packages/sqlite/src/SqliteConnection.ts
- Source, `BaseSqliteConnection.ts`: https://github.com/mikro-orm/mikro-orm/blob/master/packages/sql/src/dialects/sqlite/BaseSqliteConnection.ts
- Source, `SqliteExceptionConverter.ts`: https://github.com/mikro-orm/mikro-orm/blob/master/packages/sql/src/dialects/sqlite/SqliteExceptionConverter.ts
- Source, `SqliteSchemaHelper.ts`: https://github.com/mikro-orm/mikro-orm/blob/master/packages/sql/src/dialects/sqlite/SqliteSchemaHelper.ts
- Source, `SqlitePlatform.ts`: https://github.com/mikro-orm/mikro-orm/blob/master/packages/sql/src/dialects/sqlite/SqlitePlatform.ts
- Source, `Platform.ts`: https://github.com/mikro-orm/mikro-orm/blob/master/packages/core/src/platforms/Platform.ts
- Source, `DateTimeType.ts` and `JsonType.ts`: https://github.com/mikro-orm/mikro-orm/tree/master/packages/core/src/types
- Source, `NodeSqliteDialect.ts`: https://github.com/mikro-orm/mikro-orm/blob/master/packages/sql/src/dialects/sqlite/NodeSqliteDialect.ts

NestJS:

- Database overview: https://docs.nestjs.com/techniques/database
- TypeORM: https://docs.nestjs.com/data/typeorm
- Drizzle: https://docs.nestjs.com/data/drizzle
- MikroORM: https://docs.nestjs.com/data/mikroorm

SQLite and `better-sqlite3`:

- WAL mode: https://sqlite.org/wal.html
- Result codes, `SQLITE_BUSY`: https://sqlite.org/rescode.html#busy
- Pragmas, `busy_timeout` and `journal_mode`: https://sqlite.org/pragma.html#pragma_busy_timeout
- Isolation: https://sqlite.org/isolation.html
- ALTER TABLE: https://sqlite.org/lang_altertable.html
- `better-sqlite3` API: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- `better-sqlite3` performance: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md

Registries and repository metadata:

- `npm view <name> version`, `npm view <name> time`, `npm view <name> engines` on 2026-11-01.
- GitHub REST API `repos/{owner}/{repo}` on 2026-11-01.
- npm downloads API `api.npmjs.org/downloads/point/last-week/<name>` on 2026-11-01.
