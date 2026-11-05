# Research: MCP server transport, authorization, and the TypeScript SDK

Ticket: [#65](https://github.com/the-dev-abides/grocy-next/issues/65)
Date: 2026-11-05
Earlier research: branch `research/mcp-server`, ticket #7, dated 2026-11-01

## Question

What does an MCP (Model Context Protocol) server need in 2026, and how does
one run inside the NestJS 12 process of Grocy Next? The ticket asks for the
transports, the authorization rules, the TypeScript SDK, the NestJS
integrations, the tool definition rules, the connection rules of three
assistant clients, and the packages that make MCP tools from an OpenAPI
document.

This file records facts. It makes no decision.

## Summary

- The current specification revision is `2026-07-28`. It is unchanged since
  the earlier research. It has two transports: stdio and Streamable HTTP. The
  HTTP+SSE transport of 2024 is deprecated. A remote assistant needs
  Streamable HTTP over public HTTPS. A local assistant launches a stdio
  subprocess, or connects to Streamable HTTP on localhost.
- Authorization is optional in the specification. A server that supports it
  is an OAuth 2.1 resource server and must serve RFC 9728 metadata and must
  check the token audience. The specification has no static-token mode. The
  clients differ: Claude, Claude Code, Open WebUI, and LibreChat send a fixed
  bearer header when the user enters one. ChatGPT cannot send a static key.
- The TypeScript SDK v2 is at `@modelcontextprotocol/server` 2.4.0. The
  HTTP entry is `createMcpHandler`. It builds a fresh server per request, has
  no sessions, and serves 2025-era clients statelessly by default.
- The NestJS team published `@nestjs/mcp` 0.0.3 on 2026-11-04. It peers on
  NestJS 12 and SDK 2.4.0. It is the change since the earlier research.
  `@rekog/mcp-nest` is at 2.0.9 and `@nestjs-mcp/server` is at 2.0.0.
- A tool has `name`, `description`, `inputSchema`, optional `outputSchema`,
  `title`, `icons`, and `annotations`. Names should be 1 to 128 characters
  from `A-Z a-z 0-9 _ - .`. The specification sets no limit on the count of
  tools. Claude Code sets no fixed cap and defers tool definitions through
  tool search.
- Two package families make tools from an OpenAPI document:
  `openapi-mcp-generator` 5.0.1 writes a standalone server project on SDK v2,
  and `@ivotoby/openapi-mcp-server` 1.16.1 proxies a REST API at run time on
  SDK v1. `nestjs-mcp` 1.0.6 reads NestJS controllers, not the document.

## What changed since the earlier research

The earlier research is on branch `research/mcp-server`, commit `d0562f0`,
dated 2026-11-01. The comparison on 2026-11-05:

| Item | 2026-11-01 | 2026-11-05 |
| --- | --- | --- |
| Specification revision | `2026-07-28` | `2026-07-28`, unchanged |
| `@modelcontextprotocol/server` | 2.4.0 | 2.4.0, unchanged |
| `@modelcontextprotocol/sdk` (v1) | 1.32.2 | 1.32.2, unchanged |
| `@modelcontextprotocol/express` | 2.0.2 | 2.0.2, unchanged |
| `@rekog/mcp-nest` | 2.0.9 | 2.0.9, unchanged |
| `@nestjs/mcp` | not recorded | 0.0.3, first published 2026-11-04 by the NestJS core team |
| `@nestjs-mcp/server` | not recorded | 2.0.0, published 2026-09-29, on SDK v2 |
| `nestjs-mcp` | not recorded | 1.0.6, on SDK v1 |
| `zod` | 4.6.7 | 4.6.7, unchanged |
| Scope | grocy-mcp, grocy-mealie-sync, a hosting recommendation | the seven items of ticket #65, facts only |

The earlier research left one item open: whether `@modelcontextprotocol/express`
2.0.2 passes `expectedResource` to the verifier. The SDK authorization page
still says that 2.0.1 does not pass it. The page does not name 2.0.2. The item
stays open.

## Package versions

`npm view <name> version` on 2026-11-05:

| Package | Version | Last publish | Role |
| --- | --- | --- | --- |
| `@modelcontextprotocol/server` | 2.4.0 | 2026-10-23 | SDK v2 server |
| `@modelcontextprotocol/client` | 2.4.0 | 2026-10-23 | SDK v2 client |
| `@modelcontextprotocol/core` | 2.4.0 | 2026-10-23 | SDK v2 wire schemas |
| `@modelcontextprotocol/node` | 2.1.2 | — | `toNodeHandler`, localhost guards |
| `@modelcontextprotocol/express` | 2.0.2 | 2026-10-02 | Express app factory, `requireBearerAuth` |
| `@modelcontextprotocol/fastify` | 2.0.1 | — | Fastify adapter |
| `@modelcontextprotocol/hono` | 2.0.2 | — | Hono adapter |
| `@modelcontextprotocol/server-legacy` | 2.4.0 | — | Frozen v1 authorization-server helpers |
| `@modelcontextprotocol/sdk` | 1.32.2 | 2026-10-23 | SDK v1, maintenance line |
| `@modelcontextprotocol/inspector` | 2.14.0 | — | Test client |
| `@nestjs/mcp` | 0.0.3 | 2026-11-04 | NestJS MCP module, NestJS team |
| `@rekog/mcp-nest` | 2.0.9 | 2026-10-28 | NestJS MCP adapter, third party |
| `@rekog/mcp-nest-auth` | 2.0.9 | 2026-10-28 | OAuth 2.1 authorization server for mcp-nest |
| `@nestjs-mcp/server` | 2.0.0 | 2026-09-29 | NestJS MCP wrapper, third party |
| `nestjs-mcp` | 1.0.6 | 2025-07-07 | Tools from NestJS controllers, SDK v1 |
| `@nestjs/core` | 12.3.3 | — | NestJS |
| `@nestjs/platform-express` | 12.3.3 | — | Express adapter |
| `@nestjs/swagger` | 12.1.0 | — | OpenAPI document generator |
| `zod` | 4.6.7 | — | Schema library |
| `openapi-mcp-generator` | 5.0.1 | 2026-10-24 | OpenAPI to MCP server project |
| `@ivotoby/openapi-mcp-server` | 1.16.1 | 2026-06-15 | OpenAPI to MCP proxy at run time |
| `openapi-mcp-server` | 2.1.0 | 2025-09-06 | Client for openapisearch.com, not a generator |

SDK v2 release dates from `npm view @modelcontextprotocol/server time`:
2.0.0 on 2026-07-27, 2.1.0 on 2026-09-23, 2.2.0 on 2026-09-28, 2.3.0 on
2026-10-02, 2.3.1 on 2026-10-05, 2.4.0 on 2026-10-23. The package needs Node
20 or later (`engines.node >=20`).

## 1. Transports

The specification defines two transport bindings. Protocol semantics are the
same on both. A binding defines framing, delivery, request metadata,
cancellation, and termination.
([Transports overview](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports))

**stdio.** The client launches the server as a subprocess. Messages are
newline-delimited JSON-RPC on stdin and stdout. The server must not write
anything to stdout that is not an MCP message. The server may log to stderr.
The client cancels with `notifications/cancelled`. The client shuts the server
down by closing stdin. The server should exit when stdin closes. A client that
supports both eras probes with `server/discover` first and falls back to
`initialize` on any other error or a timeout.
([stdio](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio))

**Streamable HTTP.** The server runs as an independent process. It must
provide one endpoint path that accepts POST. Every JSON-RPC request is its own
POST. The server answers with one JSON object or with an SSE stream scoped to
that request. The client cancels by closing the response stream. Every POST
must carry `MCP-Protocol-Version` and `Mcp-Method`; `tools/call`,
`resources/read`, and `prompts/get` must also carry `Mcp-Name`. A header that
does not match the body gets `400` with error `-32020`. Change notifications
travel on the response stream of one `subscriptions/listen` request. SSE
resumability with `Last-Event-ID` is removed. The server should send
`X-Accel-Buffering: no` on SSE responses. Security rules: the server must
validate `Origin` and answer `403` on a bad value, should bind to localhost
when it runs locally, and should authenticate all connections.
([Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http))

**The state of Server-Sent Events.** SSE has two roles:

- Inside Streamable HTTP, SSE is the response format for a streamed reply.
  This use is current.
- The separate **HTTP+SSE transport** of revision `2024-11-05` (a GET stream
  plus a POST endpoint) is deprecated since `2025-03-26`. Revision
  `2026-07-28` classifies it as Deprecated under the feature lifecycle policy
  (SEP-2596). New implementations should not adopt it. It is eligible for
  removal in a future revision after the twelve-month window.
  ([Streamable HTTP, Backward Compatibility](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#backward-compatibility),
  [Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog),
  [Versioning](https://modelcontextprotocol.io/specification/versioning))

A server that serves only `2026-07-28` answers `405` to GET and DELETE, ignores
`Mcp-Session-Id`, and ignores `Last-Event-ID`. The 2025-era Streamable HTTP
shape (sessions, GET stream, server-sent requests, resumability) is not part
of this revision.
([Earlier Streamable HTTP revisions](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#earlier-streamable-http-revisions))

**Which transport each assistant needs.**

- A remote assistant (Claude on claude.ai, ChatGPT, the Claude Messages API
  MCP connector) runs in the vendor's cloud. It needs Streamable HTTP on a
  public HTTPS URL. Claude's connector docs say the connection originates from
  Anthropic's cloud. ChatGPT needs a public HTTPS endpoint with streamable
  HTTP, or its Secure MCP Tunnel. The Claude Messages API connector requires a
  URL that starts with `https://`. Section 6 has the sources.
- A local assistant (Claude Code, Claude Desktop, Open WebUI on the same
  network) can launch a stdio subprocess, or connect to Streamable HTTP on
  localhost or on the local network. Claude Code names HTTP as the
  recommended transport and marks SSE as deprecated. Open WebUI supports
  Streamable HTTP only. The specification says a local HTTP server should bind
  to `127.0.0.1`.

## 2. Authorization

Authorization is **optional** in MCP. When a server supports it
([Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)):

**A server must:**

- Act as an OAuth 2.1 resource server.
- Implement OAuth 2.0 Protected Resource Metadata (RFC 9728) so a client can
  find the authorization server.
- Accept the token in `Authorization: Bearer <token>` on every request.
- Validate every token per OAuth 2.1 section 5.2, and validate that the
  token was issued for this server (RFC 8707 audience). Reject other tokens.
  Never pass a client token through to an upstream API.
- Answer `401` for a missing or invalid token, `403` for insufficient scope,
  `400` for a malformed request.
- Follow the security considerations: audience binding, secure token
  storage, HTTPS on authorization server endpoints, redirect URIs on
  `localhost` or HTTPS.
  ([Security considerations](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations.md))

**A server should:**

- Put a `scope` parameter in the `WWW-Authenticate` header, and list all
  scopes that the operation needs in one challenge.
- Not list `offline_access` in `scopes_supported`.

**The authorization server must** implement OAuth 2.1, serve RFC 8414 or
OpenID Connect Discovery metadata, advertise `code_challenge_methods_supported`
with `S256`, and should include `iss` in authorization responses (RFC 9207).
The specification says the authorization server "may be hosted with the
resource server or a separate entity", and its implementation is out of scope.

**Client registration** has three mechanisms. Clients should support Client ID
Metadata Documents (an HTTPS URL as `client_id`). Pre-registration is a static
client id, entered by hand or configured. Dynamic Client Registration (RFC 7591)
is deprecated and kept for backwards compatibility.
([Client registration](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration.md))

**What is optional:** authorization itself, scopes, refresh tokens, the
authorization extensions, and Dynamic Client Registration. A stdio server
should not follow the OAuth specification; it reads credentials from the
environment.

**A server with no user accounts.** The specification has these facts:

- A server may run without authorization. The Streamable HTTP page says the
  server "SHOULD implement proper authentication for all connections"; that is
  a SHOULD, not a MUST. The tools page names "unauthenticated servers" as a
  case in its stateful-tools guidance.
  ([Tools, Stateful Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#stateful-tools))
- The specification has no static-token or API-key mode. A fixed bearer token
  is outside the OAuth flow. The clients that send a fixed header are in
  section 6: Claude connectors (request headers), Claude Code (`--header`),
  Open WebUI (Bearer), LibreChat (API Key header). ChatGPT does not send one.
- The SDK v2 resource-server gate `requireBearerAuth` takes a project-written
  `verifyAccessToken(token)` that returns `AuthInfo` with `token`, `clientId`,
  `scopes`, `expiresAt`, and optional `resource`. The SDK docs say the method
  is up to the project: local JWT checks, RFC 7662 introspection, or the
  identity provider. `expiresAt` is required; a missing value gets `401`. The
  docs do not address static tokens.
  ([SDK authorization](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/authorization.md))
- A server can host its own authorization server. The SDK v1 authorization
  server helpers are frozen in `@modelcontextprotocol/server-legacy/auth`; the
  SDK docs recommend a dedicated identity provider for new servers.
  `@rekog/mcp-nest-auth` 2.0.9 is an in-process OAuth 2.1 authorization server
  for NestJS, marked beta, that federates to GitHub, Google, or Azure AD. It
  peers on `typeorm`, `@nestjs/jwt`, and `@nestjs/passport`.
  ([MCP-Nest README](https://github.com/rekog-labs/MCP-Nest), `npm view @rekog/mcp-nest-auth`)
- `@nestjs/mcp` acts as a resource server only. Its docs say it "verifies
  tokens from an external identity provider and never issues them".
  ([NestJS MCP primitives](https://docs.nestjs.com/mcp/primitives))

## 3. The TypeScript SDK

**Version line.** The `main` branch is v2, the stable line, and implements
the `2026-07-28` specification. v1 (`@modelcontextprotocol/sdk`) lives on the
`v1.x` branch and gets bug fixes and security updates for at least six months
after the v2 release of 2026-07-27. The SDK runs on Node.js, Bun, and Deno.
Tool schemas use Standard Schema, so Zod 4, Valibot, or ArkType work.
([README](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md))

**Packages.** `@modelcontextprotocol/server` holds `McpServer`, `registerTool`,
`createMcpHandler`, `serveStdio`, and the auth helpers. The `node`, `express`,
`fastify`, and `hono` packages are "intentionally thin adapters" with no new
MCP functionality.
([README](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md))

**Protocol eras.** Legacy era: `2024-10-07` to `2025-11-25`, opened with
`initialize`. Modern era: `2026-07-28`, with `server/discover` and a `_meta`
envelope on every request. `createMcpHandler` and `serveStdio` serve both eras
by default.
([Protocol versions](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/protocol-versions.md))

**Server API over HTTP.** `createMcpHandler(factory, options?)` wraps a server
factory in a web-standard handler and returns `{ fetch, close, notify, bus }`.
`fetch` is `(Request) => Promise<Response>`. The factory runs once per HTTP
request and returns a fresh `McpServer`. Options: `responseMode` (`'json'`,
`'sse'`; the default answers JSON and switches to SSE only when a tool emits a
notification before its result) and `legacy`. The handler validates no
`Host`, no `Origin`, and no token on its own.
([Serve over HTTP](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md))

**Mount on Express.** `toNodeHandler(handler)` from `@modelcontextprotocol/node`
adapts the handler to `(req, res, parsedBody?)`. `createMcpExpressApp()` from
`@modelcontextprotocol/express` returns an Express app with `express.json()`
and Host and Origin validation for a localhost bind. The documented mount is:

```ts
const app = createMcpExpressApp();
const node = toNodeHandler(handler);
app.all('/mcp', (req, res) => void node(req, res, req.body));
```

The third argument `req.body` stops the adapter from reading a stream that
Express already consumed. A bind to `0.0.0.0` needs
`createMcpExpressApp({ host: '0.0.0.0', allowedHosts: ['api.example.com'] })`.
`allowedHosts` and `allowedOrigins` match hostnames without the port. A request
without `Origin` always passes. `requireBearerAuth({ verifier })` mounts in
front of the route and sets `req.auth`, which tools read as `ctx.http.authInfo`.
The page shows a standalone app. It does not show a mount into an existing
Express app or under a path prefix.
([Serve with Express](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/express.md))

**Session handling.** Revision `2026-07-28` has no sessions and no
`Mcp-Session-Id`. The handler keeps nothing between requests, so the endpoint
scales behind any load balancer with no affinity. State that must survive a
call goes outside the server instance, or into an explicit handle that a tool
returns and later calls accept. Sessions exist only on the hand-wired
2025-era `NodeStreamableHTTPServerTransport`: `sessionIdGenerator` turns them
on, the server keeps a map of transports by session id, an unknown id gets
`404`, a non-initialize request without the header gets `400`, and an
`eventStore` enables SSE resumption. A hand-constructed `McpServer` with that
transport speaks only the 2025 era.
([Sessions, state, and scaling](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/sessions-state-scaling.md),
[Supporting 2026-07-28](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md))

**Stateless mode.** Stateless is the default and the only mode of
`createMcpHandler`. The `legacy` option has two values: `'stateless'`
(default) serves each 2025-era request from a fresh instance, completes a
2025 `initialize` with a normal `InitializeResult`, and answers `405` to
legacy GET and DELETE; `'reject'` answers a 2025 `initialize` with `400` and
error `-32022` and names `2026-07-28` as the only supported revision.
([Legacy clients](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/legacy-clients.md))

**stdio.** `serveStdio(factory)` owns the transport and returns a handle with
`close()`. It serves both eras unless `legacy: 'reject'`. Logs go to stderr.
([Serve over stdio](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md))

## 4. The NestJS integrations

Four packages on npm connect MCP to NestJS. Repository data from the GitHub
API and npm on 2026-11-05.

### `@nestjs/mcp` 0.0.3

- **Maintainer:** the NestJS core team (`nestjscore`, `kamilmysliwiec` on
  npm; repository `nestjs/mcp`, MIT, 10 stars, created 2026-11-04, last push
  2026-11-05).
- **Release cadence:** three releases on one day, 2026-11-04 (0.0.1, 0.0.2,
  0.0.3). The docs state no stability status.
- **Peers:** `@nestjs/common` and `@nestjs/core` `^12.0.0`,
  `@modelcontextprotocol/server` and `client` `^2.4.0`, `rxjs`,
  `reflect-metadata`. Node `>=20.19.0`. Install:
  `npm i --save @nestjs/mcp @modelcontextprotocol/server zod`. Zod 4.2 or
  later, or any Standard Schema library that produces JSON Schema; the README
  also lists ArkType, Valibot, and plain JSON Schema.
- **What it adds over the SDK:** `McpModule.forRoot({ name, version, ... })`;
  `@Tool`, `@Resource`, `@Prompt` on methods of ordinary providers; guards,
  interceptors, pipes, and exception filters run around every call;
  `McpExecutionContext.create(context)` reads the call inside them; the HTTP
  endpoint is a controller at `path` (default `'mcp'`), so the global prefix,
  versioning, middleware, CORS, and HTTP guards apply to it; each request
  gets its own server instance; `http.legacy` (`'stateless'` default,
  `'reject'`); `http.responseMode` (`'auto'`, `'json'`, `'sse'`);
  `http.allowedOrigins` (default localhost list, `false` disables);
  `http.allowedHosts` (not checked unless set); `http.maxRequestBodySize`
  (4 MiB); an `auth` block for an OAuth 2.1 resource server (`verifier` class,
  `resource`, `authorizationServers`, `scopesSupported`, `requiredScopes`),
  RFC 9728 metadata at `/.well-known/oauth-protected-resource/mcp`, a
  `WWW-Authenticate` challenge on `401`, per-tool `scopes` that give `403`;
  stdio through `McpStdioServer.listen()` in an application context with
  `McpStdioLogger` (stderr); an in-memory test client. Tool names must be 1
  to 128 characters from letters, digits, `_`, `-`, `.`; duplicates fail at
  startup. Return values: a string becomes a text block; another value with
  an `outputSchema` becomes validated `structuredContent` plus a JSON text
  block; a `CallToolResult` passes as-is. An `HttpException` becomes
  `isError: true` with its message; any other error becomes a generic
  "Internal server error" result and is logged.
  ([README](https://github.com/nestjs/mcp),
  [Overview](https://docs.nestjs.com/mcp/overview),
  [Transports](https://docs.nestjs.com/mcp/transports),
  [Primitives](https://docs.nestjs.com/mcp/primitives),
  `npm view @nestjs/mcp`)

### `@rekog/mcp-nest` 2.0.9

- **Maintainer:** `rinormaloku` (rekog-labs), MIT, 731 stars, created
  2025-01-26, last push 2026-10-29.
- **Release cadence:** 164 versions on npm. 2.0.0 on 2026-07-29, two days
  after SDK v2. Patch releases 2.0.1 to 2.0.9 between 2026-08-17 and
  2026-10-28, one every one to three weeks.
- **Peers:** `@modelcontextprotocol/server`, `core`, `node` `^2.0.0-beta.5`;
  `zod ^4.3.5`; `@nestjs/core`, `common`, `microservices` `>=9.0.0`;
  `@nestjs/platform-fastify ^11.1.5 || ^12.0.0`; `express >=4`; `rxjs`.
- **What it adds over the SDK:** MCP runs as a NestJS microservice transport
  strategy (`McpStrategy` with a `transports` array; no `McpModule`);
  `app.connectMicroservice` and `startAllMicroservices()` before `listen()`;
  `@McpController()`, `@Tool({ name, description, parameters })`,
  `@Payload()`, `@Ctx()` with an `McpContext` for progress; guards, pipes,
  interceptors, and filters apply because tools are `@MessagePattern`
  handlers; one endpoint serves the 2025 era (with sessions) and the stateless
  `2026-07-28` revision at the same time; stdio through
  `NestFactory.createMicroservice`; elicitation, sampling, and roots on
  `2026-07-28` through multi-round-trip requests; runtime tool registration
  through the `MCP_STRATEGY` token; a separate OAuth 2.1 authorization server
  in `@rekog/mcp-nest-auth` (beta); guides for Keycloak and Auth0 as external
  providers. The README names Streamable HTTP and stdio; it does not name SSE.
  ([README](https://github.com/rekog-labs/MCP-Nest),
  [Protocol revisions](https://github.com/rekog-labs/MCP-Nest/blob/main/docs/protocol-revisions.md),
  `npm view @rekog/mcp-nest`)

### `@nestjs-mcp/server` 2.0.0

- **Maintainer:** `adrian-d-hidalgo`, MIT, 40 stars, created 2025-04-26,
  last push 2026-10-01.
- **Release cadence:** 28 versions. 1.0.0 on 2026-02-17, 1.0.1 on
  2026-06-05, 2.0.0 on 2026-09-29, 3.0.0-next.2 on 2026-10-01.
- **Dependencies and peers:** depends on `@modelcontextprotocol/server
  ^2.0.0`, `@modelcontextprotocol/node ^2.0.0`, `zod ^4.4.3`. Peers
  `@nestjs/core`, `common`, `platform-express` `^11.1.28`. The peer range
  does not include NestJS 12.
- **What it adds over the SDK:** `@Resolver` groups capabilities; `@Tool`,
  `@Resource`, `@Prompt`; one `ALL /mcp` endpoint on Streamable HTTP; v2.0
  removed HTTP+SSE (`GET /sse`, `POST /messages`); stateless, a fresh server
  per request, legacy clients through the SDK fallback; `@UseGuards` with an
  `McpExecutionContext`; application-defined authentication strategies,
  request authorizers, per-capability `scopes`, optional RFC 9728 metadata;
  an `enabled` option for per-request tool visibility. stdio is not
  mentioned in the README.
  ([README](https://github.com/adrian-d-hidalgo/nestjs-mcp-server),
  `npm view @nestjs-mcp/server`)

### `nestjs-mcp` 1.0.6

- **Maintainer:** `devequijo`, MIT. All seven versions were published on
  2025-07-06 and 2025-07-07; the registry metadata changed on 2026-09-09. The
  repository URL on npm, `github.com/nestjs-mcp/server`, returns 404.
- **Dependencies and peers:** `@modelcontextprotocol/sdk ^1.0.1` (SDK v1),
  `class-validator`, `class-transformer`, `typescript-json-schema`,
  `commander`. Peers `@nestjs/core` and `common` `^10.0.0`.
- **What it adds:** `MCPModule.register({ autoScan: true })` scans
  controllers with `@UseMCP()` and makes one tool per handler; JSON Schema
  from DTO classes; validation with `class-validator`; a CLI
  `nestjs-mcp generate-config` for Claude Desktop (stdio).
  (`npm view nestjs-mcp readme`)

### Comparison table

| Criterion | SDK direct | `@nestjs/mcp` 0.0.3 | `@rekog/mcp-nest` 2.0.9 | `@nestjs-mcp/server` 2.0.0 | `nestjs-mcp` 1.0.6 |
| --- | --- | --- | --- | --- | --- |
| Maintainer | MCP project (Anthropic staff and others) | NestJS core team | rekog-labs, one maintainer | one maintainer | one maintainer |
| First publish | 2026-07-27 (v2) | 2026-11-04 | 2025-01-26 | 2025-04-29 | 2025-07-06 |
| Last publish | 2026-10-23 | 2026-11-04 | 2026-10-28 | 2026-09-29 | 2025-07-07 |
| Licence | Apache-2.0 (v2), MIT (v1) | MIT | MIT | MIT | MIT |
| Stars | — | 10 | 731 | 40 | repository 404 |
| NestJS peer | none | `^12.0.0` | `>=9.0.0` | `^11.1.28` | `^10.0.0` |
| SDK peer | — | `server ^2.4.0` | `server ^2.0.0-beta.5` | `server ^2.0.0` (dependency) | `sdk ^1.0.1` (v1) |
| Protocol eras | both, `legacy: 'stateless'` | both, `http.legacy: 'stateless'` | both, 2025 with sessions | both, via SDK fallback | 2025 era only (v1) |
| HTTP mount | `toNodeHandler` on any `(req, res)` | controller at `path`, global prefix applies | microservice strategy, mounts its own route | `ALL /mcp` | not documented |
| stdio | `serveStdio` | `McpStdioServer` | `createMicroservice` | not in README | yes, Claude Desktop config |
| Guards and DI | manual | native | native | native | native |
| Authorization | `requireBearerAuth`, `mcpAuthMetadataRouter`, project verifier | resource server, `verifier` class, RFC 9728, per-tool scopes | guards; separate AS package `@rekog/mcp-nest-auth` (beta) | strategies, scopes, optional RFC 9728 | not documented |
| Schema libraries | Standard Schema | Zod, ArkType, Valibot, JSON Schema | Zod 4 | Zod 4 | DTO classes via `typescript-json-schema` |
| Docs | ts.sdk.modelcontextprotocol.io | docs.nestjs.com/mcp | GitHub README and docs folder | GitHub README | npm README |

## 5. Tool definition

**Fields.** A tool has `name` (unique identifier), `title` (optional display
name), `description`, `icons` (optional), `inputSchema` (a JSON Schema
object, 2020-12 by default; it must not be `null`; for no parameters use
`{ "type": "object", "additionalProperties": false }`), `outputSchema`
(optional JSON Schema), and `annotations` (optional behaviour hints; clients
must treat them as untrusted unless the server is trusted). Properties may
carry `x-mcp-header` to mirror a value into an `Mcp-Param-{name}` header.
([Tools, Data Types](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#data-types))

**Output.** A result has `content` (text, image, audio, `resource_link`,
embedded `resource`), optional `structuredContent` (any JSON value; it must
conform to `outputSchema` when one is set; the server should also serialize
it into a text block), `isError`, and a required `resultType` (`"complete"`
or `"input_required"`). `tools/list` results must carry `ttlMs` and
`cacheScope`. Servers should return tools in a deterministic order. The tool
set must not vary per connection; it may vary by the authorization on the
request.
([Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools),
[Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog))

**Error shape.** Two mechanisms:

- Protocol errors are JSON-RPC errors `{ code, message, data? }`: unknown
  tool and malformed requests return `-32602`; `-32601` is method not found;
  `-32603` is an internal error; `-32020` header mismatch; `-32021` missing
  client capability; `-32022` unsupported protocol version. Codes `-32020` to
  `-32099` are reserved for the specification.
- Tool execution errors are results with `isError: true` and a text
  `content` that the model can act on. Clients should pass them to the model.

In the SDK, a thrown exception in a tool handler becomes an `isError` result
with the exception message as text; `outputSchema` validation is skipped on
`isError` results; input validation failures are also `isError` results, and
the handler does not run. Resource, prompt, and completion callbacks produce
protocol errors through `ProtocolError`. `McpError` and `ErrorCode` of v1 are
replaced by `ProtocolError` and `ProtocolErrorCode`.
([Tools, Error Handling](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#error-handling),
[SDK errors](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/errors.md),
[SDK tools](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/tools.md))

**Naming rules.** Tool names should be 1 to 128 characters, case-sensitive,
from `A-Z`, `a-z`, `0-9`, `_`, `-`, and `.`; no spaces or commas; unique
within a server. Examples: `getUser`, `DATA_EXPORT_v2`, `admin.tools.list`.
Uniqueness is scoped to one server; aggregating clients may prefix names with
a server identifier. A name outside the header-safe set is carried in
`Mcp-Name` as `=?base64?...?=`.
([Tool Names](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool-names))

**Count of tools.** The specification sets no limit. `tools/list` supports
pagination with `cursor` and `nextCursor`. Client-side facts:

- Claude Code "doesn't impose a fixed per-server tool cap; the practical limit
  is your context window budget". Tool search is on by default and defers
  tool definitions; only tool names and server instructions load at session
  start. `ENABLE_TOOL_SEARCH=auto` loads tools upfront while their
  definitions total under 10% of the context window. Claude Code cuts a tool
  description that loads upfront, and server instructions, at 4,096
  characters, and a description loaded through tool search at 16,384
  characters. A tool can set `_meta["anthropic/alwaysLoad"]`.
  ([Claude Code MCP](https://code.claude.com/docs/en/mcp))
- The Claude Messages API MCP connector page that I read states no tool-count
  limit. It supports allowlists and denylists per toolset.
  ([MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector))
- The SDK has an optional `maxToolInputElements` limit on array elements and
  object members in one call's arguments, off by default.
  ([SDK tools](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/tools.md))

## 6. How the assistant clients connect

### Claude

**claude.ai, Claude Desktop, Cowork (custom connectors).** Available on Free,
Pro, Max, Ultra, Team, and Enterprise; Free is limited to one custom
connector. Pro and Max add it under Customize > Connectors > Add custom
connector; Team and Enterprise owners add it under Organization settings.
The form takes the remote MCP server URL, a sign-in mode ("Sign in now",
"Sign in when needed", "No sign in"), and an OAuth client choice ("Use
Claude's published identity (Recommended)", "Register automatically", "Use
your own OAuth client"). Fixed credentials such as API keys and bearer tokens
go under Request headers, and Claude sends them on every request. Connections
originate from Anthropic's cloud, so the server must be reachable from the
public internet; a private server needs Anthropic's IP ranges allowlisted.
The article does not name the transport.
([Getting started with custom connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp))

**Claude Messages API MCP connector (beta `mcp-client-2026-09-15` or
`mcp-client-2025-11-20`).** The server "must be publicly exposed through HTTP
(supports both Streamable HTTP and SSE transports)". The `url` must start
with `https://`. `authorization_token` is an optional OAuth bearer token that
the caller obtains. Only tool calls are supported. Each `mcp_servers` entry
needs exactly one `mcp_toolset` in `tools`.
([MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector))

**Claude Code (local).** `claude mcp add --transport http <name> <url>`.
"The SSE (Server-Sent Events) transport is deprecated. Use HTTP servers
instead, where available." From v2.1.265, `--transport http` falls back to
SSE when the server does not accept HTTP. OAuth: run `/mcp` and follow the
browser login; tokens are stored and refreshed; `claude mcp login <name>`
works from the shell; a `401` or `403` marks the server as needing
authentication; a server without Dynamic Client Registration takes
`--client-id`, `--client-secret`, `--callback-port`. A fixed token goes in
`--header "Authorization: Bearer <token>"`; then Claude Code does not fall
back to OAuth. `.mcp.json` expands `${VAR}` and `${VAR:-default}` in `url`
and `headers`; credential variable names such as `ANTHROPIC_API_KEY` read as
empty there. Tool output is limited to 25,000 tokens by default
(`MAX_MCP_OUTPUT_TOKENS`).
([Claude Code MCP](https://code.claude.com/docs/en/mcp))

### ChatGPT

**Connection.** A custom MCP server is added at chatgpt.com/plugins with the
plus button and "Add custom MCP server": name, description, then a Public
endpoint (an HTTPS URL reachable from the internet that supports streamable
HTTP, typically at `/mcp`) or a Secure MCP Tunnel (which can reach a stdio or
HTTP server off the public internet), then authentication, a risk warning,
and "Create as a plugin". ChatGPT then shows the discovered tools. Public HTTPS
is required for plugin submission.
([Connect to ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt))

**Authorization.** An authenticated server must implement OAuth 2.1 per the
MCP authorization specification. ChatGPT runs the authorization-code flow
with PKCE `S256`. The server serves RFC 9728 metadata at
`/.well-known/oauth-protected-resource` or advertises it in `WWW-Authenticate`
on `401`, with `resource`, `authorization_servers`, and optional
`scopes_supported`. The authorization server metadata must have `issuer`,
`authorization_endpoint`, `token_endpoint`, and
`code_challenge_methods_supported` with `S256`. Client registration: Client
ID Metadata Documents (preferred; ChatGPT uses
`https://chatgpt.com/oauth/client.json` as `client_id`; token endpoint auth
`none` or `private_key_jwt`), Dynamic Client Registration
(`registration_endpoint`; ChatGPT registers once per connection), or a
predefined client. Redirect URIs:
`https://chatgpt.com/connector_platform_oauth_redirect` when the server meets
RFC 9207, else `https://chatgpt.com/connector/oauth/{callback_id}`. ChatGPT
sends the `resource` parameter; the server verifies issuer, audience, expiry,
and scopes on every request. Not supported: static API keys ("ChatGPT cannot
present custom API keys"), client credentials and other machine-to-machine
grants, customer mTLS certificates. "Anonymous, read-only operation is
allowed"; servers that expose customer data or write actions should
authenticate. Per-tool `securitySchemes` (`noauth`, `oauth2` with scopes)
declare which tools need a token.
([Apps SDK authentication](https://developers.openai.com/apps-sdk/build/auth))

**Deep research and company knowledge.** The server should implement two
read-only tools, `search` and `fetch`, with a fixed result shape; citations
need a non-empty `url`. The Responses API `mcp` tool takes `server_label`,
`server_url`, `allowed_tools`, and `require_approval`.
([OpenAI MCP docs](https://developers.openai.com/api/docs/mcp))

**Plans.** The OpenAI help article "Developer mode and full MCP connectors in
ChatGPT" (article 12584461) did not load for this research. The search result
summary of it says developer mode, full MCP support, and apps are offered on
ChatGPT web to Business and Enterprise/Edu customers, that only admins and
owners turn it on for Business, and that the toggle is under Workspace
Settings > Permissions & Roles > Connected Data. This is recorded from the
search summary, not from the page.
([Help article 12584461](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt))

### Open WebUI (open source)

Native MCP support exists since v0.6.31 and "is Streamable HTTP only". An
admin adds a server under Settings > Admin > Integrations > External Tool
Servers > Add Connection, sets Type to "MCP (Streamable HTTP)", and enters
the Server URL. Auth modes: None; Bearer (a Key is required, or the header is
sent empty); Session (the user's Open WebUI session token); OAuth (the access
token of the user's SSO sign-in); OAuth 2.1 (Dynamic Client Registration;
Register Client); OAuth 2.1 (Static) (a pre-created Client ID and Secret,
optional OAuth Server URL; Register Client still required). Both OAuth 2.1
modes have an OAuth Resource Parameter setting (RFC 8707) and a scopes
setting. The docs warn against setting an OAuth 2.1 tool as a default tool on
a model, because the flow needs a browser redirect. stdio and SSE servers go
through the separate `mcpo` proxy.
([Open WebUI MCP](https://docs.openwebui.com/features/extensibility/mcp))

**LibreChat (second open source client, for reference).** Servers are
defined under `mcpServers` in `librechat.yaml` or created in the UI with an
MCP Server URL and a Transport of "Streamable HTTPS" or "SSE". Authentication
"API Key" sends one shared key or a per-user key with a header format of
Bearer, Basic, or Custom. OAuth takes Client ID, Client Secret, Authorization
URL, Token URL, Scope, and leaves the client fields empty for Dynamic Client
Registration. UI-created servers can reach remote URLs only.
([LibreChat MCP](https://www.librechat.ai/docs/features/mcp))

### Client summary

| Client | Transport | URL | Fixed bearer token | OAuth client registration |
| --- | --- | --- | --- | --- |
| Claude connectors (claude.ai, Desktop) | not named in the article; the API connector page lists Streamable HTTP and SSE | public, reachable from Anthropic's cloud | yes, Request headers | published identity (CIMD), automatic (DCR), own client |
| Claude Messages API connector | Streamable HTTP and SSE | `https://` required | `authorization_token` field | caller obtains the token |
| Claude Code | HTTP recommended, SSE deprecated | any, local or remote | yes, `--header` | DCR, or `--client-id`/`--client-secret` |
| ChatGPT | streamable HTTP | public HTTPS, or Secure MCP Tunnel | no | CIMD preferred, DCR, predefined client |
| Open WebUI | Streamable HTTP only | any the server can reach | yes, Bearer | DCR, or static client |
| LibreChat | Streamable HTTP or SSE | remote URL (UI), any (yaml) | yes, API Key header | DCR, or client id and secret |

## 7. MCP tools from the OpenAPI document

**The NestJS side.** `@nestjs/swagger` 12.1.0 builds the OpenAPI document
with `SwaggerModule.createDocument(app, config, options)` from the
controllers, and serves the JSON at `<path>-json` (for example
`/api-json`) or at `jsonDocumentUrl`. The docs do not name the OpenAPI
version of the document; the Standard Schema examples target `openapi-3.0`.
([NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction))

**Packages that read an OpenAPI document and make tools:**

- `openapi-mcp-generator` 5.0.1 (2026-10-24, MIT, maintainer
  `harshasurisetty`). A CLI and library. Input: OpenAPI 3.0 or 3.1 in YAML
  or JSON, from a file or URL; Swagger 2.0 is refused. Output: a standalone
  Node.js/TypeScript server project on SDK v2 (`@modelcontextprotocol/server
  ^2.4.0`) that serves `2026-07-28` and 2025-era clients, with stdio, SSE and
  Streamable HTTP through Hono, or a Cloudflare Worker. Generation is a
  build-time step. Upstream credentials come from environment variables per
  security scheme (`API_KEY_<SCHEME>`, `BEARER_TOKEN_<SCHEME>`, ...); tools
  fail closed when a credential is missing; `--header-passthrough` forwards
  per-user keys. The library exports `getToolsFromOpenApi()`, which returns
  tool definitions for use in the project's own code.
  ([README](https://github.com/harsha-iiiv/openapi-mcp-generator))
- `@ivotoby/openapi-mcp-server` 1.16.1 (2026-06-15, MIT, maintainer
  `ivotoby`). A run-time proxy: it reads a spec from a URL, file, stdin, or
  string and exposes each operation as a tool that calls the REST API.
  Transports: stdio, and the 2025-era Streamable HTTP with `Mcp-Session-Id`,
  a GET SSE stream, and DELETE. It binds to `127.0.0.1` by default. Tool
  names are abbreviated; names over 64 characters cause errors when
  abbreviation is off. Filters: `--tools all|dynamic|explicit`, `--tag`,
  `--resource`, `--operation`, `--exclude-tag`. Upstream auth: static headers
  or an `AuthProvider` with `getAuthHeaders()` and `handleAuthError()`. It
  imports `@modelcontextprotocol/sdk` (v1).
  ([README](https://github.com/ivo-toby/mcp-openapi-server))
- `openapi-mcp-server` 2.1.0 (2025-09-06) is "MCP server for interacting
  with openapisearch.com API". It is not a generator for a project's own
  document. (`npm view openapi-mcp-server`)

**Packages that read the NestJS controllers instead of the document:**

- `nestjs-mcp` 1.0.6 scans controllers marked `@UseMCP()` and makes one tool
  per handler, with JSON Schema from the DTO classes through
  `typescript-json-schema`. It runs on SDK v1 and peers on NestJS 10. See
  section 4.

**Schema reuse without a generator.** `@nestjs/mcp` accepts plain JSON
Schema as a tool `inputSchema`, next to Zod, ArkType, and Valibot. Its docs
do not describe an import of an OpenAPI document.
([README](https://github.com/nestjs/mcp))

**One fact from the earlier research applies here.** grocy-mcp generated 87
tools from the Grocy OpenAPI document, one per operation, and returned the
raw HTTP response. The earlier research recorded the section 3.1 defects that
came with that: a `204` became a `null` result, and Zod `z.object` stripped
unknown fields without an error. (Branch `research/mcp-server`, section 7.)

## Not verified

- Whether `@modelcontextprotocol/express` 2.0.2 passes `expectedResource`.
  The SDK page names only 2.0.1 as not passing it.
- The ChatGPT plan rules. The help article did not load; section 6 marks the
  source.
- The transport that claude.ai custom connectors accept. The support article
  does not name it; the Messages API connector page names Streamable HTTP and
  SSE.
- The stability status of `@nestjs/mcp`. The docs and README state none; the
  version is 0.0.3 and the package is one day old.

## Sources

- MCP versioning: https://modelcontextprotocol.io/specification/versioning
- MCP 2026-07-28 changelog: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- MCP transports overview: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports
- MCP stdio binding: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio
- MCP Streamable HTTP binding: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
- MCP authorization: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- MCP client registration: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration.md
- MCP authorization security considerations: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations.md
- MCP tools: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- TypeScript SDK README: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md
- SDK protocol versions: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/protocol-versions.md
- SDK serve over HTTP: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md
- SDK serve with Express: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/express.md
- SDK serve over stdio: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/stdio.md
- SDK legacy clients: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/legacy-clients.md
- SDK sessions, state, and scaling: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/sessions-state-scaling.md
- SDK authorization: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/authorization.md
- SDK tools: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/tools.md
- SDK errors: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/errors.md
- SDK supporting 2026-07-28: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md
- `@nestjs/mcp` repository: https://github.com/nestjs/mcp
- NestJS MCP docs: https://docs.nestjs.com/mcp/overview, https://docs.nestjs.com/mcp/transports, https://docs.nestjs.com/mcp/primitives
- NestJS OpenAPI docs: https://docs.nestjs.com/openapi/introduction
- MCP-Nest repository: https://github.com/rekog-labs/MCP-Nest
- MCP-Nest protocol revisions: https://github.com/rekog-labs/MCP-Nest/blob/main/docs/protocol-revisions.md
- nestjs-mcp-server repository: https://github.com/adrian-d-hidalgo/nestjs-mcp-server
- Claude custom connectors: https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp
- Claude Messages API MCP connector: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
- Claude Code MCP: https://code.claude.com/docs/en/mcp
- OpenAI MCP docs: https://developers.openai.com/api/docs/mcp
- OpenAI Apps SDK, connect to ChatGPT: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- OpenAI Apps SDK, authentication: https://developers.openai.com/apps-sdk/build/auth
- OpenAI help, developer mode (did not load): https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt
- Open WebUI MCP: https://docs.openwebui.com/features/extensibility/mcp
- LibreChat MCP: https://www.librechat.ai/docs/features/mcp
- openapi-mcp-generator: https://github.com/harsha-iiiv/openapi-mcp-generator
- mcp-openapi-server: https://github.com/ivo-toby/mcp-openapi-server
- npm registry, `npm view <name> version` and `npm view <name> time` on 2026-11-05, for every version in this file
- GitHub API, `gh api repos/<owner>/<repo>` and `.../releases` on 2026-11-05, for stars, dates, and licences
- Earlier research: branch `research/mcp-server`, commit `d0562f0`, `docs/research/mcp-server.md`
