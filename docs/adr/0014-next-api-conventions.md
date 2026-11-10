---
status: accepted
---

# The Next API conventions

Every resource of the Next API follows one set of conventions. The review
queue resources of ADR 0010 are the first resources that need them, and the
MCP tools of ADR 0012 return the same bodies. We decided on integer ids, RFC
9457 Problem Details for errors, the resource as the body of every change, an
`items` envelope for lists, camelCase fields with ISO dates and JSON numbers,
and a poll for the changes that the lookup worker makes.

## The decision

- Id: every entity has an integer id, an auto-increment column. This holds
  for an entity that Grocy stores and for an entity that only Grocy Next
  stores, such as the pending scan and the nutrition facts record. A foreign
  id is named `<entity>Id`, such as `productId` and `locationId`.
- Error body: RFC 9457 Problem Details with the content type
  `application/problem+json`. The fields are `type`, `title`, `status`,
  `detail`, and `instance`, plus two extension fields. `errors` is a list of
  `{path, message}` for a validation error. `grocy` holds the status and the
  message that Grocy returned when Grocy refused the change. `instance` is
  the request path.
- Problem type: one stable relative URI per cause, such as
  `/problems/validation`, `/problems/not-found`, `/problems/no-product`,
  `/problems/no-amount`, `/problems/grocy-refused`, and
  `/problems/grocy-unavailable`. `title` is a fixed short text per type. The
  URIs do not need to resolve. The build adds a cause when an operation needs
  one.
- Error statuses:

  | Status | Cause                                                                                                                                                      |
  | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 400    | The body, the query, or a path id fails the Zod schema. An unknown field is one entry in `errors` with its path and the message "unknown field".          |
  | 404    | The id in the path names nothing.                                                                                                                          |
  | 409    | A fact of the resource itself blocks the change: an accept of a pending scan with no product, or an Inventory accept with no amount.                      |
  | 415    | The body is not JSON.                                                                                                                                      |
  | 422    | A fact outside the resource blocks the change: Grocy refused it with a `400`, the product has no conversion, or an id in the body names nothing.          |
  | 502    | Grocy answered `500`, or Grocy did not answer.                                                                                                             |

  A `422` from Grocy carries the Grocy message as `detail` and the `grocy`
  field. A `422` from a server rule has no `grocy` field.

- Success statuses: `200` with the resource for a read, an update, and an
  accept. `201` with the resource and a `Location` header for a create.
  `200` with the resource as it was before the delete for a delete.
- The body of a change is the resource as stored, and nothing else. When
  the change writes to Grocy, the resource carries the Grocy-stored values as
  its own fields. The booking resource is the Grocy stock log rows mapped to
  Next API fields. When a change creates a second thing in Grocy, such as the
  product barcode that an update of a pending scan adds, the resource carries
  the id of that thing in a field.
- List shape: an envelope `{"items": [...]}` and nothing else. No count field
  and no page fields. A full list has no cut-off. The product list of
  milestone 1 changes to the envelope in the milestone 2 build.
- Field names are camelCase, as the Zod schema keys, with no transform layer
  between the TypeScript type and the JSON. The MCP tool names stay
  snake_case, as ADR 0012 set, because they name operations, not fields.
- A date is `YYYY-MM-DD`. A timestamp is RFC 3339 in UTC with the `Z`
  suffix. An amount and a price are JSON numbers, never a number in a string.
  An enumeration is a lowercase string.
- A response has every field of the resource. An unset optional field is
  `null`, never absent.
- A `PATCH` body follows JSON merge patch (RFC 7396): an absent field stays
  as it is, and a field set to `null` clears it. In a `POST` body an absent
  optional field means unset.
- Every resource that Grocy Next stores carries `createdAt` and `updatedAt`,
  read-only, set by the server. The pending scan keeps its own `scannedAt`
  for the sort and `lastLookupAt` for the worker. A resource that Grocy
  stores carries no timestamp until milestone 10 maps the Grocy row.
- A change from the lookup worker reaches the screens by a poll. The scan
  screens and the review queue refetch the pending scan list every three
  seconds while the screen is open, with the RTK Query polling interval.

## Considered options

- A UUID for every entity, with a Grocy id column and a mapping in the
  legacy API. Rejected: the Grocycode carries the integer product id, so the
  mapping never goes away, and the system has two id types.
- A UUID v7 for the entities that only Grocy Next stores. Rejected: two id
  types in the Next API, and a client must know which entity has which.
- The NestJS default error body. Rejected: no place for the field errors or
  for the Grocy message.
- The Grocy error body `{"error_message"}`. Rejected: it copies the shape
  that the Grocy API research marks as weak.
- `about:blank` as the problem type. Rejected: an assistant cannot tell one
  `409` cause from another without text matching.
- The resource plus a `grocy` section with the raw Grocy rows. Rejected:
  two shapes in every change, and the raw rows carry the Grocy defect of
  numbers in strings.
- A bare array for a list. Rejected: the MCP `structuredContent` of a tool
  result must be a JSON object, so a bare array needs a wrapper on the MCP
  side, and the two surfaces then differ.
- `204` with no body for a delete. Rejected: the MCP tool result would be
  empty, and the client would not see what went.
- Server-sent events for the lookup worker change. Rejected for now: the
  stream is an operation with no MCP tool, so the completeness test of ADR
  0012 would need an exclusion, and some proxies buffer the stream. A later
  milestone can add it with no change to the resources.
- WebSocket. Rejected: more than the need.

## Consequences

- The `nestjs-zod` pipe gets a custom exception factory that builds the
  Problem Details body. Every error that the Next API returns is an
  `HttpException` with that body, so the MCP tool carries it as its error
  text.
- The OpenAPI document declares `application/problem+json` for every error
  response.
- A screen shows a lookup result up to three seconds after the worker stores
  it.
- The web app product list changes with the envelope.
- The word "confirmation" is not a glossary term. The documents use it in its
  plain sense.

## Sources

- RFC 9457, Problem Details for HTTP APIs.
- RFC 7396, JSON Merge Patch.
- The MCP specification, revision 2026-07-28, on the tool result
  `structuredContent`.
- The Grocy API research on branch `research/grocy-api-review-queue`.
- Ticket [#78](https://github.com/the-dev-abides/grocy-next/issues/78).
