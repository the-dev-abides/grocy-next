# Research: backend framework, NestJS against Hono and AdonisJS

Ticket: [#2](https://github.com/the-dev-abides/grocy-next/issues/2).
Date of the data: 2026-11-01. All versions come from `npm view <name> version`
on that date.

## Question

Which backend framework serves Grocy Next best: NestJS (the default), Hono, or
AdonisJS? The criteria are: a DDD modular monolith, SQLite and PostgreSQL
support, the legacy API at its exact paths, an MCP server in the same process,
TypeScript end to end, and the size of the contributor pool.

## Summary

- NestJS has a module system that encapsulates providers. This gives the
  framework-level boundaries that a modular monolith needs. Hono has no module
  or DI system. AdonisJS has a DI container, but its default layout is by
  technical layer.
- All three reach SQLite and PostgreSQL. NestJS does it with the first-party
  TypeORM package. AdonisJS does it with the first-party Lucid ORM. Hono
  brings no ORM, so the project picks one.
- No framework generates routes from an existing OpenAPI document. All three
  generate a document from code. The legacy API therefore needs contract tests
  against `docs/reference/grocy-openapi.json` in every case.
- The MCP TypeScript SDK v2 ships first-party adapters for Express, Fastify,
  and Hono. NestJS runs on Express or Fastify, so both adapters apply. Hono has
  a direct adapter. AdonisJS has no first-party adapter. It exposes the raw
  Node request and response, so the Node transport works with hand-wiring.
- All three are TypeScript first. Hono adds a typed RPC client for the
  frontend without code generation.
- NestJS has the largest GitHub contributor count (394). Hono is close (369).
  AdonisJS core is far smaller (69). Hono has the most npm downloads.
- Recommendation: keep NestJS. The reasons are in the Recommendation section.

## Findings

### Current versions

| Package | Version | Node engines |
|---|---|---|
| `@nestjs/core` | 12.3.2 | `>= 20` |
| `@nestjs/common` | 12.3.2 | |
| `@nestjs/platform-express` | 12.3.2 | |
| `@nestjs/platform-fastify` | 12.3.2 | |
| `@nestjs/typeorm` | 12.0.2 | |
| `@nestjs/swagger` | 12.0.5 | |
| `@nestjs/cqrs` | 12.1.2 | |
| `@nestjs/cli` | 12.0.11 | |
| `hono` | 4.13.16 | `>=16.9.0` |
| `@hono/node-server` | 2.1.5 | `>=20` |
| `@hono/zod-openapi` | 1.6.3 | |
| `@hono/mcp` | 0.3.5 | |
| `@adonisjs/core` | 7.6.0 | `>=24.0.0` |
| `@adonisjs/lucid` | 22.4.2 | |
| `@adonisjs/http-server` | 9.3.1 | |
| `@foadonis/openapi` | 1.1.0 | |
| `@modelcontextprotocol/sdk` (v1 line) | 1.32.2 | `>=18` |
| `@modelcontextprotocol/server` (v2 line) | 2.4.0 | |
| `@modelcontextprotocol/node` | 2.1.2 | |
| `@modelcontextprotocol/express` | 2.0.2 | |
| `@modelcontextprotocol/fastify` | 2.0.1 | |
| `@modelcontextprotocol/hono` | 2.0.2 | |
| `@rekog/mcp-nest` | 2.0.9 | |
| `typeorm` | 1.1.2 | |
| `better-sqlite3` | 13.0.3 | |
| `pg` | 8.23.1 | |
| `express` | 5.3.0 | |
| `fastify` | 5.12.7 | |
| `openapi-typescript` | 7.13.0 | |

Note: AdonisJS 7 requires Node 24 or later [S15]. NestJS 12 requires Node 20 or
later [S1]. Hono on Node requires Node 20 or later through the adapter [S10].

### 1. DDD modular monolith

A modular monolith is one deployable process with internal modules that have
explicit public interfaces. DDD (domain-driven design) wants a domain layer
that does not depend on the framework or the database.

**NestJS.** A module is a class with the `@Module()` decorator. The docs say:
"A module encapsulates its providers by default." A module can inject only its
own providers or the providers that an imported module exports. The exported
providers form the public interface of the module [S2]. The DI container
enforces the boundary at start time. The `@nestjs/cqrs` package adds
`AggregateRoot` and an `IAggregateRoot` option to "keep your domain layer
completely framework-agnostic" [S6]. TypeORM supports both Active Record and
Data Mapper. The TypeORM docs say the Data Mapper approach "helps with
maintainability, which is more effective in larger apps" [S23]. The Data
Mapper pattern keeps the domain entities free of persistence methods.

**Hono.** The best-practices page recommends one `Hono` instance per feature
file, mounted with `app.route()`. It recommends against controller classes
because the path parameter types do not infer into separate functions [S11].
Hono has no DI container. Per-request values go through `c.set` and `c.get`,
and these live "only within the same request" [S12]. Module boundaries must
come from the repo tooling (for example Nx lint rules), not from the framework.
The domain layer stays fully independent of the framework. The cost is that
the framework gives no structure for module wiring.

**AdonisJS.** AdonisJS has an IoC container with the `@inject()` decorator.
Controllers, middleware, and listeners get constructor injection. The docs say:
"For any other classes you create, you'll need to use the container manually
to construct them" [S14]. The default folder layout is by technical layer:
`app/controllers`, `app/models`, `app/validators`. The docs say the layout is
flexible and that you can reorganize [S17]. Lucid follows the Active Record
pattern: "Each instance of the model represents a single row from that table"
and instances save themselves [S22]. A DDD domain layer must then stay
separate from the Lucid models, or it couples to the ORM.

### 2. SQLite and PostgreSQL

**NestJS.** The Nest team maintains `@nestjs/typeorm`, `@nestjs/drizzle`,
`@nestjs/mongoose`, and `@nestjs/sequelize`. MikroORM has `@mikro-orm/nestjs`
from the MikroORM team [S3]. TypeORM lists `postgres` and `better-sqlite3` as
`type` values. It does not list a `node:sqlite` driver [S21]. One TypeORM
code base therefore runs on both databases with a config switch.

**Hono.** Hono ships no ORM and documents none. The project picks TypeORM,
Drizzle, MikroORM, or another library. The same TypeORM facts apply [S21].

**AdonisJS.** Lucid is built on Knex. The docs list PostgreSQL, MySQL, SQLite,
MSSQL, and LibSQL [S18]. The command `node ace configure @adonisjs/lucid
--db=sqlite` installs the driver. The generated config uses `better-sqlite3`
for SQLite [S19]. This is the smallest setup of the three.

### 3. The legacy API at its exact paths

The spec `docs/reference/grocy-openapi.json` is OpenAPI 3.1.0. It has 74
paths. 49 paths have path parameters. The `entity` parameter has an enum
schema. The security scheme is an API key in the `GROCY-API-KEY` header. One
query parameter is named `query[]` (inspected in the repo file).

No framework of the three generates routes from an existing OpenAPI document.
All three generate a document from code:

- `@nestjs/swagger` "generates such a specification from decorators in your
  code" [S4].
- `@hono/zod-openapi` defines routes with `createRoute()` and Zod schemas, and
  serves the generated document [S13].
- `@foadonis/openapi` generates "OpenAPI V3 documentation from your AdonisJS
  controllers and models using TypeScript decorators" [S20]. It is a Friends
  Of Adonis package, not a core package.

The map already lists legacy API conformance as an open item. The proof must
come from contract tests against the spec file. This is the same work for all
three frameworks. `openapi-typescript` (7.13.0) generates TypeScript types from
the spec and is framework-independent.

Route syntax:

- **NestJS.** `@Controller('objects')` plus `@Get(':entity')` gives
  `/objects/:entity`. `setGlobalPrefix('api')` puts all routes under `/api`
  with an `exclude` list. Express 5 made routing stricter. Nest 12 adds
  `routeResolutionStrategy: 'specificity'` so a parametric route does not
  shadow a static one [S5][S7]. Express and Fastify run the same controllers
  [S8].
- **Hono.** `:entity` syntax, regex constraints like `:date{[0-9]+}`, and
  wildcards. Handlers run in registration order, so fallbacks go last [S16].
  `@hono/zod-openapi` writes paths in OpenAPI form, for example
  `/users/{id}` [S13]. The spec paths copy over without edits.
- **AdonisJS.** `:entity` syntax, `router.group().prefix('/api')`, and
  controller tuples. Optional params and wildcards must be last [S15].

### 4. MCP server in the same process

MCP (Model Context Protocol) is the protocol that lets an AI assistant call
tools on a server. The MCP TypeScript SDK v2 is "the stable release line
implementing the 2026-07-28 spec" [S24]. The v1 package
`@modelcontextprotocol/sdk` is still published at 1.32.2.

**NestJS.** NestJS runs on Express or Fastify. The SDK v2 ships
`@modelcontextprotocol/express` and `@modelcontextprotocol/fastify`. Both pass
the raw Node request and response to
`NodeStreamableHTTPServerTransport.handleRequest(req, res, body)` [S25][S26].
A Nest controller gets the raw objects with `@Req()` and `@Res()` [S5]. A
Nest-specific module also exists: `@rekog/mcp-nest` 2.0.9. It defines tools
with decorators on `@McpController()` classes, runs as a microservice
strategy, and serves on the same HTTP server through
`mcp.setHttpAdapter(app.getHttpAdapter())` [S9]. Its peer dependencies name
the SDK v2 packages. It is a third-party package. Tool classes in Nest use the
same DI container as the rest of the app.

**Hono.** The SDK v2 ships `@modelcontextprotocol/hono` 2.0.2. The handler
calls `WebStandardStreamableHTTPServerTransport.handleRequest(c.req.raw, ...)`
on `app.all('/mcp', ...)` [S27]. This is the only first-party adapter that
needs no Node-specific bridge. The older `@hono/mcp` 0.3.5 depends on the SDK
v1 line (`^1.29.0`) [S28].

**AdonisJS.** The SDK v2 ships no AdonisJS adapter. The AdonisJS `Request`
class exposes `public request: IncomingMessage` and `public response:
ServerResponse` [S29]. A route handler can pass these to
`NodeStreamableHTTPServerTransport.handleRequest`. This is hand-wiring with
no docs for the combination. Community packages exist: `@7nohe/adonis-mcp`
and `@jrmc/adonis-mcp` [S30]. I did not inspect their repositories in detail.

### 5. TypeScript end to end

**NestJS.** The framework is TypeScript first and uses decorators with
`reflect-metadata`. Module, controller, and provider classes carry their types.
The frontend shares types through the monorepo. Nest ships no typed HTTP
client [S2][S5].

**Hono.** The framework is TypeScript first. The best-practices page describes
RPC mode: chain the route definitions, export the app type, and pass it to the
`hc` client for typed calls [S11]. The frontend gets a typed client with no
code generation. This applies to the Next API, not to the legacy API, because
the legacy API contract is the Grocy spec.

**AdonisJS.** The generated project has TypeScript, ESLint, and Prettier set
up. Controllers come from `#generated/controllers` with typed tuples [S15]. DI
uses TypeScript reflection, so only classes can be injected, not interfaces
[S14].

### 6. Contributor pool

GitHub data from the GitHub API on 2026-11-01. The contributor count is the
number of non-anonymous contributors that the API lists.

| Repo | Stars | Forks | Contributors | Open issues | Created |
|---|---|---|---|---|---|
| nestjs/nest | 76,959 | 8,706 | 394 | 30 | 2017 |
| honojs/hono | 32,774 | 1,449 | 369 | 411 | 2021 |
| adonisjs/core | 19,171 | 670 | 69 | 14 | 2015 |
| adonisjs/lucid | 1,231 | 230 | 86 | 17 | 2015 |

npm downloads for the week 2026-10-23 to 2026-10-29 [S31]:

| Package | Downloads |
|---|---|
| `hono` | 100,927,517 |
| `@nestjs/core` | 23,041,723 |
| `@adonisjs/core` | 258,540 |

The download count includes installs as a dependency of other packages. It
does not measure Node backend projects only.

## Comparison table

| Criterion | NestJS 12.3.2 | Hono 4.13.16 | AdonisJS 7.6.0 |
|---|---|---|---|
| Module boundaries | Enforced by the DI container [S2] | None in the framework; `app.route()` per feature [S11] | IoC container; layout by technical layer [S14][S17] |
| Domain layer independence | Data Mapper in TypeORM; `IAggregateRoot` in CQRS [S6][S23] | Full; no framework in the domain | Lucid is Active Record [S22] |
| SQLite + PostgreSQL | First-party `@nestjs/typeorm`; TypeORM `postgres`, `better-sqlite3` [S3][S21] | Project picks the ORM | First-party Lucid on Knex [S18][S19] |
| Serve an existing OpenAPI spec | No; code-first `@nestjs/swagger` [S4] | No; code-first `@hono/zod-openapi` [S13] | No; community `@foadonis/openapi` [S20] |
| MCP in process | SDK v2 Express and Fastify adapters; `@rekog/mcp-nest` [S25][S26][S9] | SDK v2 Hono adapter [S27] | Hand-wire the Node transport [S29]; community packages [S30] |
| TypeScript | First; decorators | First; typed RPC client [S11] | First; decorators |
| Node version | `>= 20` | `>=20` with the Node adapter | `>=24.0.0` |
| GitHub contributors | 394 | 369 | 69 (core) |
| Weekly npm downloads | 23.0 M | 100.9 M | 0.26 M |

## Recommendation

Keep NestJS as the backend framework. This is a proposal. The maintainer
decides.

Reasons:

1. The module system enforces the boundaries of a modular monolith at start
   time. Hono leaves this to lint rules. AdonisJS does not model modules.
2. The first-party TypeORM package covers SQLite and PostgreSQL with one code
   base, and the Data Mapper pattern keeps the domain entities free of
   persistence code.
3. The MCP SDK v2 has first-party adapters for both HTTP platforms that NestJS
   runs on, and a Nest-specific MCP module exists.
4. NestJS has the largest contributor count and is already the default.

Costs of NestJS:

- The decorator and reflection model adds framework code to every module.
- Express 5 routing is stricter than Express 4. Use the specificity route
  resolution strategy and contract tests.
- No framework serves the legacy spec directly. This cost is equal for all
  three.

Alternative: Hono. Pick Hono if the maintainer values a small core and the
only first-party MCP adapter with no Node bridge. The cost is no module or DI
system, so the Nx workspace must enforce the boundaries.

Not recommended: AdonisJS. The contributor pool is one sixth of NestJS. It
requires Node 24. Lucid is Active Record. OpenAPI and MCP support come from
the community or from hand-wiring.

## Sources

- [S1] `npm view @nestjs/core engines`, 2026-11-01.
- [S2] NestJS modules: https://docs.nestjs.com/modules
- [S3] NestJS database: https://docs.nestjs.com/techniques/database
- [S4] NestJS OpenAPI: https://docs.nestjs.com/openapi/introduction
- [S5] NestJS controllers: https://docs.nestjs.com/controllers
- [S6] NestJS CQRS: https://docs.nestjs.com/recipes/cqrs
- [S7] NestJS global prefix: https://docs.nestjs.com/faq/global-prefix
- [S8] NestJS Fastify adapter: https://docs.nestjs.com/techniques/performance
- [S9] `@rekog/mcp-nest` README: https://github.com/rekog-labs/MCP-Nest/blob/main/README.md
- [S10] Hono on Node.js: https://hono.dev/docs/getting-started/nodejs
- [S11] Hono best practices: https://hono.dev/docs/guides/best-practices
- [S12] Hono context: https://hono.dev/docs/api/context
- [S13] Hono Zod OpenAPI: https://hono.dev/examples/zod-openapi
- [S14] AdonisJS dependency injection: https://docs.adonisjs.com/guides/concepts/dependency-injection
- [S15] AdonisJS installation and routing: https://docs.adonisjs.com/guides/getting-started/installation and https://docs.adonisjs.com/guides/basics/routing
- [S16] Hono routing: https://hono.dev/docs/api/routing
- [S17] AdonisJS folder structure: https://docs.adonisjs.com/guides/getting-started/folder-structure
- [S18] Lucid introduction: https://lucid.adonisjs.com/docs/introduction
- [S19] Lucid installation: https://lucid.adonisjs.com/docs/installation
- [S20] FriendsOfAdonis OpenAPI: https://friendsofadonis.com/docs/openapi
- [S21] TypeORM data source options: https://typeorm.io/docs/data-source/data-source-options
- [S22] Lucid models: https://lucid.adonisjs.com/docs/models
- [S23] TypeORM Active Record and Data Mapper: https://typeorm.io/docs/guides/active-record-data-mapper
- [S24] MCP TypeScript SDK v2 docs: https://ts.sdk.modelcontextprotocol.io/v2/
- [S25] `@modelcontextprotocol/express` README: https://www.npmjs.com/package/@modelcontextprotocol/express
- [S26] `@modelcontextprotocol/fastify` README: https://www.npmjs.com/package/@modelcontextprotocol/fastify
- [S27] `@modelcontextprotocol/hono` README: https://www.npmjs.com/package/@modelcontextprotocol/hono
- [S28] `@hono/mcp` README and peer dependencies: https://github.com/honojs/middleware/blob/main/packages/mcp/README.md
- [S29] AdonisJS `Request` source: https://github.com/adonisjs/http-server/blob/develop/src/request.ts
- [S30] Community AdonisJS MCP packages: https://packages.adonisjs.com/packages/adonis-mcp and https://github.com/7nohe/adonis-mcp
- [S31] npm download counts: https://api.npmjs.org/downloads/point/last-week/<package>
- GitHub repository data: https://api.github.com/repos/<owner>/<repo>, 2026-11-01.
- Grocy spec: `docs/reference/grocy-openapi.json` in this repo.
