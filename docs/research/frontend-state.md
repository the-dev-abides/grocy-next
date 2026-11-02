# Frontend state and data: Redux Toolkit against TanStack Query

Research ticket: [#4](https://github.com/the-dev-abides/grocy-next/issues/4).
Date: 2026-11-01.

## Question

Which frontend data and state approach serves Grocy Next best: Redux Toolkit
with RTK Query (the default), or TanStack Query with Zustand?

The UI needs:

- Tables with row selection, bulk edit, and inline edit, on React 19 with
  shadcn and TanStack Table.
- A scan flow that never stops for input.
- Optimistic updates.

## Summary

Both options do the table work and the optimistic updates. The two options
differ in the scan flow and in the code generation from the OpenAPI spec.

- TanStack Query has a built-in mutation queue (`scope.id`), pauses mutations
  when the network is down, retries them in order, and can persist them. RTK
  Query has none of these. A team builds them by hand with the listener
  middleware.
- The Grocy OpenAPI spec is version 3.1.0 and has no `operationId` values.
  The `openapi-typescript` generator states support for 3.0 and 3.1. The RTK
  Query generator is an "early preview" and its docs do not state 3.1 support.
- Both libraries update the cache by hand for optimistic updates. Both warn
  about overlapping mutations.
- TanStack Table v9 owns the row selection state in TanStack Store atoms. No
  global store is needed for selection or inline edit.
- The bundle cost is about equal: 18.2 kB against 16.9 kB (min+gzip).

The recommendation is TanStack Query with Zustand. The maintainer decides.

## Findings

### 1. Current versions and React 19 support

All versions come from `npm view <name> version` on 2026-11-01.

| Package                           | Version | React peer range            |
|-----------------------------------|---------|-----------------------------|
| `@reduxjs/toolkit`                | 2.13.0  | `^16.9.0 \|\| ^17 \|\| ^18 \|\| ^19` |
| `react-redux`                     | 9.3.1   | `^18.0 \|\| ^19`            |
| `redux`                           | 5.0.1   | none                        |
| `reselect`                        | 5.3.0   | none                        |
| `immer`                           | 11.2.9  | none                        |
| `@rtk-query/codegen-openapi`      | 2.2.0   | none                        |
| `@tanstack/react-query`           | 5.105.1 | `^18 \|\| ^19`              |
| `@tanstack/query-core`            | 5.105.1 | none                        |
| `@tanstack/react-query-devtools`  | 5.105.1 | none                        |
| `zustand`                         | 5.0.16  | `>=18.0.0`                  |
| `@tanstack/react-table`           | 9.3.1   | `>=18`                      |
| `react`                           | 19.3.1  | n/a                         |
| `openapi-typescript`              | 7.13.0  | none                        |
| `openapi-fetch`                   | 0.17.0  | none                        |
| `openapi-react-query`             | 0.5.4   | none                        |
| `orval`                           | 8.46.0  | none                        |

React-Redux 9.2.0 changed its peer dependency "to accept React 19" and tests
against React 18 and 19 [S13]. TanStack Query states "React Query is compatible
with React v18+" [S14]. Zustand 5 makes "React 18 the minimum required
version" [S15]. All four candidate packages accept React 19.

### 2. Tables: row selection, bulk edit, inline edit

TanStack Table v9 is the current major version. The shadcn data table guide
states "This guide uses TanStack Table v9" [S16]. In v9 "you must explicitly
declare which features your table uses" with `tableFeatures()` [S17]. Row
selection is the `rowSelectionFeature` [S18].

Table state in v9 is built on TanStack Store atoms. The guide states the table
"now works correctly under the React Compiler" [S17]. For row selection, "The
recommended way in v9 is an external atom passed through the `atoms` table
option" [S18]. The table also accepts the v8 form: `useState` plus
`onRowSelectionChange` and `state.rowSelection` [S18]. The shadcn guide uses
the `useState` form [S16].

Consequence: the table owns the selection state. Neither Redux nor Zustand is
needed for row selection. A bulk edit dialog reads the selected row ids from
the table and calls one mutation. An inline edit calls one mutation per cell.
Both libraries provide a mutation hook for this. The Redux style guide also
says "Most form state shouldn't go in Redux" [S9].

Both server caches hand the table its `data` array:

- RTK Query returns `data` from `useQuery`. `selectFromResult` limits
  re-renders to the selected part [S11].
- TanStack Query returns `data` from `useQuery`. "Query results by default are
  structurally shared to detect if data has actually changed" [S19].

Verdict: equal. The table library carries the selection and edit state in both
options.

### 3. Scan flow that never stops for input

The scan flow sends one mutation per scan. The user does not wait for the
response. The UI must show each pending scan, retry failures, and keep order.

TanStack Query:

- "Per default, all mutations run in parallel". With `scope: { id }`, "All
  mutations with the same `scope.id` will run in serial". The next mutation
  starts paused and "will be put into a queue" [S2].
- With the default `networkMode: 'online'`, "Queries and Mutations will not
  fire unless you have network connection" [S6].
- "If mutations fail because the device is offline, they will be retried in
  the same order when the device reconnects" [S20].
- "Mutations can be persisted to storage if needed and resumed at a later
  point". Only the state is persisted, "as functions cannot be serialized".
  `setMutationDefaults` supplies the function at startup, and
  `resumePausedMutations` restarts the queue [S20] [S21].
- `useMutationState` "gives you access to all mutations in the
  `MutationCache`". A filter of `{ status: 'pending' }` lists the pending
  scans for a review list [S22].

RTK Query:

- The mutation docs and the hooks reference do not document a queue or
  serial execution. Each `trigger` call returns a promise with `requestId`,
  `abort`, and `unwrap` [S10] [S23].
- The TanStack comparison table marks RTK Query "Offline Mutation Support" as
  not supported and "Offline Caching" as partial [S5].
- Redux Toolkit ships `createListenerMiddleware` with `take`, `condition`,
  `fork`, and `cancelActiveListeners`. The docs call it "a lightweight
  alternative" to sagas and state it has "no guard rails" [S24]. A team can
  build a scan queue with it. The team then owns that code.

Verdict: TanStack Query has the scan queue, the offline pause, and the
persistence built in. RTK Query needs custom code for all three. The map lists
"Phone use with poor network: PWA, offline queue, and sync" as not yet
specified. This finding applies to that item.

### 4. Optimistic updates

Both libraries update the cache by hand.

RTK Query: `onQueryStarted` dispatches `api.util.updateQueryData`. The result
has an `undo` method. On a failed `queryFulfilled`, the code calls `undo()` or
invalidates the tags. The docs warn: with overlapping mutations "you may
encounter race conditions if attempting to roll back patches using the `.undo`
property". The docs then recommend tag invalidation on error [S1].

TanStack Query: `onMutate` cancels in-flight queries with `cancelQueries`,
takes a snapshot, and writes with `setQueryData`. `onError` restores the
snapshot. `onSettled` invalidates [S3]. A second method shows the pending
`variables` in the UI with no cache write [S3].

The RTK Query comparison page lists "Optimistic updates" for both as "can
update cache by hand" [S4].

Verdict: equal. Both need the same care with overlapping scans. Both
recommend invalidation after the mutation settles.

### 5. Server cache model and defaults

| Property                 | RTK Query                               | TanStack Query                              |
|--------------------------|-----------------------------------------|---------------------------------------------|
| Cache key                | endpoint + serialized args [S4]         | user-defined query key [S4]                 |
| Normalized cache         | no [S4] [S12]                           | no [S4]                                     |
| Unused data kept         | 60 s (`keepUnusedDataFor`) [S12]        | 5 min (`gcTime`) [S19]                      |
| Stale by default         | no refetch on mount by default [S12]    | yes, refetch on mount, focus, reconnect [S19] |
| Refetch after mutation   | tags: `providesTags` and `invalidatesTags` [S10] | `invalidateQueries` in callbacks [S3] |
| Query cancellation       | not supported [S5]                      | supported [S5]                              |
| React Suspense           | not supported [S5]                      | supported [S5]                              |
| Streaming cache updates  | `onCacheEntryAdded` [S25]               | `setQueryData` from a socket handler [S21]  |
| Works outside React      | yes, Redux core [S4]                    | `query-core` is framework-agnostic; hooks are React [S4] |

RTK Query defines all endpoints in one API slice. The docs call this "one
central place" [S4]. TanStack Query defines a query where it is used, or in a
shared `queryOptions` object [S4].

### 6. Client state: Redux slices against Zustand

The client state that remains after the server cache is small: the scan mode,
the active location, the sound setting, the open dialog. The TanStack docs
state "TanStack Query is not a replacement for local/client state management"
and that it works "alongside most client state managers with zero issues"
[S8]. The Redux style guide states that only state "you consider to be global
and app-wide" belongs in the store [S9].

Zustand: "Conceptually, Zustand and Redux are quite similar, both are based on
an immutable state model". "Redux requires your app to be wrapped in context
providers; Zustand does not" [S26]. Zustand has no action types and no
reducer. The `devtools` middleware "lets you use Redux DevTools Extension
without Redux" [S27]. Zustand 5 drops default exports and requires React 18
[S15].

Redux Toolkit: `createSlice` and Immer. RTK Query actions appear in the Redux
DevTools timeline together with slice actions [S4]. Slices can react to RTK
Query results with `matchFulfilled` [S28].

Verdict: Redux gives one timeline for server and client actions. Zustand gives
less code for a small client state. Both have DevTools.

### 7. Code generation from the OpenAPI spec

The legacy API is Grocy's OpenAPI spec at v4.7.1. The spec file
`docs/reference/grocy-openapi.json` declares `"openapi": "3.1.0"`. It has 87
operations and no `operationId` value (checked with `grep`).

RTK Query: `@rtk-query/codegen-openapi` is one of the "early previews of code
generation capabilities" [S7]. The comparison page calls it "currently
experimental" [S4]. It generates one API slice with typed hooks. With the
default `camelCase` transformer, a missing `operationId` gets "a reasonable
name" from the HTTP verb and the path (oazapfts) [S29] [S30]. With the `none`
transformer, every operation must have an `operationId` [S7]. Tags from the
spec are "string tags with no ids", so a mutation can invalidate too much
[S7]. The generator depends on `@apidevtools/swagger-parser` `^10.1.1`. The
swagger-parser README states "Swagger 2.0 schema or OpenAPI 3.0 Schema" [S31].
I could not verify OpenAPI 3.1 support in that version line.

TanStack Query: `openapi-typescript` "turns OpenAPI 3.0 & 3.1 schemas into
TypeScript" [S32]. `openapi-react-query` is a "type-safe tiny wrapper (1 kb)
around @tanstack/react-query" that uses `openapi-fetch` [S33]. Its
`useMutation` takes "The original `useMutation` options" [S34]. Orval also
generates React Query hooks from "any valid OpenAPI v3 or Swagger v2
specification" [S35]. I could not verify Orval's 3.1 support from its docs.

Verdict: the TanStack path has a generator that states 3.1 support. The RTK
path has an official but experimental generator with no 3.1 statement.

### 8. Bundle size

Sizes are min+gzip from Bundlephobia [S36] and bundlejs [S37].

| Option                             | Packages                                   | min+gzip |
|------------------------------------|--------------------------------------------|----------|
| Redux Toolkit with RTK Query       | `@reduxjs/toolkit` 2.13.0 (14.3 kB, includes redux, immer, reselect) + `react-redux` 9.3.1 (3.9 kB) | 18.2 kB |
| TanStack Query with Zustand        | `@tanstack/react-query` 5.105.1 (13.2 kB, includes query-core) + `zustand` 5.0.16 (3.7 kB) | 16.9 kB |

The RTK docs estimate "17 kB for RTK+dependencies+RTK Query" without React and
"19kB + React-Redux" with React [S4]. Bundlephobia reports 489 B for Zustand
because it measures the entry file alone. The bundlejs number includes the
React hook [S37].

Verdict: about equal.

### 9. Devtools

RTK Query dispatches Redux actions, so "all actions are visible in the Redux
DevTools" [S4]. TanStack Query has `@tanstack/react-query-devtools`. Zustand's
`devtools` middleware uses the Redux DevTools Extension [S27]. Both options
have full devtools.

## Comparison table

| Need                               | Redux Toolkit with RTK Query               | TanStack Query with Zustand                        |
|------------------------------------|--------------------------------------------|----------------------------------------------------|
| React 19                           | yes                                        | yes                                                |
| Table row selection and inline edit | table owns it; equal                      | table owns it; equal                               |
| Optimistic update                  | `onQueryStarted` + `undo` [S1]             | `onMutate` + snapshot + rollback [S3]              |
| Serial mutation queue              | none built in; listener middleware [S24]   | `scope.id` [S2]                                    |
| Offline mutation pause and retry   | not supported [S5]                         | `networkMode`, in-order retry [S6] [S20]           |
| Persist pending mutations          | none built in                              | `persistQueryClient` + `resumePausedMutations` [S21] |
| List pending mutations in UI       | mutation results per hook [S23]            | `useMutationState` [S22]                           |
| OpenAPI 3.1 codegen                | experimental; 3.1 not stated [S7] [S31]    | `openapi-typescript` states 3.0 and 3.1 [S32]      |
| Client state                       | slices in the same store                   | Zustand store, no provider [S26]                   |
| One DevTools timeline              | yes [S4]                                   | two tools; Zustand uses Redux DevTools [S27]       |
| Works outside React                | yes [S4]                                   | core yes, hooks no [S4]                            |
| Bundle (min+gzip)                  | 18.2 kB                                    | 16.9 kB                                            |
| Maintainer default                 | yes                                        | no                                                 |

## Recommendation

Use TanStack Query for server data and Zustand for the small client state.

Reason: the scan flow is the main workflow in M1. TanStack Query ships the
serial mutation queue, the offline pause, the in-order retry, the persisted
queue, and the pending-mutation list [S2] [S6] [S20] [S21] [S22]. RTK Query
ships none of them. The team would write and maintain that code with the
listener middleware. The OpenAPI 3.1 code generation also has a stated path on
the TanStack side [S32].

Cost of this option: it departs from the maintainer's default. The project
uses two small libraries instead of one store. The server timeline and the
client timeline sit in two DevTools panels.

Cost of the default option: custom queue and offline code, and an
experimental code generator with no stated OpenAPI 3.1 support.

This is a proposal. The maintainer decides.

## Sources

- [S1] RTK Query, Manual Cache Updates: https://redux.js.org/toolkit/rtk-query/usage/manual-cache-updates
- [S2] TanStack Query, Mutations (scope): https://tanstack.com/query/latest/docs/framework/react/guides/mutations
- [S3] TanStack Query, Optimistic Updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- [S4] RTK Query, Comparison with Other Tools: https://redux.js.org/toolkit/rtk-query/comparison
- [S5] TanStack Query, Comparison: https://tanstack.com/query/latest/docs/framework/react/comparison
- [S6] TanStack Query, Network Mode: https://tanstack.com/query/latest/docs/framework/react/guides/network-mode
- [S7] RTK Query, Code Generation: https://redux.js.org/toolkit/rtk-query/usage/code-generation
- [S8] TanStack Query, Does this replace client state: https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state
- [S9] Redux Style Guide: https://redux.js.org/style-guide/
- [S10] RTK Query, Mutations: https://redux.js.org/toolkit/rtk-query/usage/mutations
- [S11] RTK Query, Queries: https://redux.js.org/toolkit/rtk-query/usage/queries
- [S12] RTK Query, Cache Behavior: https://redux.js.org/toolkit/rtk-query/usage/cache-behavior
- [S13] React-Redux v9.2.0 release: https://github.com/reduxjs/react-redux/releases/tag/v9.2.0
- [S14] TanStack Query, Installation: https://tanstack.com/query/latest/docs/framework/react/installation
- [S15] Zustand v5.0.0 release: https://github.com/pmndrs/zustand/releases/tag/v5.0.0
- [S16] shadcn, Data Table: https://ui.shadcn.com/docs/components/data-table
- [S17] TanStack Table, Migrating to V9 (React): https://tanstack.com/table/latest/docs/framework/react/guide/migrating
- [S18] TanStack Table, Row Selection (React): https://tanstack.com/table/latest/docs/framework/react/guide/row-selection
- [S19] TanStack Query, Important Defaults: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- [S20] TanStack Query, Mutations (persist, retry): https://tanstack.com/query/latest/docs/framework/react/guides/mutations
- [S21] TanStack Query, QueryClient reference: https://tanstack.com/query/latest/docs/reference/QueryClient and persistQueryClient: https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient
- [S22] TanStack Query, useMutationState: https://tanstack.com/query/latest/docs/framework/react/reference/useMutationState
- [S23] RTK Query, Hooks reference (useMutation): https://redux.js.org/toolkit/rtk-query/api/created-api/hooks
- [S24] Redux Toolkit, createListenerMiddleware: https://redux.js.org/toolkit/api/createListenerMiddleware
- [S25] RTK Query, Streaming Updates: https://redux.js.org/toolkit/rtk-query/usage/streaming-updates
- [S26] Zustand, Comparison: https://zustand.docs.pmnd.rs/learn/getting-started/comparison.html
- [S27] Zustand, devtools middleware: https://github.com/pmndrs/zustand/blob/main/docs/reference/middlewares/devtools.md
- [S28] Redux Essentials, Part 8: https://redux.js.org/tutorials/essentials/part-8-rtk-query-advanced
- [S29] RTK Query codegen source, `generate.ts`: https://github.com/reduxjs/redux-toolkit/blob/master/packages/rtk-query-codegen-openapi/src/generate.ts
- [S30] oazapfts README: https://github.com/oazapfts/oazapfts/blob/main/README.md
- [S31] swagger-parser README: https://github.com/APIDevTools/swagger-parser/blob/main/README.md
- [S32] openapi-typescript, Introduction: https://openapi-ts.dev/introduction
- [S33] openapi-react-query: https://openapi-ts.dev/openapi-react-query/
- [S34] openapi-react-query, useMutation: https://openapi-ts.dev/openapi-react-query/use-mutation
- [S35] Orval README: https://github.com/orval-labs/orval/blob/master/README.md
- [S36] Bundlephobia API: https://bundlephobia.com/api/size?package=@reduxjs/toolkit@2.13.0 , https://bundlephobia.com/api/size?package=react-redux@9.3.1 , https://bundlephobia.com/api/size?package=@tanstack/react-query@5.105.1
- [S37] bundlejs: https://deno.bundlejs.com/?q=zustand@5.0.16&treeshake=[*]
- Versions: `npm view <name> version`, run on 2026-11-01.
- Grocy spec: `docs/reference/grocy-openapi.json` in this repo.
