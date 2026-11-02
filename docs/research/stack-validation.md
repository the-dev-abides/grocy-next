# Stack validation

Date of the check: 2026-11-02.
Ticket: GitHub issue #26, "Validate or disprove the proposed stack".
Parent map: GitHub issue #1.

This document records facts. It does not choose. The grilling ticket "Decide
the stack" chooses.

## Method

The proposed stack is NestJS, TypeORM, React, Redux, shadcn/ui, Tailwind, and
NX. For each part, this document records four checks:

1. The current stable version. Verified with `npm view <name> version` on
   2026-11-02.
2. The maintenance state. Measured from the GitHub repository on 2026-11-02:
   release dates, open issues, issues opened and closed since 2026-05-01, and
   commit authors since 2026-05-01.
3. SQLite and PostgreSQL support, where it applies.
4. Known problems.

A part fails a check when the data shows a problem that the project must
manage. For each failed check, this document names one alternative and gives
the reason.

Sources are primary only: the project repositories, the release pages, the
npm registry, and the official documentation.

## Context that applies to every part

Node.js release lines on 2026-11-02 (nodejs.org/en/about/previous-releases):

- Node 20 reached end of life in March 2026.
- Node 22, 24, and 26 are LTS lines. Node 26 is the latest LTS.
- Node 27 is in the Alpha phase.

Several parts set a minimum Node version. The minimums are listed per part.

## Summary table

| Part | Version | Released | Check result |
| --- | --- | --- | --- |
| NestJS (`@nestjs/core`) | 12.3.2 | 2026-10-27 | Passes. Two cautions. |
| TypeORM (`typeorm`) | 1.1.2 | 2026-10-08 | Fails the open issue trend check. |
| React (`react`) | 19.3.1 | 2026-10-14 | Passes. |
| Redux (`@reduxjs/toolkit`) | 2.13.0 | 2026-09-29 | Fails the open issue trend check. |
| shadcn/ui (`shadcn` CLI) | 4.23.0 | 2026-10-27 | Passes. Two cautions. |
| Tailwind (`tailwindcss`) | 4.3.3 | 2026-07-16 | Passes. |
| NX (`nx`) | 24.0.3 | 2026-10-30 | Fails the NestJS 12 integration check. |

## NestJS

### Version

- `@nestjs/core` 12.3.2, released 2026-10-27. NestJS 12.0.0 was released
  2026-08-27.
- The 11.x line still gets patches: 11.2.8 was released 2026-10-23.
- Companion packages: `@nestjs/platform-express` 12.3.2,
  `@nestjs/platform-fastify` 12.3.2, `@nestjs/typeorm` 12.0.2.
  `@nestjs/drizzle` exists and accepts NestJS 11 and 12.
- Node minimum: 20.19 or 22.12 to run an application. The CLI schematics
  (`nest new`, `nest generate`, `nest upgrade`) need Node 22.22.3, 24.15, or
  26. Source: docs.nestjs.com/migration-guide. The `package.json` in the repo
  sets `engines.node` to `>= 20`.

### Maintenance

- Repository nestjs/nest: 76,968 stars, MIT license, last push 2026-11-02.
- Open issues: 10. Issues opened since 2026-05-01: 152. Issues closed since
  2026-05-01: 158. The backlog is flat and small.
- Releases: a minor or patch release every one to three weeks since
  September 2026 (12.0.3, 12.0.4, 12.1.0, 12.1.1, 12.1.3, 12.2.0, 12.3.0).
- Commit authors since 2026-05-01: kamilmysliwiec 707 commits, renovate bot
  462, dependabot 165, the next human author 25. One person writes almost all
  of the code.
- Funding: the support page says "Nest isn't backed by a large company that
  continuously pays for the hours spent on its development." Funding is
  OpenCollective, PayPal, and three principal sponsors.
- The support page does not give a long-term support policy for major
  versions.

### SQLite and PostgreSQL

Does not apply. NestJS is database-agnostic. The database docs say "The Nest
team maintains the @nestjs/typeorm, @nestjs/drizzle, @nestjs/mongoose, and
@nestjs/sequelize packages." Prisma has no Nest-specific package. The MikroORM
team maintains `@mikro-orm/nestjs`.

### Known problems

- NestJS 12 ships all core packages as ESM. CommonJS applications keep working
  through `require(esm)`. The migration guide says: on Node versions before
  24.9, Jest cannot load the ESM-only v12 packages. The guide recommends Node
  24.9 or later, or Vitest. New projects default to ESM, Vitest, and oxlint.
- The NX plugin for NestJS does not accept NestJS 12. See the NX section.
- One maintainer writes almost all of the code. This is a continuity risk, not
  a current defect.
- Changes in v12 that need review after an upgrade: lifecycle hook order
  changed, `@Optional()` inheritance changed, Joi 18 is required for
  `@nestjs/config`, the legacy Terminus API was removed.

### Result

Passes. Cautions: Jest on Node below 24.9, and the NX plugin gap.

Sources: github.com/nestjs/nest/releases/tag/v12.0.0,
docs.nestjs.com/migration-guide, docs.nestjs.com/techniques/database,
docs.nestjs.com/support, npm registry.

## TypeORM

### Version

- `typeorm` 1.1.2, released 2026-10-08. TypeORM 1.0.0 was released 2026-05-19
  after years on the 0.3.x line. 1.1.0 followed on 2026-07-13 and 1.1.1 on
  2026-09-01.
- The 0.3.x line got its last release, 0.3.31, on 2026-07-13.
- Node minimum: `engines.node` is `^20.19.0 || ^22.13.0 || >=24.11.0`. The
  release notes say Node 20+ and target ES2023.
- `@nestjs/typeorm` 12.0.2 declares the peer range
  `typeorm: ^0.3.0 || ^1.0.0-dev`. TypeORM 1.1.2 satisfies that range
  (checked with `semver -r`).

### Maintenance

- Repository typeorm/typeorm: 36,665 stars, MIT license, last push
  2026-10-29.
- Open issues: 477. Of these, 206 were opened before 2024-01-01.
- Issues opened since 2026-05-01: 119. Issues closed since 2026-05-01: 64.
  The backlog grows.
- Commit authors since 2026-05-01: dependabot 15, Cprakhar 10, alumni 10,
  smith-xyz 9, michaelbromley 9, naorpeled 8, IbrahimHafez1 7,
  kyungseopk1m 6. The work is spread over several people.
- The maintainers page lists 13 people: two steering members, one technical
  lead (alumni), and ten maintainers. Funding is OpenCollective and direct
  sponsorship.
- A security policy exists (`SECURITY.md`). It defines what TypeORM
  guarantees: values are bound as parameters, database content is treated as
  data.
- Releases: one patch every one to two months since 1.0.0. Nightly builds
  publish daily.

### SQLite and PostgreSQL

- SQLite: `better-sqlite3` is the only Node driver. The 1.0 upgrade guide
  says: "`sqlite3` dropped. Use `type: \"better-sqlite3\"`." The `flags`
  option was removed. `busyTimeout` was renamed to `timeout`. `jsonb` columns
  need SQLite 3.45.0 or newer. The docs do not mention `node:sqlite`.
  `better-sqlite3` is at 13.0.3, released 2026-08-05.
- PostgreSQL: the `pg` package is the only driver. `pg` is at 8.23.1. 1.0
  added partial index support, `ALTER TYPE ... ADD VALUE` for enum changes,
  an `installExtensions` option, and a `timestamptz` fix. `int8` values come
  back as strings by default.
- Both drivers are in the same package, so one entity model serves both
  databases.

### Known problems

- The 1.0 release removed a large API surface: `Connection`, the global
  functions (`getRepository`, `createConnection`), `findByIds`,
  `findOneById`, `AbstractRepository`, `@RelationCount`, the IoC container,
  `printSql()`, string-array `select` and `relations`, the `join` find
  option, and `TYPEORM_*` environment config. Guides and examples on the web
  that predate May 2026 do not match 1.x.
- Runtime behavior changed in 1.0: `invalidWhereValuesBehavior` now throws
  on `null` or `undefined` in a where clause. The guide calls this "the most
  likely runtime breaker". Non-nullable relations now use INNER JOIN.
- The open issue backlog is large and grows. 206 issues are more than two
  years old.
- TypeORM supports both Active Record and Data Mapper. A project that applies
  DDD must pick Data Mapper and enforce it by convention.

### Result

Fails the open issue trend check. Passes the version, maintainer, SQLite, and
PostgreSQL checks.

Alternative: MikroORM (`@mikro-orm/core` 7.2.6, released 2026-10-31). Reason:
it is built on the Data Mapper, Unit of Work, and Identity Map patterns, which
match DDD. It supports SQLite through `@mikro-orm/sqlite` and PostgreSQL
through `@mikro-orm/postgresql`. The MikroORM team maintains
`@mikro-orm/nestjs`. The repository reports 24 open issues and a push on
2026-11-02.

Note: the NestJS team itself maintains `@nestjs/drizzle`. Drizzle
(`drizzle-orm` 0.45.4) supports `better-sqlite3`, `node:sqlite`, `libsql`, and
`pg`. Drizzle is a query builder with a schema, not an entity ORM. It is a
second option, not the named alternative.

Sources: github.com/typeorm/typeorm/releases/tag/1.0.0,
typeorm.io/docs/releases/1.0/release-notes,
typeorm.io/docs/releases/1.0/upgrading-from-0.3,
typeorm.io/docs/drivers/sqlite, typeorm.io/docs/drivers/postgres,
github.com/typeorm/typeorm/blob/master/SECURITY.md,
github.com/typeorm/typeorm/blob/master/docs/src/pages/maintainers.json,
mikro-orm.io/docs/usage-with-sql, orm.drizzle.team/docs/get-started-sqlite,
npm registry.

## React

### Version

- `react` and `react-dom` 19.3.1, released 2026-10-14. React 19.3.0 was
  released 2026-09-09. Patches for 19.0, 19.1, and 19.2 shipped the same day
  as 19.3.1.
- No Node minimum applies to the browser bundle.

### Maintenance

- Repository facebook/react: 252,093 stars, MIT license, last push
  2026-10-31.
- GitHub reports 1,491 open issues and pull requests together. The open pull
  requests fill about seven pages of 100. The GitHub issue search API refused
  per-type counts for this repository.
- Commit authors since 2026-05-01: hoxyq 49, eps1lon 42, gnoff 20,
  jackpope 17, unstubbable 12, sophiebits 10, poteto 10, javache 8. The work
  is spread over a team.
- Governance: since 2026-02-24, "React, React Native, and supporting
  projects like JSX are no longer owned by Meta — they are now owned by the
  React Foundation, an independent foundation hosted by the Linux
  Foundation." Eight platinum members: Amazon, Callstack, Expo, Huawei, Meta,
  Microsoft, Software Mansion, Vercel. Technical direction stays with the
  maintainers.
- Release cadence: one minor per year (19.0 December 2024, 19.1 2025, 19.2
  October 2025, 19.3 September 2026) with patches between.

### SQLite and PostgreSQL

Does not apply.

### Known problems

- React 19.3 lists no breaking changes and no deprecations. Behavior changes
  to review: transitions render independently, Strict Mode double-invokes
  effects during hydration, `useId` uses underscores since 19.2.
- `<ViewTransition>` "only works in the DOM."
- Peer ranges in the rest of the stack accept React 19: `react-redux`
  (`^18.0 || ^19`), `radix-ui` (`^19.0`), `@base-ui/react` (`^19`).

### Result

Passes.

Sources: react.dev/versions, react.dev/blog/2026/09/09/react-19-3,
react.dev/blog/2026/02/24/the-react-foundation,
github.com/facebook/react/blob/main/CHANGELOG.md, npm registry.

## Redux

### Version

- `@reduxjs/toolkit` 2.13.0, released 2026-09-29. 2.12.0 was released
  2026-05-15.
- `react-redux` 9.3.1, released 2026-10-27.
- `redux` core 5.0.1, released 2023-12-23. No core release since.
- The official docs say Redux Toolkit "is our official recommended approach
  for writing Redux logic." The docs label core-only code as the "Legacy
  Example".
- Peer ranges: Redux Toolkit accepts React 16.9 to 19 and react-redux 7.2 to
  9. react-redux accepts React 18 and 19 and redux 5.

### Maintenance

- Repository reduxjs/redux-toolkit: 11,239 stars, MIT license, last push
  2026-11-02. Repository reduxjs/redux: last push 2026-10-20.
- Open issues: 250. Issues opened since 2026-05-01: 96. Issues closed since
  2026-05-01: 59. The backlog grows.
- Commit authors since 2026-05-01: markerikson 38, aryaemami59 18,
  EskiMojo14 9, KasimAhmic 8. One person writes about 40 percent of the
  code.
- Releases: two feature releases in 2026 (May and September). Four patch or
  minor releases in late 2025.
- 2.13.0 moved the build to TSDown and pnpm, set the TypeScript floor to
  5.6, and added TypeScript 7 to the CI matrix.

### SQLite and PostgreSQL

Does not apply.

### Known problems

- The redux core package has had no release since December 2023. The core is
  small and complete, so this is stability, not neglect. All work happens in
  Redux Toolkit.
- The open issue backlog grows slowly.
- 2.12.0 renamed `IgnorePaths` to `IgnoredPaths` and switched to the
  built-in `NoInfer` type (TypeScript 5.4+). The PR carried a
  breaking-change marker.
- For a client that mostly reads and writes a server API, the official
  server-state tool inside Redux is RTK Query. Plain slices for server data
  are not the recommended path.

### Result

Fails the open issue trend check. Passes the version and maintainer checks.

Alternative: TanStack Query (`@tanstack/react-query` 5.105.2, released
2026-11-02). Reason: it manages server state (fetch, cache, invalidate) with
no store boilerplate. The repository reports 50 open issues and a push on
2026-11-02. It does not manage client-only state. A project that drops Redux
needs a small client-state tool next to it, for example Zustand 5.0.16.

Sources: github.com/reduxjs/redux-toolkit/releases,
redux.js.org/introduction/getting-started, npm registry.

## shadcn/ui

### Version

- `shadcn` CLI 4.23.0, released 2026-10-27. CLI v4 shipped in March 2026.
- `engines.node` in the CLI package is `>=20.18.1`.
- shadcn/ui is not a dependency. The docs say: "This is not a component
  library. It is how you build your component library." The CLI copies
  component source into the project. Upgrades are manual per component.
- Primitive libraries: Base UI (`@base-ui/react` 1.9.0, released
  2026-10-09) is the default since July 2026. Radix (`radix-ui` 1.8.1,
  released 2026-10-12) is still supported. React Aria is a third option.
- Tailwind v4 support since February 2025. React 19 support since October
  2024.

### Maintenance

- Repository shadcn-ui/ui: 127,183 stars, MIT license, last push 2026-11-02.
- Open issues: 785. Open pull requests: 987. Issues opened since 2026-05-01:
  284. Issues closed since 2026-05-01: 433. The backlog shrinks.
- Commit authors since 2026-05-01: shadcn 196, dependabot 101,
  github-actions 37, the next human author 5. One person writes almost all
  of the code.
- Changelog entries in 2026: one or more per month, every month.
- Radix repository radix-ui/primitives: 133 open issues, 577 closed since
  2026-05-01, last push 2026-10-14.
- Base UI repository mui/base-ui: last push 2026-11-02, monthly releases
  (1.7.0 August, 1.8.0 September, 1.9.0 October 2026).

### SQLite and PostgreSQL

Does not apply.

### Known problems

- One maintainer writes almost all of the code. This is a continuity risk.
- Base UI became the default in July 2026. "New projects now use Base UI by
  default. Radix is still fully supported." Every new component ships for
  both, "unless a component exists only in Base UI." A project must pick one
  primitive library at `init` time (`-b radix` keeps Radix).
- The Radix style now imports from the single `radix-ui` package, not from
  `@radix-ui/react-*` packages. A `shadcn migrate radix` command does the
  move.
- 987 open pull requests show that outside contributions wait a long time.

### Result

Passes. Cautions: single maintainer, and the Base UI or Radix choice.

Sources: ui.shadcn.com/docs, ui.shadcn.com/docs/changelog,
ui.shadcn.com/docs/changelog/2026-07-base-ui-default,
ui.shadcn.com/docs/changelog/2026-03-cli-v4,
ui.shadcn.com/docs/changelog/2026-02-radix-ui, npm registry.

## Tailwind

### Version

- `tailwindcss` 4.3.3, released 2026-07-16. 4.3.0 was released 2026-05-08.
- No Node minimum is declared in `engines`.
- Browser floor for v4: Chrome 111, Safari 16.4, Firefox 128.

### Maintenance

- Repository tailwindlabs/tailwindcss: 98,289 stars, MIT license, last push
  2026-11-02.
- Open issues: 44. Issues opened since 2026-05-01: 121. Issues closed since
  2026-05-01: 137. The backlog is small and flat.
- Commit authors since 2026-05-01: RobinMalfait 115, depfu bot 12, the next
  human author 5. One person writes almost all of the code.
- Releases: monthly from February to July 2026 (4.2.0, 4.2.1, 4.2.2, 4.2.3,
  4.2.4, 4.3.0, 4.3.1, 4.3.2, 4.3.3). No stable release since 2026-07-16.
  Insider builds publish daily, the last on 2026-11-02.

### SQLite and PostgreSQL

Does not apply.

### Known problems

- No stable release in three and a half months. Daily insider builds show
  the work continues.
- One maintainer writes almost all of the code.
- v4 is "not designed to be used with CSS preprocessors like Sass, Less, or
  Stylus." The docs do not recommend CSS modules with Tailwind.
- 4.2.0 deprecated `start-*` and `end-*` utilities in favor of `inset-s-*`
  and `inset-e-*`.
- The browser floor excludes Safari before 16.4 (March 2023).

### Result

Passes.

Sources: github.com/tailwindlabs/tailwindcss/releases,
tailwindcss.com/docs/compatibility, npm registry.

## NX

### Version

- `nx` 24.0.3, released 2026-10-30. Nx 24.0.0 was released 2026-10-21.
- Plugins: `@nx/nest` 24.0.3, `@nx/react` 24.0.3, `@nx/vite` 24.0.3.
- No Node minimum is declared in `engines`. The Nx 24 release post says
  `nx serve` for TypeScript source with `node --watch` "needs Node.js 22.18
  or later."

### Maintenance

- Repository nrwl/nx: 29,443 stars, MIT license, last push 2026-11-02.
- Open issues: 264. Issues opened since 2026-05-01: 382. Issues closed since
  2026-05-01: 469. The backlog shrinks.
- Commit authors since 2026-05-01: FrozenPandaz 367, leosvelperez 278,
  jaysoo 217, AgentEnder 141, juristr 26. A paid team maintains it.
- Release policy: "Major Nx versions are released as the latest every six
  months, typically around April and October." Each major gets 18 months of
  support. v24 is current, v23 and v22 are LTS.

### SQLite and PostgreSQL

Does not apply.

### Known problems

- The `@nx/nest` plugin does not accept NestJS 12. Its peer range is
  `@nestjs/core >=10.0.0 <12.0.0` and it depends on `@nestjs/schematics`
  11. Three open issues track this: nrwl/nx#36936 (bug, priority high,
  opened 2026-09-07, "@nx/nest cannot be installed with NestJS 12, and
  generating an app leaves the workspace unable to load"), nrwl/nx#36913
  (enhancement, "The @nx/nest:application generator hardcodes webpack and
  cannot follow NestJS 12"), and nrwl/nx#37388 (bug, priority high,
  `generatePackageJson` drops peer dependencies of NestJS 12 packages). A
  maintainer acknowledged #36936 on 2026-09-20. All three were still open on
  2026-11-02.
- Supply-chain compromise, August 2025 (GHSA-cxm3-wv7p-598c). Malicious
  `nx` versions 20.9 to 20.12 and 21.5 to 21.8 were on npm for about two
  hours on 2025-08-26. A `postinstall` script collected credentials. The
  cause was a GitHub Actions workflow with a bash injection flaw on a
  `pull_request_target` trigger. Remediation: tokens rotated, 2FA or trusted
  publishing required for all Nx packages, npm tokens removed from the
  pipeline, CodeQL enabled, external workflows need approval. No affected
  version remains on npm.
- Nx 24 removed 35 deprecated executors, the `withNx` and `composePlugins`
  helpers, and Module Federation. `@nx/remix` is deprecated and goes in Nx
  25. A major every six months means a migration every six months.
- Remote cache: the docs recommend Nx Cloud. A self-hosted cache server
  must follow the Nx OpenAPI specification. The docs do not state the terms.
  Local cache needs no account.

### Result

Fails the NestJS 12 integration check. Passes the version, maintenance, and
cadence checks.

Alternative: pnpm workspaces with Turborepo (`turbo` 2.11.10, released
2026-10-20). Reason: Turborepo runs scripts and caches outputs. It has no
framework plugins, so no plugin can lag behind NestJS or Vite. The NestJS CLI
builds the API. Vite builds the web app. The repository reports MIT license,
two open issues, and a push on 2026-11-02. The cost: no project generators and
no project graph tools.

Sources: github.com/nrwl/nx/releases, nx.dev/blog/nx-24-release,
nx.dev/docs/reference/releases,
github.com/nrwl/nx/security/advisories/GHSA-cxm3-wv7p-598c,
github.com/nrwl/nx/issues/36936, github.com/nrwl/nx/issues/36913,
github.com/nrwl/nx/issues/37388, nx.dev/docs/kb/self-hosted-caching,
npm registry.

## Cross-part compatibility

| Pair | Status |
| --- | --- |
| NestJS 12 and TypeORM 1.1 | Compatible. `@nestjs/typeorm` 12.0.2 accepts `typeorm ^1.0.0-dev`. |
| NestJS 12 and NX 24 | Not compatible through `@nx/nest`. Three open issues. |
| React 19.3 and Redux | Compatible. `react-redux` 9.3.1 accepts React 19. |
| React 19.3 and shadcn/ui | Compatible. `radix-ui` and `@base-ui/react` accept React 19. |
| shadcn/ui and Tailwind 4 | Compatible since February 2025. |
| NestJS 12 and Node | Node 22.12+ to run. Node 24.9+ for Jest. Node 22.22.3+ or 24.15+ for the CLI. |
| TypeORM 1.1 and Node | Node 20.19, 22.13, or 24.11 and later. |

The lowest Node version that satisfies every part and is still in LTS is
Node 24 (24.15 or later). Node 26 also satisfies every part.

## Open questions for the grilling ticket

- TypeORM: accept the growing backlog, or move to MikroORM?
- Redux: keep Redux Toolkit with RTK Query, or use TanStack Query with a
  small client-state tool?
- NX: wait for `@nx/nest` to accept NestJS 12, run NestJS 11 under NX, run
  NestJS 12 under NX without the plugin, or use Turborepo?
- shadcn/ui: Base UI or Radix?
