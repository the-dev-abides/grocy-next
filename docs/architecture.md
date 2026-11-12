# Architecture overview

This document ties the architecture decision records (ADRs) and the parts of
Grocy Next together. It covers the parts and their boundaries, who owns which
data before and after API parity, the legacy API and the Next API, storage,
the MCP server, the Mealie link, the deployment shape, and the stack. It does
not cover module design, schemas, or UI design. Those belong to the
milestones.

Every decision in this document is tentative until Jeff says otherwise. A
decision lives in its ADR. This document points at the ADR and does not
restate the reasons. `GLOSSARY.md` defines the terms that this document uses.
`docs/roadmap.md` orders the work.

## Parts

Grocy Next is one NestJS process in one container image (ADR 8). The process
serves four surfaces:

- The web app. React, served as static files by the same process.
- The Next API. REST, with an OpenAPI document that NestJS generates. The web
  app and the MCP server consume it. Third-party tools can consume it.
- The legacy API. The Grocy v4.7.1 API at the same paths, for backwards
  compatibility.
- The MCP server. One MCP tool for each Next API operation.

The four surfaces sit over the domains. A surface holds no business rules. The
domains hold the data and the rules. The shared services hold the functions
that more than one domain uses: Calendar, Files, Print, Userfields, and
System.

Below the domains sit two kinds of storage. The Grocy API client reads and
writes a running Grocy instance. The Grocy Next storage is a SQLite or a
PostgreSQL database through TypeORM. Which one a domain uses depends on the
stretch. The section "Data ownership" gives the rule.

Outside the process are four external systems:

- Grocy v4.7.1. The data owner until API parity. Grocy Next talks to it
  through the Grocy API. Grocy is switched off at the end of milestone 13.
- Mealie. An external system that stays. The Mealie link is opt-in.
- Third-party tools built for Grocy, such as the Grocy mobile app. They use
  the legacy API after API parity.
- AI assistants. They use the MCP server.

```text
 Browser          Assistant        Grocy tools
   |                 |                 |
   v                 v                 v
+-----------------------------------------------------+
| Grocy Next: one NestJS process, one image            |
|                                                      |
|  Web app    Next API    MCP server    Legacy API     |
|  ------------------------------------------------    |
|  Domains: Inventory, Recipes, Household, Users,      |
|           Mealie link                                |
|  Shared services: Calendar, Files, Print,            |
|                   Userfields, System                 |
|  ------------------------------------------------    |
|  Grocy API client          Grocy Next storage        |
+-----------------------------------------------------+
         |                          |
         v                          v
   Grocy v4.7.1               SQLite or PostgreSQL

   Mealie  <---- Mealie link, opt-in
```

## Domains and subdomains

A domain is one area of the household that Grocy Next builds. A subdomain is
one cluster of data and rules inside a domain. Other subdomains point at a
subdomain by id only. The domain list is a working list. The build of each
milestone settles its domains and subdomains.

| Domain      | Subdomains                                   | Boundary fact                                                                                                                             |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory   | Products, Stock, Shopping list, Review queue | Stock, Shopping list, and Review queue point at Products and at nothing else. Nothing outside Stock points at a stock entry or a booking. |
| Recipes     | Recipes, Meal plan                           | Points at Products by id. Built for parity. See "The Mealie link" for the ownership rule.                                                 |
| Household   | Chores, Tasks, Batteries, Equipment          | No reference between any two of them. Each points at Users or at nothing.                                                                 |
| Users       | Users                                        | A leaf. Stock, Chores, and Tasks point at it.                                                                                             |
| Mealie link | Mealie link                                  | Talks to Mealie. Points at Products and Stock by id.                                                                                      |

Products holds the dimensions: products, product barcodes, quantity units,
conversions, locations, stores, and product groups. A dimension is a table of
reference values that transactions point at. Stock holds the stock entries,
the bookings, the transactions, and the stock rules.

These are not domains:

- Userfields. A cross-cutting extension mechanism. It references every
  subdomain by name. It is a shared service.
- Master data. A menu group over five subdomains, not a data cluster.
- Scanning. An action inside the Inventory workflows. Its purpose is to find
  the product faster.
- The web app, the legacy API, the Next API, and the MCP server. Surfaces
  over the domains.

## The review queue

The review queue serves bulk scanning only (ADR 6). The household scans one
item after another, with no stop for input. An assistant reads a receipt and
creates items through the MCP server. Each scanned or read item becomes a
pending scan. The user accepts or rejects pending scans in bulk or one by one.
An accepted pending scan becomes a booking. An ordinary edit, a direct stock
action, or an MCP change applies at once and does not pass through the review
queue.

## Data ownership

Grocy owns its data until API parity. Grocy Next reads and writes Grocy
through the Grocy API. At API parity, data ownership moves from Grocy to
Grocy Next through an API-based import. Mealie owns recipes when the Mealie
link is on (ADR 7, tentative).

| Data                                                      | Companion stretch and UI parity stretch, milestones 1 to 9 | API parity stretch, milestones 10 to 13 | After parity, milestone 14 on |
| --------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------- | ----------------------------- |
| Products, Stock, Shopping list                            | Grocy                                                      | Grocy Next from milestone 10            | Grocy Next                    |
| Recipes, Meal plan                                        | Grocy                                                      | Grocy Next from milestone 11            | Grocy Next                    |
| Chores, Tasks, Batteries, Equipment                       | Grocy                                                      | Grocy Next from milestone 12            | Grocy Next                    |
| Users, permissions, user settings, shared services        | Grocy                                                      | Grocy Next from milestone 13            | Grocy Next                    |
| Review queue                                              | Grocy Next                                                 | Grocy Next                              | Grocy Next                    |
| Alternate names for products and stores                   | Grocy Next                                                 | Grocy Next                              | Grocy Next                    |
| Mealie link: product to food links, unit links, conflicts | Grocy Next                                                 | Grocy Next                              | Grocy Next                    |
| Recipes in Mealie, when the link is on                    | Mealie                                                     | Mealie                                  | Mealie                        |
| Change log                                                | None                                                       | None                                    | Grocy Next from milestone 14  |

In the API parity stretch, Grocy stays the data owner through milestone 12.
Each of milestones 10 to 12 tests its legacy API against an imported copy of
the household data. Milestone 13 does the import and the switch.

The data that Grocy Next owns in the companion stretch has no Grocy field. The
decision on where Grocy Next stores the alternate names belongs to milestone 4.

## The Next API and the legacy API

The Next API is the API that Grocy Next designs for its own clients. It is
REST. NestJS generates its OpenAPI document from the controllers, and RTK
Query generates the web app's API slice from that document (ADR 8). The Next
API has these rules, from the roadmap:

- Every operation that a milestone adds is also an MCP tool in the same
  milestone.
- Every change returns a confirmation of the stored values.
- An unknown field is an error.
- A change touches no other field and has no hidden side effect.
- A full list has no cut-off.

ADR 14 holds the conventions that every resource follows: the id format,
the error body, the body of a change, the list shape, the field names and
formats, and the poll for a change that the server makes on its own.

The legacy API is the Grocy v4.7.1 API, served by Grocy Next at the same
paths. Its contract is `docs/reference/grocy-openapi.json`. It exists for
backwards compatibility. Grocy Next serves it from
milestone 10, one domain at a time, from Grocy Next storage. Before milestone
10, Grocy serves its own API and Grocy Next does not serve the legacy API.

The two APIs never mix. The legacy API keeps the Grocy paths, field names,
and behaviour. The Next API has its own design. Both sit over the same
domains.

Both APIs live under `/api`. The legacy API takes `/api` itself, because the
Grocy paths start there, for example `/api/stock`. The Next API lives under
`/api/v2`. The version number starts at 2 on purpose: the legacy API is the
first API at `/api`, so the Next API never shares a number with it. The web
app takes the root path and every path outside `/api`.

## The MCP server

The MCP server runs in the same process as the Next API (ADR 8). It has one
MCP tool for each Next API operation. It is complete when the Next API is
complete, at milestone 13. The MCP server replaces grocy-mcp and the MCP
tools of Grocy Mealie Sync.

The MCP server follows the Next API rules: confirmation of the stored values,
an error on an unknown field, no hidden side effect, full lists with no
cut-off.

ADR 12 decides the MCP transport and the authorization. The MCP server uses
Streamable HTTP at `/api/v2/mcp` in the NestJS process. One bearer token from
`MCP_TOKEN` protects the endpoint. With no token, the endpoint is off.
Milestone 2 built this base and one tool for each Next API operation. The
tool providers live in the domain libraries, and the API app registers them.

## The Mealie link

The Mealie link is the opt-in connection between Grocy Next and a Mealie
instance. It replaces Grocy Mealie Sync. It holds the links between products
and foods and between quantity units, the unlinked lists, the link
suggestions, the broken-link check, and the sync conflict view.

Mealie is the source of truth for recipes. Grocy Next is the source of truth
for products, quantity units, and stock (ADR 7, tentative). Grocy Next also
builds the Recipes domain for parity with Grocy. How the Recipes domain and
Mealie co-exist when the link is on is not decided. The Mealie link milestone
refines ADR 7.

Facts from the Mealie research that shape the link:

- Mealie has no link entity. A food `extras` field can hold a Grocy Next id.
  A unit cannot. Grocy Next holds the links.
- Mealie fires no event on a food or a unit write. The link polls.
- Mealie has no bulk writes for foods or units.

## Storage

Grocy Next stores the data it owns in SQLite or PostgreSQL through TypeORM
with the Data Mapper pattern. One entity model serves both databases (ADR 8).
SQLite and PostgreSQL are supported from milestone 1.

In the companion stretch and the UI parity stretch, Grocy Next storage holds
only the data that Grocy Next owns. The Grocy API client is the storage for
everything else. In the API parity stretch, each domain gets its Grocy Next
storage and its entity model, one domain at a time.

The default database for a new installation and the image layout are not
decided. Milestone 1 decides them.

## Deployment shape

Grocy Next ships as one container image. One NestJS process serves the web
app, the Next API, the legacy API, and the MCP server (ADR 8). Docker,
Compose, Portainer, and k3s are supported from milestone 1. Every milestone
ships the image, the Compose file, the Portainer stack, and the k3s
manifests.

In the companion stretch and the UI parity stretch, a deployment has Grocy
Next, Grocy, and the database. After the switch, a deployment has Grocy Next
and the database. Mealie is a separate deployment in both cases.

The detail of the image layout and the k3s manifests is not decided.
Milestone 1 decides it.

## The stack

ADR 8 holds the stack and the reasons. In short:

- Server: NestJS 12.2 or later, ESM, Express, TypeORM 1.x with Data Mapper.
- Web app: React 19, Redux Toolkit with RTK Query, shadcn/ui on Base UI,
  Tailwind 4.
- Workspace: NX 24 with pnpm. Thin apps in `apps/api` and `apps/web`. The
  code in `libs/`, grouped by domain, with `scope:` and `type:` tags and the
  module boundary lint rule.
- Tools: Node 26, TypeScript 6, Vitest, Playwright, ESLint.

The NX library layout follows the domain list. A domain imports only itself
and `shared`. The two apps never import each other. A library starts coarse.
It is split when the design settles.

## Not decided

Each item is decided in the milestone named next to it.

| Item                                                    | Milestone            |
| ------------------------------------------------------- | -------------------- |
| Image layout, default database, k3s manifests           | Milestone 1          |
| What one accepted pending scan becomes in each workflow | Milestones 2 and 3   |
| Where Grocy Next stores the alternate names             | Milestone 4          |
| Bulk operations and the all-or-nothing option           | Milestone 4          |
| The MCP transport and the authorization                 | Milestone 4 or later |
| The full scope of the Mealie link, the ADR 7 refinement | Milestone 5          |
| Localization                                            | Milestone 6          |
| The change log and undo of every change                 | Milestone 14         |
| Authentication and multi-user                           | Milestone 15         |
| The smart scale over Bluetooth and Wi-Fi from a web app | Milestone 16         |

## Sources

- ADR 6: the review queue serves bulk scanning only.
- ADR 7: Mealie owns recipes. Tentative.
- ADR 8: the stack.
- `docs/roadmap.md`: the milestones and the rules.
- `GLOSSARY.md`: the terms.
- The research branches: `research/grocy-survey`, `research/grocy-data-model`,
  `research/grocy-stock-workflows`, `research/mealie-api`,
  `research/sync-tools-survey`, `research/stack-validation`,
  `research/monorepo-conventions`, `research/nx-nestjs12`.
