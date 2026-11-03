---
status: accepted
---

# The stack

Grocy Next needs one stack before any milestone can design a subdomain.
The architecture map proposed NestJS, TypeORM, React, Redux, shadcn/ui,
Tailwind, and NX. The stack research checked each part against the current releases. We decided
to keep every proposed part and to add the parts that the proposal left open.

## The decision

- Server: NestJS 12.2 or later, as an ESM application, on the Express
  adapter. TypeORM 1.x with the Data Mapper pattern only. The entity model
  serves SQLite and PostgreSQL.
- Web app: React 19, Redux Toolkit with RTK Query, shadcn/ui on the Base UI
  primitives, Tailwind 4.
- Workspace: NX 24 with pnpm. Thin apps in `apps/api` and `apps/web`. The
  code lives in `libs/`, grouped by domain, with the four NX library types
  (`feature`, `ui`, `data-access`, `util`). Each library carries a `scope:`
  tag and a `type:` tag. The NX module boundary lint rule enforces that the
  two apps never import each other, and that a domain imports only itself and
  `shared`. A library starts coarse. It is split when the design settles.
- Tools: Node 26, TypeScript 6, Vitest for the unit and integration tests on
  both sides, Playwright for the web end-to-end tests, ESLint with the NX
  plugin.
- Processes: one NestJS process serves the Next API, the legacy API, the MCP
  server, and the static files of the web app. One container image.
- Next API style: REST with an OpenAPI document that NestJS generates from
  the controllers. RTK Query generates its API slice from that document.

## Why we kept TypeORM and Redux Toolkit

The stack research marked TypeORM and Redux Toolkit as failed on an
open-issue trend metric: more issues opened than closed since 2026-05-01.
Jeff rejected that metric. It counts issues and does not read them, so it
says nothing about the substance of the backlog. On substance, both parts
pass: the NestJS team maintains the TypeORM package, the NestJS docs and
samples use TypeORM, and the Redux docs name RTK Query as the tool for
server data. The Data Mapper rule for TypeORM is a coding standard, because
TypeORM also offers Active Record and a DDD project must use one pattern.

## Why we kept NX

The NX NestJS plugin, version 24.0.3, declares a peer range that stops before
NestJS 12. That is an obstacle, not a failure. The plugin has generators only
and no executors. pnpm installs it past the peer range with no flag, and the
build and serve targets work. Only the generators misbehave: they write
NestJS 11 versions. Three public repositories run NestJS 12 inside NX 24 this
way on 2026-11-02. A pull request that lifts the peer range is approved and
green, with NX 24.1 as its target.

The consequences:

- The API builds with rspack through the NX rspack plugin. rspack uses SWC,
  which emits the decorator metadata that NestJS needs. The NX 24 default
  serve, `node --watch` on the source, does not emit it, and esbuild and tsx
  do not either. Do not use them for the API.
- Until NX 24.1 ships, do not run the NX NestJS generators. Write the app
  wiring by hand and scaffold with `nest generate` from the NestJS CLI 12.
  After NX 24.1 ships, the NX generators take over.
- NestJS 12.2.0 and later export their `package.json`. Earlier 12.x versions
  lose peer dependencies in the generated `package.json`. Pin 12.2.0 or later.

## Considered options

- MikroORM in place of TypeORM. Rejected: TypeORM was the proposal and passes
  on substance. MikroORM is the choice only if the ORM must enforce the Unit
  of Work pattern.
- TanStack Query in place of Redux Toolkit. Rejected: it manages server data
  only, so the app would need a second tool for the client state.
- pnpm workspaces with Turborepo in place of NX. Rejected: the NX obstacle
  has a workaround, and Turborepo has no project graph, no tags, and no
  boundary rule.
- Radix in place of Base UI. Rejected: Base UI is the shadcn/ui default since
  July 2026, and some new components exist only for Base UI.
- Fastify in place of Express. Rejected: a household app does not need the
  throughput, and Express has the widest ecosystem.
- Two or more processes. Rejected: one image fits Docker, Compose, Portainer,
  and k3s with no extra wiring. A later decision on the MCP transport can
  move the MCP server out if the transport needs that.
- GraphQL or tRPC for the Next API. Rejected: the legacy API is REST, the MCP
  server and third-party tools consume the Next API too, and one OpenAPI
  document serves every consumer. tRPC serves only TypeScript clients.

## Sources

- The stack research on branch `research/stack-validation`.
- The monorepo conventions research on branch `research/monorepo-conventions`.
- The NX with NestJS 12 research on branch `research/nx-nestjs12`.
