# Modern conventions for a NestJS and React monorepo

Research for issue #27. This document reports what the official docs and
the reference projects do. It does not choose. The grilling ticket "Decide
the stack" chooses.

Sources: the NestJS docs, the NestJS sample projects, the NX docs, the NX
generator schemas, the React docs, and the Redux docs. Each section lists
its sources. Date of reading: 2026-11-02.

## 1. Summary

- NestJS organizes an app into feature modules. A module hides its
  providers. The `exports` list is the public interface of the module.
- The NestJS docs do not use the DDD terms "bounded context", "aggregate",
  or "application service". The closest material is the CQRS recipe
  (`AggregateRoot`, commands, queries, events, sagas) and the outbox chapter
  (domain events in the same transaction as the state change).
- NX puts deployable apps in `apps/` and most code in `libs/` (or
  `packages/`). NX groups libraries by business domain, not by technical
  type. Four library types exist: `feature`, `ui`, `data-access`, `util`.
- NX enforces boundaries with tags and the `@nx/enforce-module-boundaries`
  lint rule. Projects without tags cannot import any other project.
- New NX workspaces link projects with package manager workspaces and
  TypeScript project references. The old `tsconfig` path alias method still
  works but is not recommended for new workspaces.
- NestJS tests: unit tests next to the class (`.spec.ts`), end-to-end tests
  in a separate folder (`.e2e-spec.ts`) with Supertest. New Nest projects
  use Vitest by default (ESM) or Jest (CommonJS).
- React and Redux tests: render the component with a real store, drive it
  like a user, mock the network with MSW. Do not test reducers or selectors
  alone unless they are complex. Tools: Vitest or Jest, React Testing
  Library, MSW.
- NX React app defaults: Vite bundler, Playwright end-to-end tests, strict
  TypeScript. The unit test runner has no default. NX asks for it. The NX
  Nest app generator has no bundler option and no default unit test runner.
  Its end-to-end runner default is Jest.

## 2. DDD in NestJS

### 2.1 What the NestJS docs say about modules

- "Modules are the recommended way to organize your components." A module
  is the unit from which Nest builds the application graph.
- Feature modules: "A feature module organizes the code for a specific
  feature, which keeps boundaries clear." A feature module groups a
  controller and a service that belong together.
- Encapsulation: "A module encapsulates its providers by default." A module
  can inject only its own providers or the providers that an imported module
  exports. The `exports` list is the public interface of the module.
- Shared modules: "Every module is automatically a shared module." Modules
  are singletons. Two modules that import the same module get the same
  provider instance.
- Global modules: the docs say to register a global module once, in the
  root or core module. The docs say that to make everything global "is not
  a recommended design practice", because explicit imports keep the
  dependencies visible.
- Dynamic modules: a `forRoot()` method returns a module that is configured
  at run time. Only the module that calls `forRoot()` can inject the result.
- Re-export: a module can export the modules that it imports.

Source: https://docs.nestjs.com/modules

### 2.2 What the NestJS docs say about aggregates and events

The NestJS docs do not use the terms "domain-driven design", "bounded
context", or "application service". The CQRS recipe is the only chapter
that names an aggregate root.

The CQRS recipe (`@nestjs/cqrs`):

- Commands: "Commands change the application state. They should be
  task-based rather than data-centric." A `CommandBus` sends a command to
  one `@CommandHandler()`.
- Queries: "Queries retrieve data from the application state. They should
  be data-centric rather than task-based." A `QueryBus` sends a query to
  one `@QueryHandler()`.
- Events: "Events notify other parts of the application about changes in
  the application state." One event can have many `@EventsHandler()`
  handlers. Event handlers run outside the HTTP request context. Exception
  filters do not catch their errors.
- Aggregate root: `AggregateRoot` is a base class for a domain model. The
  model calls `apply(event)` to queue an event. The model publishes the
  queued events when the caller runs `commit()`. The model does not know
  the event bus. `EventPublisher.mergeObjectContext()` connects the two.
  Three forms exist: extend `AggregateRoot`, use the `WithAggregateRoot()`
  mixin, or implement `IAggregateRoot`.
- Sagas: "A saga is a long-running process that listens to events and may
  trigger new commands." Sagas run in memory. For processes that must
  survive a restart, the docs point to `@nestjs/workflows/cqrs`.
- File names in the recipe: `kill-dragon.command.ts`,
  `kill-dragon.handler.ts`, `get-hero.handler.ts`,
  `hero-killed-dragon.event.ts`, `hero.model.ts`, `heroes-game.saga.ts`.
  The recipe shows no folder tree.

Source: https://docs.nestjs.com/recipes/cqrs

The outbox chapter (`@nestjs/outbox`):

- `Outbox.add()` writes the message into an outbox table "in the same
  database transaction as the order". The message "commits or rolls back
  with the order". After the commit, `notify()` wakes the relay.
- Handlers use `@OnOutboxMessage('order.placed', { consumer: '...' })`.
  Each handler has a stable consumer name and an inbox of processed ids.
- The chapter does not use the terms "aggregate", "bounded context", or
  "modular monolith". The analytics consumer is a separate application that
  owns its own database and never reads the order tables.

Source: https://docs.nestjs.com/reliability/outbox

### 2.3 What the NestJS docs say about entities and repositories

- "TypeORM supports the repository design pattern, so each entity has its
  own repository."
- Entity files live "near their domain, in the corresponding module
  directory", for example `users/user.entity.ts`.
- `TypeOrmModule.forRoot()` opens the connection in the root module.
  `TypeOrmModule.forFeature([User])` registers the repositories for one
  module. With `autoLoadEntities: true`, the entities from `forFeature()`
  are added to the connection automatically.
- A module that wants to share a repository re-exports `TypeOrmModule`.
- For transactions, the docs recommend `QueryRunner` for full control, or
  `dataSource.transaction()` with a callback. The docs suggest a small
  factory class around the transaction helpers, so a test can mock it.
- Tests provide a mock under `getRepositoryToken(User)`. Then the test runs
  without a database.

Source: https://docs.nestjs.com/data/typeorm

### 2.4 What the NestJS reference projects do

The NestJS docs point to `github.com/nestjs/nest/tree/master/sample`. The
samples show these layouts.

`sample/01-cats-app` (the canonical sample):

```
src/
  app.module.ts
  main.ts
  cats/
    cats.module.ts
    cats.controller.ts
    cats.controller.spec.ts
    cats.service.ts
    cats.service.spec.ts
    dto/create-cat.dto.ts
    interfaces/cat.interface.ts
  common/
    decorators/  filters/  guards/  interceptors/  middleware/  pipes/
  core/
    core.module.ts
    interceptors/
e2e/
  cats/cats.e2e-spec.ts
vitest.config.mts
vitest.config.e2e.mts
```

- One folder per feature module. Each folder holds the module, controller,
  service, DTOs, interfaces, and the spec files.
- `common/` holds cross-cutting building blocks. `core/` holds the one
  core module with the global interceptors.
- `e2e/` holds the end-to-end tests. The e2e Vitest config includes
  `e2e/**/*.e2e-spec.ts` only.

`sample/05-sql-typeorm`: one `users/` module with `user.entity.ts`,
`dto/`, controller, service, and the spec files. Same shape as the cats
sample.

`sample/37-outbox` (the newest sample, a modular monolith):

```
src/
  app.module.ts
  database/        drizzle.ts, schema.ts
  orders/          order.ts, orders.controller.ts, orders.module.ts,
                   orders.service.ts
  inventory/       inventory.module.ts, stock-reservation.handler.ts
  notifications/   notifications.module.ts, mailer.service.ts,
                   order-emails.handler.ts
  outbox-admin/
analytics-service/ a second app with its own database and schema
e2e/
```

- `orders/order.ts` holds plain interfaces (`Order`, `OrderItem`) and the
  `PlaceOrderDto` class. It has no methods. It does not extend
  `AggregateRoot`.
- `OrdersService` holds the rules: it validates the items, reads the prices
  from the database, computes the total, inserts the order, and adds the
  outbox messages in the same transaction. The cancel path locks the row
  with `FOR UPDATE` and checks the status.
- The `inventory/` and `notifications/` modules react to `order.placed`
  with `@OnOutboxMessage()` handlers. They do not call `OrdersService`.
- The analytics service receives the events over TCP. It owns its own
  database.

So the official samples put the business rules in the service of the
feature module. They do not use rich domain classes. The CQRS recipe is the
only official place that shows a domain model class with methods and events.

Source: https://github.com/nestjs/nest/tree/master/sample

### 2.5 The NestJS resource generator

`nest g resource users` creates one folder per resource:

```
src/users/
  users.module.ts
  users.controller.ts        (or users.resolver.ts for GraphQL)
  users.controller.spec.ts
  users.service.ts
  users.service.spec.ts
  dto/create-user.dto.ts
  dto/update-user.dto.ts
  entities/user.entity.ts
```

The generated service "is not tied to any specific ORM". Transport options:
REST controller, microservice controller, GraphQL resolver, WebSocket
gateway.

Source: https://docs.nestjs.com/recipes/crud-generator

## 3. Module boundaries between the server and the web app

### 3.1 What NestJS does

- NestJS has its own monorepo mode. `nest generate app` moves the apps
  under `apps/`. `nest generate library` creates `libs/`. "Libraries live
  in the `libs` folder of the monorepo root."
- "A Nest library is a Nest project that, unlike an application, cannot run
  on its own." It has no `main.ts`.
- The default import prefix is `@app`, from the `paths` key in the root
  `tsconfig.json`. The docs warn that only the TypeScript compiler
  understands `paths`. Jest needs its own `moduleNameMapper`.
- "Using library modules is the same as using any other Nest module." The
  app imports the library module into `AppModule`.
- The NestJS monorepo docs do not mention NX. They name only Git submodules
  as the alternative. The NestJS monorepo mode is for Nest apps and Nest
  libraries. It does not cover a React app.

Sources: https://docs.nestjs.com/cli/monorepo,
https://docs.nestjs.com/cli/libraries

### 3.2 What NX does

- Why one repo: a monorepo lets you "reuse validation logic, UI components,
  and types across your entire organization", "including between the
  backend and the frontend". You can "change a server API and every
  application that consumes it in the same commit".
- Boundaries are tags plus a lint rule. Each project gets `tags` in
  `project.json` or in the `nx` key of `package.json`. The ESLint rule
  `@nx/enforce-module-boundaries` reads `depConstraints`. Each constraint
  has a `sourceTag` and `onlyDependOnLibsWithTags`.
- "Projects without any tags cannot depend on any other projects" unless a
  constraint allows `*`.
- The docs example uses scope tags: `scope:shared` depends only on
  `scope:shared`; `scope:admin` depends on `scope:shared` and `scope:admin`;
  `scope:client` depends on `scope:shared` and `scope:client`. So the two
  apps cannot import each other.
- Tag values can be exact strings, globs (`scope:*`), or regular
  expressions (`/^scope.*/`).
- The same rule can combine `type:` tags and `scope:` tags. The project
  dependency rules page shows `type:feature`, `type:ui`, `type:util`.
- An alternative for any project type is the Conformance rule. It needs the
  NX Enterprise plan.

Sources: https://nx.dev/docs/kb/what-is-a-monorepo,
https://nx.dev/docs/features/enforce-module-boundaries,
https://nx.dev/docs/kb/project-dependency-rules

### 3.3 Server-to-web link in the NX Nest generator

- `nx g @nx/nest:app apps/api --frontendProject web` sets up a proxy
  configuration, so the React dev server forwards API calls to the Nest
  app.

Source: https://nx.dev/docs/technologies/node/nest/introduction

### 3.4 What Redux does at the boundary

- The Redux docs say to use RTK Query for data fetching: "We recommend
  against writing data fetching logic by hand in almost all cases."
- "Your application is expected to have only one `createApi` call in it."
  Rule of thumb: "one API slice per base URL". The tutorial puts it in
  `features/api/apiSlice.ts`.
- The store adds `[apiSlice.reducerPath]: apiSlice.reducer` and
  `apiSlice.middleware`. The middleware "must be added as well - it manages
  cache lifetimes and expiration".
- RTK Query generates one hook per endpoint (`useGetPostsQuery`). The docs
  say to use the hooks and not to write your own `useSelector` or
  `useEffect` for fetched data.
- Tags (`tagTypes`, `providesTags`, `invalidatesTags`) refresh the cache
  after a mutation.

Sources: https://redux.js.org/style-guide/,
https://redux.js.org/tutorials/essentials/part-7-rtk-query-basics

## 4. NX workspace layout for one NestJS app and one React app

### 4.1 Folder structure

NX names two layouts:

- Flat: every project sits under one folder, usually `packages/`. For
  published packages or small workspaces.
- Grouped: apps under `apps/`, reusable code under `libs/`, with grouping
  folders inside. For product workspaces with many internal libraries.

The NX example of the grouped layout:

```
apps/
  booking/
  check-in/
libs/
  booking/            <- grouping folder (one business domain)
    feature-shell/    <- project
  check-in/
    feature-shell/
  shared/             <- grouping folder
    data-access/
    seatmap/
      data-access/
      feature-seatmap/
```

Rules on the page:

- Keep applications thin. An app holds the entry point, the configuration,
  and the feature composition. "A common target is the majority of your
  code in `libs/`."
- "Group libraries by the application or business domain they serve, not by
  their technical type."
- Shared code lives in `libs/shared`. "Promote a library into `shared` when
  a second domain needs it, rather than starting everything as shared."
- Each grouping folder can have a `CODEOWNERS` entry.
- "Moving or renaming a project folder is a regular `mv`."

The current NX tutorial uses `apps/` and `packages/`. It says `libs/` is an
accepted alternative. NX finds projects by their `package.json` or
`project.json`, "not by folder names".

Sources: https://nx.dev/docs/kb/folder-structure,
https://nx.dev/docs/getting-started/tutorials/crafting-your-workspace

### 4.2 Library types

NX names four library types. It says to keep the number of types low and to
document each type.

| Type | Content | Name | May depend on |
|---|---|---|---|
| feature | Container components for a business use case or page. Has access to data sources. | `feature` or `feature-*` | any type |
| ui | Presentational components only. No injected services. | `ui` or `ui-*` | ui, util |
| data-access | Client-side delegate to the server API. State management files live here. | `data-access` or `data-access-*` | data-access, util |
| util | Low-level code used by many libraries. Often framework-free. | `util` or `util-*` | util |

Source: https://nx.dev/docs/kb/project-dependency-rules

### 4.3 Project size

- "Each organization will decide on their own conventions."
- Reasons to split: faster `nx affected` and cache hits, a useful
  `nx graph`, enforced constraints with tags, clear `CODEOWNERS`.
- Reasons not to split: related code stays together; each project adds
  overhead; fast-changing code needs freedom first. Develop in one project,
  then split when the architecture settles.
- "Don't split what always changes together."

Source: https://nx.dev/docs/kb/project-size

### 4.4 Project linking

- New workspaces use package manager workspaces. `create-nx-workspace`
  sets them up by default. Pass `--no-workspaces` to opt out.
- Each project has a `package.json`. The `name` field is the import name
  (`@my-workspace/shared-ui`). An app lists a library as
  `"@my-workspace/shared-ui": "workspace:*"` (or `*` with npm). The package
  manager symlinks it. NX detects the dependency from the imports.
- TypeScript uses three levels: a root `tsconfig.base.json` with the shared
  options, a root `tsconfig.json` that lists every project as a reference,
  and one `tsconfig.json` per project that references its dependencies.
  "Using TypeScript project references improves both the speed and memory
  usage of build and typecheck tasks."
- The old `tsconfig` `paths` method still works. The tutorial says it is
  not recommended for new workspaces.
- Non-buildable libraries export source: `".": "./src/index.ts"`. The
  tutorial recommends to start with non-buildable libraries. A buildable
  library "can only depend on other buildable libraries".
- Dependency versions: NX supports both a single version policy and
  independent versions per project. The docs do not pick one. The tutorial
  recommends to define shared versions once at the root (pnpm catalogs, or
  `syncpack` and `@nx/dependency-checks` for npm).

Sources: https://nx.dev/docs/kb/typescript-project-linking,
https://nx.dev/docs/getting-started/tutorials/managing-dependencies,
https://nx.dev/docs/kb/buildable-and-publishable-libraries,
https://nx.dev/docs/kb/dependency-management

### 4.5 The NX Nest plugin

- Setup: `npx create-nx-workspace@latest my-workspace --template
  nrwl/nestjs-template`, or `nx add @nx/nest` in an existing workspace.
- Supports `@nestjs/core` ^10 or ^11. Fresh installs get NestJS 11.
- App: `nx g @nx/nest:app apps/my-nest-app`. Library:
  `nx g @nx/nest:lib libs/my-nest-lib`. Add `--buildable` or
  `--publishable --importPath=<scope/name>` when needed.
- The plugin wraps every Nest CLI generator: class, controller, decorator,
  filter, gateway, guard, interceptor, interface, middleware, module, pipe,
  provider, resolver, resource, service. Use `--project` with each one.
- App generator options (from `schema.json`): `unitTestRunner` has enum
  `jest | vitest | none` and default `none`, and the generator asks for it.
  `e2eTestRunner` has enum `jest | none` and default `jest`. `strict`
  defaults to `false`. There is no `bundler` option. The plugin builds with
  `NxAppWebpackPlugin`.
- Nest CLI plugins (for example Swagger) go in the `transformers` option
  of `NxWebpackPlugin`.
- Deployment: Docker through `@nx/node:setup-docker`, or
  `generatePackageJson: true` and install on the server.

Sources: https://nx.dev/docs/technologies/node/nest/introduction,
https://github.com/nrwl/nx/blob/master/packages/nest/src/generators/application/schema.json,
https://github.com/nrwl/nx/blob/master/packages/nest/generators.json

### 4.6 The NX React plugin

- Setup: `npx create-nx-workspace@latest --template=nrwl/react-template`,
  or `nx add @nx/react`. Supports React ^18 or ^19.
- App: `nx g @nx/react:app apps/my-app`. Library:
  `nx g @nx/react:lib libs/my-lib`.
- App generator defaults (from `schema.json`): `bundler` = `vite` (enum
  `vite | rsbuild | rspack | webpack`); `unitTestRunner` = `none` (enum
  `vitest | jest | none`); `e2eTestRunner` = `playwright` (enum
  `playwright | cypress | none`); `strict` = `true`; `style` = `css`;
  `useReactRouter` = `false`; `port` = `4200`.
- Library generator defaults: `bundler` = `none` (non-buildable);
  `unitTestRunner` = `none`; `component` = `true`; `strict` = `true`.
- Generators: application, library, component, hook, redux,
  storybook-configuration, component-story, stories, consumer and provider
  (Module Federation), cypress-component-configuration, component-test.
- The `redux` generator creates one slice file at a path:
  `nx g @nx/react:redux mylib/src/lib/foo` makes `foo.slice.ts` with
  `fooSlice`. Option `--appProject` adds the slice to an app store.

Sources: https://nx.dev/docs/technologies/react/introduction,
https://github.com/nrwl/nx/blob/master/packages/react/src/generators/application/schema.json,
https://github.com/nrwl/nx/blob/master/packages/react/src/generators/library/schema.json,
https://github.com/nrwl/nx/blob/master/packages/react/generators.json

### 4.7 The NX reference workspace

`github.com/nrwl/nx-examples` is the NX example workspace. Its layout:

```
apps/
  cart/            React app (rsbuild, jest)
  cart-e2e/        Cypress end-to-end project for cart
  products/        Angular app
  products-e2e/
  products-api/    a .NET API
libs/
  cart/
    cart-page/     feature library for the cart domain
  products/
    home-page/
    product-detail-page/
  shared/
    assets/  cart/  e2e-utils/  header/  product/  styles/
```

The app folders hold `main.tsx`, `app/app.tsx`, and `app/app.spec.tsx`.
The feature libraries hold `src/index.ts` and `src/lib/<name>/<name>.tsx`
with a `.spec.tsx` next to it. Each end-to-end project is a separate
`<app>-e2e` project.

Source: https://github.com/nrwl/nx-examples

## 5. Testing conventions

### 5.1 NestJS

- Runner: "Newly generated projects use Vitest by default." The CLI module
  system choice sets the runner: ESM gives Vitest, CommonJS gives Jest.
  Nest "remains agnostic to testing tools".
- Unit tests: `Test.createTestingModule({...}).compile()` builds a module
  for the test. `compile()` is asynchronous. `get()` returns a static
  provider. `resolve()` returns a request-scoped or transient provider.
  `overrideProvider()` replaces a provider with a test double. `useMocker()`
  creates a mock for every missing dependency.
- Unit test files: "Test files should have a `.spec` or `.test` suffix."
  "Keep your test files near the classes they test."
- End-to-end tests: `moduleRef.createNestApplication()` then `app.init()`.
  Supertest sends the HTTP requests. "Test files should have an `.e2e-spec`
  suffix." "Keep your e2e test files inside the `test` directory."
- The samples use an `e2e/` folder, not `test/`, with a separate
  `vitest.config.e2e.mts` that includes `e2e/**/*.e2e-spec.ts`. One sample
  (`05-sql-typeorm`) has both `e2e/` and `test/`.
- Database tests: mock the repository under `getRepositoryToken(Entity)`.
  The outbox sample runs its e2e tests on PGlite, an in-process PostgreSQL,
  and on a real PostgreSQL server when `SQL_TEST_PG_URL` is set.

Sources: https://docs.nestjs.com/fundamentals/testing,
https://docs.nestjs.com/first-steps, https://docs.nestjs.com/data/typeorm,
https://github.com/nestjs/nest/tree/master/sample

### 5.2 React

- The current React docs have no testing guide. The `act` reference says:
  "To avoid some of the boilerplate, you could use a library like React
  Testing Library, whose helpers are wrapped with `act()`." React Testing
  Library sets `IS_REACT_ACT_ENVIRONMENT` for you. The docs recommend the
  `await act(async () => ...)` form and plan to remove the sync form.
- The legacy React docs (Testing Overview) name Jest and React Testing
  Library as the recommended tools. They list two trade-offs: iteration
  speed against a realistic environment, and how much to mock. They end
  with "Different answers may work for different teams and products."
- The React docs do not name a test runner.
- For app creation, the React docs recommend a framework (Next.js, React
  Router v7, Expo). For a build from scratch, they name Vite, Parcel, or
  Rsbuild. They say nothing about testing there.

Sources: https://react.dev/reference/react/act,
https://legacy.reactjs.org/docs/testing.html,
https://react.dev/learn/creating-a-react-app

### 5.3 Redux

- Principle: "The more your tests resemble the way your software is used,
  the more confidence they can give you." Redux is an implementation
  detail. "Prefer writing integration tests with everything working
  together."
- Render the component in a `<Provider>` with a real store. Mock the API
  calls, not Redux. "Do not try to mock selector functions or the
  React-Redux hooks!"
- Unit tests are optional. Use them "for pure functions such as
  particularly complex reducers or selectors". "In the majority of cases,
  the reducer is an implementation detail that does not need explicit
  tests." Do not test action creators alone. Treat thunks as implementation
  details.
- Tools: "An increasingly common choice is Vitest (used by the Redux
  library repos), though Jest is still used widely." "The Redux team
  recommends using either Vitest Browser Mode or React Testing Library
  (RTL)." "We also recommend using Mock Service Worker (MSW) to mock
  network requests."
- Pattern: a `setupStore(preloadedState?)` factory in `app/store.ts`, and a
  `renderWithProviders()` helper that creates a new store for every test.
  "The test code should create a separate Redux store instance for every
  test."
- The writing-tests page does not cover RTK Query tests.

Source: https://redux.js.org/usage/writing-tests

### 5.4 Redux code structure

The Redux style guide ranks its rules. The rules that shape the web app
folder layout:

- Essential: do not mutate state; reducers have no side effects; no
  non-serializable values in state or actions; one store per app.
- Strongly recommended: use Redux Toolkit; "Structure Files as Feature
  Folders with Single-File Logic"; put as much logic as possible in
  reducers; model actions as events, not setters; organize state by data
  type, not by component; normalize relational state; keep state minimal
  and derive the rest; use the hooks API; connect more components; use
  static typing; evaluate where each piece of state should live.
- Recommended: action types as `domain/eventName`; use RTK Query for data
  fetching; thunks and listeners for other async logic; selectors named
  `selectThing`; avoid form state in Redux.

The feature folder layout from the style guide and the FAQ:

```
/src
  index.tsx
  /app          store.ts, rootReducer.ts, App.tsx (hooks.ts in the tutorial)
  /common       hooks, generic components, utils
  /features
    /todos
      todosSlice.ts
      Todos.tsx
```

"It's entirely possible (and encouraged) for a reducer defined in one
folder to respond to an action defined in another folder." Global state goes
in the store. Local state stays in the component.

Sources: https://redux.js.org/style-guide/,
https://redux.js.org/faq/code-structure,
https://redux.js.org/tutorials/essentials/part-2-app-structure

### 5.5 React component structure

The React docs give five steps: break the UI into a component hierarchy;
build a static version; find the minimal state; find where the state lives
(the closest common parent); add inverse data flow with callbacks. "A
component should ideally only be concerned with one thing. If it ends up
growing, it should be decomposed into smaller subcomponents."

Source: https://react.dev/learn/thinking-in-react

### 5.6 Tests in NX

- `@nx/jest` creates a `test` target for every project with a
  `jest.config.*` file. `@nx/vitest` creates a `test` target for every
  project with a `vitest.config.*` file or a `vite.config.*` file with a
  `test` block. Both cache the task. Neither page prescribes a test file
  name. The examples use `.spec.ts`.
- `@nx/vitest` for React: `--uiFramework=react` "sets up Vitest with React
  JSX support and `jsdom` test environment". Node projects pass
  `--testEnvironment=node`.
- `@nx/playwright` creates an `e2e` target for every project with a
  `playwright.config.*` file. End-to-end tests live in their own project,
  for example `apps/myapp-e2e/`. The `webServer` block starts the app with
  `npx nx run myapp:serve` and `reuseExistingServer: true`. NX runs the
  serve task as a dependency. The `e2e-ci` target splits the suite into one
  task per file (the Atomizer).
- Feature-based testing: "break them down by feature and co-locate them
  with the feature libraries they test." Keep the top-level e2e project for
  smoke tests and cross-feature journeys. Run `nx affected -t test` and
  `nx affected -t e2e` so only the changed features run.
- The React app generator asks for the unit test runner (`vitest` or
  `jest`). The Nest app generator asks too, and its e2e default is Jest.

Sources: https://nx.dev/docs/technologies/test-tools/jest/introduction,
https://nx.dev/docs/technologies/test-tools/vitest/introduction,
https://nx.dev/docs/technologies/test-tools/playwright/introduction,
https://nx.dev/docs/kb/feature-based-testing

## 6. Gaps in the sources

- No official NestJS page defines "bounded context", "aggregate" as a
  consistency boundary, or "application service". The CQRS recipe gives the
  mechanics (`AggregateRoot`, handlers, events). The samples put the rules
  in the module service. A DDD layout for Grocy Next is a decision, not a
  documented convention.
- The NestJS docs say e2e tests go in `test/`. The samples use `e2e/`.
- The NX Nest plugin builds with webpack and offers Jest for e2e. The NX
  React plugin defaults to Vite and Playwright. The new NestJS CLI defaults
  to Vitest for ESM projects. One workspace can therefore end up with two
  unit test runners. The NX generators ask for the runner per project.
- The React docs do not name a test runner. The Redux docs lean to Vitest.
- The Redux writing-tests page does not cover RTK Query tests.
- The NX docs do not show a complete example with one Nest app and one
  React app that share a library. The `--frontendProject` option on the
  Nest app generator is the only direct link in the docs.
