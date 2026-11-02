# Research: MCP server hosting and the existing Grocy MCP tools

Ticket: [#7](https://github.com/the-dev-abides/grocy-next/issues/7)
Date: 2026-11-01

## Question

How does Grocy Next host an MCP (Model Context Protocol) server? What are the
current MCP specification revision, the transports, and the authentication
options? What is the current TypeScript SDK version? How do thijserven/grocy-mcp
and HarmEllis/grocy-mealie-sync expose tools, and which defects from
`docs/requirements/assistant.md` section 3.1 do they show?

## Summary

- The current MCP specification revision is `2026-07-28`. It removed the
  `initialize` handshake, protocol sessions, and the HTTP GET stream. Each
  request now stands alone and carries its protocol version in `_meta`.
- The specification defines two transports: stdio and Streamable HTTP. The
  old HTTP+SSE transport is deprecated.
- Authorization is optional. For HTTP, the specification uses OAuth 2.1 with
  the MCP server as a resource server. For stdio, the server reads credentials
  from the environment.
- The TypeScript SDK v2 is split into packages. `@modelcontextprotocol/server`
  is at 2.4.0. The old single package `@modelcontextprotocol/sdk` is at 1.32.2
  and gets fixes for at least six months after 2026-07-27.
- The SDK v2 HTTP entry point is `createMcpHandler`. It builds a fresh server
  per request, serves both protocol eras by default, and mounts on Express,
  Fastify, Hono, or plain Node through thin adapter packages.
- grocy-mcp generates 87 tools from the Grocy OpenAPI file, one tool per
  operation. It returns the raw Grocy response. It runs on SDK v2 2.0.0 over
  stdio and over a stateless 2025-era HTTP transport with a static bearer token.
- grocy-mealie-sync hand-writes about 80 tools over use-case functions, returns
  a fixed result envelope, and runs on SDK v1 inside a Next.js route with
  in-memory sessions and the app's bearer secret.
- The two tools show four section 3.1 defects in code: no confirmation after a
  Grocy write (3.1.1), silent field stripping (3.1.2), a stock entry edit that
  clears omitted fields (3.1.3), and a product rename as a side effect of a
  link (3.1.4). The "database is locked" defect (3.1.7) is consistent with the
  sync app's SQLite setup, but the source of the error is not verified.
- Recommendation: host the MCP server in the Grocy Next backend process with
  the official SDK v2, mounted at `/mcp` on the NestJS HTTP adapter, with a
  static bearer token for M0. Details are in the Recommendation section.

## Findings

### 1. Specification revision

The current protocol version is `2026-07-28`. The versioning page marks it
**Current**. Revisions `2025-11-25` and earlier are **Final**. Version strings
have the format `YYYY-MM-DD` and change only on a backwards incompatible
change. ([Versioning](https://modelcontextprotocol.io/specification/versioning))

The `2026-07-28` revision made these changes
([Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)):

- It removed protocol sessions and the `Mcp-Session-Id` header (SEP-2567).
- It removed the `initialize` handshake. Every request carries its protocol
  version and client capabilities in `_meta` (SEP-2575).
- It added `server/discover`. A server must implement it. A client may call it
  to select a version before any other request (SEP-2575).
- It replaced the HTTP GET stream and resource subscriptions with
  `subscriptions/listen`, one long-lived POST response stream (SEP-2575).
- It removed `ping`, `logging/setLevel`, and SSE stream resumability.
- It replaced server-initiated requests with Multi Round-Trip Requests. A
  server returns an `input_required` result, and the client retries with the
  answers (SEP-2322).
- It deprecated the Roots, Sampling, and Logging features (SEP-2577) and OAuth
  Dynamic Client Registration.
- It requires the `Mcp-Method` and `Mcp-Name` headers on every Streamable HTTP
  POST (SEP-2243).

A server that supports clients on earlier revisions must also implement the
`initialize` handshake of those revisions. The SDK calls the two behaviour
families "eras": `legacy` (`2024-10-07` to `2025-11-25`) and `modern`
(`2026-07-28`).
([Protocol versions](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/protocol-versions.md))

### 2. Transports

The specification defines two standard transport bindings
([Transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)).

**stdio.** The client launches the server as a subprocess. Messages are
newline-delimited JSON-RPC on stdin and stdout. The server may log to stderr.
The server must not write anything else to stdout. The client cancels a request
with `notifications/cancelled`. The server should exit when stdin closes.
([stdio](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio))

**Streamable HTTP.** The server exposes one endpoint that accepts POST. Each
JSON-RPC request is its own POST. The server answers with one JSON object or
with an SSE stream scoped to that request. The client cancels a request when it
closes the response stream. Every POST must carry the `MCP-Protocol-Version`,
`Mcp-Method`, and, for `tools/call`, the `Mcp-Name` header. The header values
must match the body, or the server rejects the request with `400` and error
`-32020`. GET and DELETE on the endpoint answer `405` on a server that serves
only this revision. Normative security rules: the server must validate the
`Origin` header and answer `403` on a bad value, should bind to localhost when
it runs locally, and should authenticate all connections.
([Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http))

**HTTP+SSE (2024-11-05)** is deprecated. New implementations should not adopt
it. The SDK v2 server does not serve it.
([Streamable HTTP, Backward Compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#backward-compatibility))

### 3. Authentication options

Authorization is **optional** in MCP. When a server supports it
([Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)):

- An HTTP server should conform to the MCP authorization specification. The
  MCP server is an OAuth 2.1 resource server. It must implement OAuth 2.0
  Protected Resource Metadata (RFC 9728) to point clients at its authorization
  server. It must validate that each access token was issued for it (RFC 8707).
  Tokens travel in the `Authorization: Bearer` header on every request. Invalid
  tokens get `401`. Missing scopes get `403` with `insufficient_scope`.
- A stdio server should not follow the OAuth specification. It reads
  credentials from the environment.
- The authorization server can be a separate service or can be hosted with the
  resource server. Its implementation is out of scope for MCP.
- Client registration: Client ID Metadata Documents (should), pre-registration,
  or Dynamic Client Registration (deprecated).

The SDK v2 implements the resource-server half. `requireBearerAuth` takes a
`verifyAccessToken` function that the project writes. The function can do JWT
checks, RFC 7662 introspection, or a lookup against the project's own token
store. `mcpAuthMetadataRouter` serves the RFC 9728 document. The v1
authorization-server helpers are frozen in `@modelcontextprotocol/server-legacy`.
The docs say: use a dedicated identity provider for new servers.
([Require authorization](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/authorization.md))

Both existing Grocy tools use a static shared secret in the `Authorization:
Bearer` header and verify it with a constant-time compare. Neither implements
OAuth metadata. See sections 5 and 6.

### 4. The TypeScript SDK

Versions from `npm view <name> version` on 2026-11-01:

| Package | Version | Role |
| --- | --- | --- |
| `@modelcontextprotocol/server` | 2.4.0 | Server API: `McpServer`, `registerTool`, `createMcpHandler`, `requireBearerAuth` |
| `@modelcontextprotocol/client` | 2.4.0 | Client API |
| `@modelcontextprotocol/core` | 2.4.0 | Raw Zod wire schemas |
| `@modelcontextprotocol/node` | 2.1.2 | `toNodeHandler`, localhost Host and Origin guards, 2025-era `NodeStreamableHTTPServerTransport` |
| `@modelcontextprotocol/express` | 2.0.2 | `createMcpExpressApp`, Express `requireBearerAuth`, `mcpAuthMetadataRouter` |
| `@modelcontextprotocol/fastify` | 2.0.1 | Fastify adapter |
| `@modelcontextprotocol/hono` | 2.0.2 | Hono adapter |
| `@modelcontextprotocol/sdk` | 1.32.2 | The v1 single package, maintenance line |
| `@rekog/mcp-nest` | 2.0.9 | Third-party NestJS adapter (MIT) |
| `zod` | 4.6.7 | Schema library; the SDK v2 needs Zod 4 |

`@modelcontextprotocol/server` 2.0.0 was published on 2026-07-27, one day
before the spec revision date. 2.4.0 was published on 2026-10-23. v1.x stays on
its own branch and gets bug fixes and security updates for at least six months
after 2026-07-27.
([SDK README](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md),
[npm time data](https://www.npmjs.com/package/@modelcontextprotocol/server))

How the SDK v2 hosts a server
([Serve over HTTP](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md),
[Serve over stdio](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md),
[Legacy clients](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/legacy-clients.md)):

- `createMcpHandler(factory)` is the HTTP entry. The factory builds a fresh
  `McpServer` for every request. The handler holds no state between requests.
  It returns a web-standard `fetch(Request)` function.
- `toNodeHandler(handler)` adapts it to Node `(req, res)`. `createMcpExpressApp`
  is Express with JSON parsing and Host and Origin validation. When the app
  binds to all interfaces, the project must name `allowedHosts`.
- The handler serves 2025-era clients from the same factory by default
  (`legacy: 'stateless'`). `legacy: 'reject'` makes the endpoint modern-only.
  Under the default, a legacy GET or DELETE answers `405`.
- The handler validates no Host, no Origin, and no token on its own. The
  project mounts these checks in front of it. `requireBearerAuth` sets
  `req.auth`, and tool handlers read it as `ctx.http.authInfo`.
- `serveStdio(factory)` is the stdio entry. It serves both eras per connection.
- Hand-wired `*StreamableHTTPServerTransport` classes still exist. They are the
  2025-era entry and support sessions with `sessionIdGenerator`. A
  hand-constructed `McpServer` with that transport speaks only the 2025 era.
  ([Supporting 2026-07-28](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md))
- `registerTool` takes `inputSchema` and `outputSchema`. The SDK validates
  `structuredContent` against `outputSchema` before the result leaves the
  server. A handler that throws becomes an `isError: true` tool result with
  the exception message as text.
  ([Tools](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/tools.md),
  [Errors](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/errors.md))

`@rekog/mcp-nest` 2.0.9 is a NestJS adapter. It runs MCP as a NestJS
microservice transport strategy. Tools are methods on `@McpController()`
classes, so NestJS guards, pipes, interceptors, and filters apply. It serves
both eras on one `/mcp` endpoint by default and offers stdio. It needs
`@modelcontextprotocol/server`, `core`, and `node` as peers (range
`^2.0.0-beta.5`) and Zod 4. Its authorization server moved to
`@rekog/mcp-nest-auth`. The repository has 726 stars and an MIT licence. The
API changed from `McpModule.forRoot` to `McpStrategy` in its v2.
([MCP-Nest README](https://github.com/rekog-labs/MCP-Nest),
[Protocol revisions](https://github.com/rekog-labs/MCP-Nest/blob/main/docs/protocol-revisions.md))

### 5. thijserven/grocy-mcp

Repository facts: default branch `main`, last push 2026-08-15, no licence file,
0 stars. ([repo](https://github.com/thijserven/grocy-mcp))

**Tool generation.** `scripts/generate-tools.mjs` reads the vendored Grocy
OpenAPI file and emits one tool per operation into `src/tools/definitions.ts`
(98 KB, generated). Tool names follow `grocy_<method>_<path>`, for example
`grocy_put_objects_by_entity_by_objectid`. Path parameters, query parameters,
and the request body become one Zod object. Enum lists for entity names come
from the OpenAPI components. The README counts 87 tools: 86 OpenAPI operations
plus the OpenAPI document endpoint.
([generate-tools.mjs](https://github.com/thijserven/grocy-mcp/blob/main/scripts/generate-tools.mjs),
[README](https://github.com/thijserven/grocy-mcp/blob/main/README.md))

**Tool handler.** `src/server.ts` loops over the definitions and calls
`registerTool`. Annotations come from the HTTP method: GET is `readOnlyHint`,
DELETE is `destructiveHint`, GET, PUT, and DELETE are `idempotentHint`. The
handler sends the request through `GrocyClient.request` and returns the raw
response as JSON text plus `structuredContent` when the response is an object.
An error becomes `isError: true` with the message text.
([server.ts](https://github.com/thijserven/grocy-mcp/blob/main/src/server.ts))

**Grocy client.** `src/api/client.ts` adds the `GROCY-API-KEY` header, a
timeout, and translates non-2xx responses to `GrocyApiError`. An empty response
body becomes `null`.
([client.ts](https://github.com/thijserven/grocy-mcp/blob/main/src/api/client.ts))

**Hosting.** `package.json` pins `@modelcontextprotocol/server` 2.0.0,
`@modelcontextprotocol/node` 2.0.0, and `zod` 4.4.3.

- stdio: `src/index.ts` calls `serveStdio(() => createMcpServer())`. This is
  the SDK v2 stdio entry, so it serves both eras.
- HTTP: `src/http.ts` builds a plain `node:http` listener. It checks a static
  bearer token (`GROCY_MCP_AUTH_TOKEN`) with `timingSafeEqual`. For each
  request it creates a new `NodeStreamableHTTPServerTransport` with
  `sessionIdGenerator: undefined` (stateless) and a new `McpServer`. The
  default bind host is `0.0.0.0`. The code does not validate the `Origin` or
  `Host` header. The transport class is the 2025-era entry, so this endpoint
  speaks only the legacy era.
  ([http.ts](https://github.com/thijserven/grocy-mcp/blob/main/src/http.ts),
  [config.ts](https://github.com/thijserven/grocy-mcp/blob/main/src/config.ts))
- Docker: a GitHub workflow publishes an image to GHCR. The image runs the HTTP
  entry.

### 6. HarmEllis/grocy-mealie-sync

Repository facts: default branch `main`, last push 2026-10-31, MIT licence,
9 stars, version `1.19.0-rc.19`. ([repo](https://github.com/HarmEllis/grocy-mealie-sync))

**Dependencies.** `@modelcontextprotocol/sdk` `^1.29.0` (the v1 line), `zod`
`^4.4.1`, `next` `^16.2.4`, `drizzle-orm` with `better-sqlite3`.
([package.json](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/package.json))

**Tool definition.** Tools are hand-written per domain in `src/mcp/tools/`:
catalog, conflicts, conversion-library, conversions, diagnostics, history,
inventory, mappings, products, shop, shopping, units. Names use a dot, for
example `inventory.update_entry`. Each handler validates input with a Zod
shape, calls a use-case function from `src/lib/use-cases/`, and returns a
fixed envelope `{ ok, status, message, data }` as JSON text and as
`structuredContent`. `status` is one of `ok`, `partial`, `skipped`, `busy`,
`error`. Duplicate prevention returns `status: "skipped"`. The server also
registers resources with `gms://` URIs and prompts.
([server.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/mcp/server.ts),
[contracts.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/mcp/contracts.ts),
[inventory.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/mcp/tools/inventory.ts),
[MCP-SPEC.md](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/docs/MCP-SPEC.md))

**Service injection.** `createGrocyMealieSyncMcpServer(overrides)` builds a
services object from the use-case functions, wraps the write services with
action-history recording, and accepts overrides for tests.

**Hosting.** The Next.js route `src/app/api/mcp/route.ts` exports GET, POST,
and DELETE. It answers `503` when `MCP_ENABLED` is not `true`. `src/mcp/http.ts`
uses `WebStandardStreamableHTTPServerTransport` with `enableJsonResponse: true`
and a `sessionIdGenerator`. It keeps sessions in an in-memory map with a TTL
(`MCP_SESSION_TTL_MS`, default 15 minutes) and a cap (`MCP_MAX_SESSIONS`,
default 100). A request without `Mcp-Session-Id` must be an `initialize`
request. Authentication is the app's `Authorization: Bearer <AUTH_SECRET>`,
the same secret as the login form. The README notes that a Next.js hot reload
clears the sessions and that the session cap can be exhausted.
([route.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/app/api/mcp/route.ts),
[http.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/mcp/http.ts),
[README](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/README.md))

This design is the 2025-era sessionful model. A `2026-07-28` client cannot use
it until the app moves to SDK v2.

### 7. Section 3.1 defects in the code

| 3.1 item | Tool | What the code shows | Source |
| --- | --- | --- | --- |
| 1. Every change returns a confirmation | grocy-mcp | The handler returns the raw Grocy response. `PUT /objects/{entity}/{objectId}` answers `204` with no body in the Grocy OpenAPI spec. The client turns an empty body into `null`. The tool result text is `null`. | [server.ts](https://github.com/thijserven/grocy-mcp/blob/main/src/server.ts), [client.ts](https://github.com/thijserven/grocy-mcp/blob/main/src/api/client.ts), `docs/reference/grocy-openapi.json` |
| 2. An unknown field causes a clear error | grocy-mcp | Generated schemas use `z.object`. Zod 4 strips unknown keys by default and reports nothing. The body for the object edit tool is a `z.union` of all entity schemas. Zod tests union options in order and returns the first success. Every entity schema has optional fields only, so the first option (`Product`) matches any object and strips every key that is not a Product field. | [generate-tools.mjs](https://github.com/thijserven/grocy-mcp/blob/main/scripts/generate-tools.mjs), [Zod objects](https://zod.dev/api?id=objects), [Zod unions](https://zod.dev/api?id=unions) |
| 3. One field changes, others stay | grocy-mealie-sync and Grocy | Grocy's `EditStockEntry` controller requires `amount` and sets every omitted field to `null`, note included. `StockService::EditStockEntry` writes all those values. The sync tool `inventory.update_entry` sends only the fields it received and has no `note` parameter. It does not read the entry first and merge. The result: an edit of one field clears the note and the other omitted fields, and the tool must demand `amount` again. | [StockApiController.php v4.7.1](https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/StockApiController.php), [StockService.php v4.7.1](https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php), [manage.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/lib/use-cases/inventory/manage.ts), [types.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/lib/grocy/types.ts) |
| 4. No hidden side effects | grocy-mealie-sync | `upsertProductMapping` renames the Grocy product to the Mealie food name whenever the two names differ, then stores the mapping. The result reports `renamedGrocyProduct: true` after the fact. The tool description does not state the rename. | [mappings/manage.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/lib/use-cases/mappings/manage.ts) |
| 7. Concurrent changes fail with "database is locked" | grocy-mealie-sync (not verified) | `src/lib/db/index.ts` opens `better-sqlite3` with `new Database(dbPath)` and sets no busy timeout and no WAL journal pragma. Grocy also runs on SQLite. Which database raised the error is not verified. | [db/index.ts](https://github.com/HarmEllis/grocy-mealie-sync/blob/main/src/lib/db/index.ts) |

Items 5 and 6 of section 3.1 are not marked as defects in the requirements.

Lessons for Grocy Next tools:

- Return the stored record after every write. Do not pass a `204` through.
- Use strict input schemas (`z.strictObject`) so an unknown field is an error.
- Give an edit tool patch semantics: read, merge, write, read back.
- State every side effect in the tool description, or remove the side effect.
- Use one database writer with a busy timeout, or PostgreSQL, for concurrent
  writes.

### 8. Hosting options for Grocy Next

The requirements ask for a full MCP server (`docs/requirements/human.md`). The
stack default is NestJS (map, issue #1). Three options fit the SDK v2 model.

**Option A. Official SDK in the backend process.** Mount
`toNodeHandler(createMcpHandler(factory))` at `/mcp` on the NestJS Express
adapter. The factory gets NestJS services through the application context.
`requireBearerAuth` with a project-written verifier runs in front. The handler
serves both eras by default.

**Option B. `@rekog/mcp-nest` in the backend process.** Tools are
`@McpController()` methods with NestJS guards and dependency injection. The
strategy mounts `/mcp` itself and serves both eras.

**Option C. Separate MCP process.** A second package in the monorepo, like
grocy-mcp, that calls the Grocy Next API over HTTP. It can also offer stdio.

### Comparison table

| Criterion | A. SDK in process | B. mcp-nest in process | C. Separate process |
| --- | --- | --- | --- |
| Dependencies | Official SDK only | Official SDK plus a third-party adapter with a beta peer range | Official SDK only |
| Access to domain services | Direct, in process, same database transaction | Direct, through NestJS DI | Over HTTP, second auth hop, no shared transaction |
| NestJS guards on tools | Manual: the verifier and the factory | Native | Not applicable |
| Protocol eras | Both by default | Both by default | Both by default |
| Deployment | One container | One container | Two containers, two configs |
| stdio | Possible from the same factory in a CLI entry | Possible | Natural |
| API churn risk | SDK v2 is stable since 2026-07-27 | The adapter rewrote its API in v2 and pins `^2.0.0-beta.5` peers | SDK v2 only |
| Fit with the review queue | Tools call the queue service directly | Same | Tools call the Next API, which is not designed yet (M5) |

## Recommendation

Choose Option A: host the MCP server inside the Grocy Next backend process with
the official SDK v2 and `createMcpHandler`, mounted at `/mcp` on the NestJS
HTTP adapter.

Reasons:

- The tools need the domain services and the review queue. In-process calls
  give that without a second API and without a second auth hop.
- The official packages are the only hard dependency. The adapter in Option B
  adds a third-party API that already changed once and that pins a beta peer
  range.
- `createMcpHandler` serves both protocol eras by default, so current clients
  on `2025-11-25` and new clients on `2026-07-28` both work.
- One container keeps the Docker, Compose, and Kubernetes requirement simple.

Proposed settings, each one a decision for the maintainer:

- Transport: Streamable HTTP only at M0. Add a stdio CLI entry later if a
  local host needs it.
- Authentication: a static bearer token at M0, verified by `requireBearerAuth`
  with a project-written verifier, like both existing tools. Grocy Next can
  move to OAuth 2.1 with an external authorization server when users and
  permissions are specified (map, "Not yet specified").
- Legacy posture: the default `legacy: 'stateless'`.
- Tool contract: `z.strictObject` inputs, `outputSchema` plus
  `structuredContent` outputs, and the stored record in every write result.
- Validate `Host` and `Origin` with `createMcpExpressApp` options when the
  server binds to all interfaces. This is a specification MUST.

Not verified in this ticket:

- Whether Grocy's generic object edit ignores unknown fields on its side. The
  Zod strip in grocy-mcp alone produces defect 3.1.2.
- Which database raised "database is locked" (3.1.7).
- Whether `@modelcontextprotocol/express` 2.0.2 passes `expectedResource` to
  the verifier. The SDK docs say 2.0.1 does not.

## Sources

- MCP specification, latest: https://modelcontextprotocol.io/specification/latest
- MCP versioning: https://modelcontextprotocol.io/specification/versioning
- MCP 2026-07-28 changelog: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- MCP transports overview: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports
- MCP stdio binding: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio
- MCP Streamable HTTP binding: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
- MCP authorization: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- TypeScript SDK repository and README: https://github.com/modelcontextprotocol/typescript-sdk
- SDK packages guide: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/get-started/packages.md
- SDK protocol versions: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/protocol-versions.md
- SDK serve over HTTP: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md
- SDK serve with Express: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/express.md
- SDK serve over stdio: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md
- SDK legacy clients: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/legacy-clients.md
- SDK sessions, state, and scaling: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/sessions-state-scaling.md
- SDK require authorization: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/authorization.md
- SDK tools: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/tools.md
- SDK errors: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/errors.md
- SDK supporting 2026-07-28: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md
- npm registry, `npm view <name> version` on 2026-11-01, for every version in section 4
- MCP-Nest README: https://github.com/rekog-labs/MCP-Nest
- MCP-Nest protocol revisions: https://github.com/rekog-labs/MCP-Nest/blob/main/docs/protocol-revisions.md
- grocy-mcp repository: https://github.com/thijserven/grocy-mcp
- grocy-mcp files: `package.json`, `src/index.ts`, `src/server.ts`, `src/http.ts`, `src/config.ts`, `src/api/client.ts`, `scripts/generate-tools.mjs`, `README.md`
- grocy-mealie-sync repository: https://github.com/HarmEllis/grocy-mealie-sync
- grocy-mealie-sync files: `package.json`, `src/app/api/mcp/route.ts`, `src/mcp/http.ts`, `src/mcp/server.ts`, `src/mcp/contracts.ts`, `src/mcp/helpers.ts`, `src/mcp/tools/inventory.ts`, `src/lib/use-cases/inventory/manage.ts`, `src/lib/use-cases/mappings/manage.ts`, `src/lib/grocy/types.ts`, `src/lib/db/index.ts`, `src/lib/config.ts`, `README.md`, `docs/MCP-SPEC.md`
- Grocy v4.7.1 source: https://github.com/grocy/grocy/blob/v4.7.1/controllers/Api/StockApiController.php and https://github.com/grocy/grocy/blob/v4.7.1/services/StockService.php
- Grocy OpenAPI spec in this repo: `docs/reference/grocy-openapi.json`
- Zod 4 objects: https://zod.dev/api?id=objects
- Zod 4 unions: https://zod.dev/api?id=unions
