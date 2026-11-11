---
status: accepted
---

# The MCP server base

The MCP (Model Context Protocol) server is one of the four surfaces of the
NestJS process. The roadmap rule says that every Next API operation of a
milestone is also an MCP tool in that milestone. Milestone 2 builds the base
before any tool is added to it. We decided on Streamable HTTP in the NestJS
process, one fixed bearer token until milestone 15, the `@nestjs/mcp`
adapter on the official SDK, Zod as the one schema source for both surfaces,
tools written by hand with a completeness test, and tool results that mirror
the Next API bodies.

## The decision

- Transport: Streamable HTTP only, at `/api/v2/mcp`, in the one NestJS
  process. The global prefix of the Next API applies to the endpoint. No
  stdio in milestone 2. The specification revision is `2026-07-28`; the
  adapter also serves 2025-era clients statelessly.
- Authorization: one fixed bearer token from the environment variable
  `MCP_TOKEN`. A NestJS guard on the MCP endpoint compares the
  `Authorization: Bearer` header and answers `401` on a mismatch. The server
  refuses a token under 32 characters at startup with a clear message. When
  the variable is not set, the MCP endpoint is not mounted and the startup
  log says so. The Origin check keeps the adapter default: an assistant sends
  no `Origin` header, and a request with no `Origin` passes. Milestone 15
  replaces the token with the user login. ChatGPT cannot send a fixed
  header, so the user documentation names it as not supported until then.
- Adapter: `@nestjs/mcp` 0.0.4 on `@modelcontextprotocol/server` 2.4.0, with
  Zod 4. The package is days old and the NestJS core team maintains it. The
  lockfile pins the version, and the build updates it as it matures. The
  hedge is the thin-adapter rule: a tool method holds no rules and calls the
  same domain service as the controller, so a swap to the SDK direct touches
  only the tool methods.
- One schema for both surfaces: Zod 4 is the one source. The controllers
  validate the request body with a Zod pipe through `nestjs-zod`,
  `@nestjs/swagger` builds the OpenAPI document from the Zod schema, and the
  tool method takes the same Zod object as its `inputSchema`. A strict
  object refuses an unknown field with a clear error. This binds the
  unknown-field rule of the Next API conventions.
- Tool mapping: by hand. One `@Tool` method per Next API operation, in a
  provider next to the controller in the same domain library. Both call one
  service method. A unit test compares the operation list of the OpenAPI
  document with the tool list and fails when one operation has no tool. The
  test covers every operation in the document, not only the operations of
  the current milestone, so milestone 2 also adds `list_products` for the
  product list of milestone 1.
- Tool names: verb first, snake case, with the fixed verb set `list`, `get`,
  `create`, `update`, `delete`. The milestone 2 tools are `list_products`,
  `list_pending_scans`, `get_pending_scan`, `create_pending_scan`,
  `update_pending_scan`, `delete_pending_scan`, `create_booking`, and
  `create_product`. The description of `delete_pending_scan` says that a
  delete is a reject.
- Tool results mirror the Next API: the confirmation is the Next API
  response body as `structuredContent`, with the response schema as
  `outputSchema`. An error is `isError: true` with the Next API error body
  as the text, the Grocy message included. Every error that a tool can
  return is an `HttpException`, so no error becomes the generic internal
  error of the adapter. The exact bodies are the Next API conventions. The
  MCP server adds nothing and hides nothing.
- Where the base lives: `McpModule.forRoot`, the token guard, and the
  variable reader live in the API app next to the storage and health
  wiring. The tool providers live in the domain libraries.
- How the maintainer connects a client: one user documentation page,
  "Connect an assistant", with the recipes for Claude Code (`claude mcp add
--transport http` with the `--header`), claude.ai and Claude Desktop (a
  custom connector with "No sign in" and the header under Request headers;
  the server must be reachable from the public internet), Open WebUI
  (type "MCP (Streamable HTTP)", auth mode Bearer), and the ChatGPT note.
  The page shows `openssl rand -hex 32` as the way to make the token. The
  development documentation names `@modelcontextprotocol/inspector` as the
  test client.

## Considered options

- stdio, alone or with HTTP. Rejected: the client must start the server as
  a subprocess on its own machine, with the Grocy variables and the
  database, outside the container. Every assistant client reaches
  Streamable HTTP.
- The path `/mcp`. Rejected: it needs an exception in the global prefix and
  in the web app catch-all. The tools mirror the v2 operations, so the v2
  prefix is the right version mark.
- No authorization. Rejected: the server has write tools.
- OAuth 2.1 with an external identity provider. Rejected until milestone
  15: every self-hosting user would run an identity provider.
- An in-process authorization server, `@rekog/mcp-nest-auth`. Rejected:
  beta, and bound to the `@rekog/mcp-nest` adapter.
- The SDK direct, mounted on one Express route. Rejected for now: no
  guards and no dependency injection. It is the fallback if `@nestjs/mcp`
  does not mature.
- `@rekog/mcp-nest`. Rejected: one maintainer, a microservice strategy that
  mounts its own route, and a Fastify peer that this app does not use.
- `@nestjs-mcp/server`. Rejected: it peers on NestJS 11 only.
- `class-validator` DTO classes with a JSON Schema per tool read from the
  OpenAPI document. Rejected: the OpenAPI 3.0 dialect differs from JSON
  Schema 2020-12, and the tool schema would be a derived copy.
- Tools from the OpenAPI document at run time, with a proxy over HTTP.
  Rejected: SDK v1 and the 2025 era, and the raw HTTP response as the
  result. grocy-mcp works this way and has the section 3.1 defects.
- Tools from the controllers with `nestjs-mcp`. Rejected: SDK v1, NestJS
  10, and the repository is gone.
- Build-time generation of a standalone server project. Rejected: a second
  process, against ADR 8.
- Resource-first names, dotted names, and the NestJS operation id. Rejected:
  Claude Code loads only the names at session start, and a name must say
  what the tool does on its own.
- A tool-specific result shape. Rejected: one body for both surfaces.

## Consequences

- ADR 0014, the Next API conventions, inherits Zod as the validation
  library and the strict object as the unknown-field rule, and sets the
  error body and the body of a change that the tools return.
- The MCP endpoint needs HTTPS for a remote assistant. The milestone 1
  deployments serve HTTPS through the Ingress.
- A tool call shares the Grocy API key of the process. The token does not
  identify a user. Milestone 14 logs a change, and milestone 15 adds the
  user.

## Sources

- The MCP research on branch `research/mcp-server-2026`.
- Ticket [#70](https://github.com/the-dev-abides/grocy-next/issues/70).
