# Research: monorepo tool, Nx against Turborepo

Ticket: [#5](https://github.com/the-dev-abides/grocy-next/issues/5).
Date of the research: 2026-11-01.

## Question

Which monorepo tool serves Grocy Next best: Nx (the default) or Turborepo,
with pnpm workspaces? The ticket names six criteria: a NestJS or other Node
backend, a React frontend, shared domain packages, an MCP server package, CI
caching, and the learning cost for a new contributor.

## Summary

Both tools run tasks over a pnpm workspace, cache task results on the local
machine, and run only the tasks that a change affects. Both have the MIT
license. The difference is the amount of tooling that the tool adds on top of
the workspace.

Nx adds a project graph, inferred tasks, plugins for NestJS and React,
generators, a stable lint rule for module boundaries, and the `nx sync`
command for TypeScript project references. A contributor must learn `nx.json`,
`project.json`, the plugin model, and the Nx command set.

Turborepo adds one file, `turbo.json`. It reads the scripts in each
`package.json` and the dependencies in the lockfile. Each app keeps its own
framework tool: the Nest CLI for the backend, Vite for the frontend, `tsc` for
the MCP server. A contributor who knows pnpm and the framework tools learns
one new file. Its module boundary feature is experimental.

Remote caching is free for both tools. Turborepo uses Vercel Remote Cache,
which is free on all Vercel plans, or a self-hosted server. Nx uses Nx Cloud,
which has a free Hobby plan and a free plan for open-source projects, or a
self-hosted server.

The recommendation is Turborepo with pnpm workspaces, because it has the
lowest learning cost and it meets the other five criteria. The maintainer
decides.

## Versions

All versions come from `npm view <name> version` on 2026-11-01.

| Package                     | Version |
|-----------------------------|---------|
| `nx`                        | 24.0.3  |
| `@nx/nest`                  | 24.0.3  |
| `@nx/react`                 | 24.0.3  |
| `turbo`                     | 2.11.10 |
| `pnpm`                      | 12.16.1 |
| `@nestjs/core`              | 12.3.2  |
| `react`                     | 19.3.1  |
| `@modelcontextprotocol/sdk` | 1.32.2  |
| `typescript`                | 7.0.2   |

`nx`, `turbo`, and `pnpm` have the MIT license (`npm view <name> license`).
The last publish of `nx` was 2026-10-30. The last publish of `turbo` was
2026-10-29.

## Findings

### 1. pnpm workspaces

Both tools build on package manager workspaces.

Turborepo requires a workspace. The structure guide says that with pnpm the
packages are listed in `pnpm-workspace.yaml`, and that "every directory with
a package.json in the apps or packages directories will be considered a
package". Turborepo reads `pnpm-lock.yaml` to find the dependencies between
internal packages. It does not support nested package globs such as
`packages/**`. [T1]

Nx supports two ways to link TypeScript projects: package manager workspaces
and TypeScript path aliases. A new workspace from `create-nx-workspace` uses
package manager workspaces by default. The `--no-workspaces` flag selects
path aliases. With workspaces, Nx can add TypeScript project references, and
the `nx sync` command updates the `references` lists in each `tsconfig`. [N1]

### 2. NestJS or other Node backend

Nx has the `@nx/nest` plugin. The command `nx add @nx/nest` installs it. The
generators `nx g @nx/nest:app` and `nx g @nx/nest:lib` create a Nest
application or library. The plugin "extends the generators provided by Nest",
so the Nest CLI generators run through `nx`. The build uses webpack through
`NxWebpackPlugin`, and the default setup externalizes all dependencies. The
`serve` target runs the `build` target and then runs the application in
watch mode. Nx also writes a VS Code debug configuration. [N2]

Turborepo has no NestJS plugin. It runs the scripts that the Nest CLI already
provides in `package.json`. The Turborepo repository has a core-listed example
`with-nestjs`, which is community-maintained. It has a NestJS app in
`apps/api`, a Next.js app in `apps/web`, and shared packages for NestJS
resources, ESLint, Jest, and TypeScript configuration. It uses pnpm. The
repository also has a `with-typeorm` example. [T2] [T3]

Result: Nx gives generators and a preconfigured build. Turborepo uses the
Nest CLI as it is. Both run a NestJS backend.

### 3. React frontend

Nx has the `@nx/react` plugin. The command `nx add @nx/react` installs it. The
generators create applications, libraries, components, and hooks. The plugin
integrates Jest, Cypress, and Storybook. Libraries can use `--bundler=vite`
or `--bundler=rollup`. [N3]

Turborepo runs the scripts that Vite provides. The Turborepo repository has
the examples `with-vite-react`, `with-vite`, `with-rsbuild`, and
`with-tailwind`. [T3]

Result: Nx gives generators and test integration. Turborepo uses Vite as it
is. Both run a React frontend.

### 4. Shared domain packages

Both tools treat a shared package as one workspace package with its own
`package.json`. A dependent package declares it as a dependency. Both tools
build dependencies first through the `^build` rule.

In Turborepo, `dependsOn: ["^build"]` "tells `turbo` that the task must wait
for tasks in the package's dependencies to complete first". The structure
guide says to give each package a namespaced name such as `@repo/name`, to
define entry points in the `exports` field, and to avoid `../` imports across
package boundaries. [T1] [T4]

In Nx, `targetDefaults` in `nx.json` holds the same `"dependsOn": ["^build"]`
rule. [N4]

Module boundaries differ. Nx has the lint rule `@nx/enforce-module-boundaries`.
A project gets `tags`, and `depConstraints` say which tags a project with a
given tag can depend on. A violation is a lint error. The rule is a stable
feature. [N5] Turborepo has `turbo boundaries`. It reports an import from
outside the package directory and an import of a package that is not a
declared dependency. Tags in `turbo.json` add allow and deny rules. The docs
say "This feature is experimental". [T5]

Result: both tools support shared domain packages. Nx has a stable tag-based
boundary rule. Turborepo has an experimental one, and pnpm itself blocks an
import of an undeclared dependency.

### 5. MCP server package

An MCP server is a Node package that uses `@modelcontextprotocol/sdk`. It
needs no special tool support. Both tools build it as one workspace package.

The Turborepo repository has the example `with-mcp-servers`. Each server is
a standalone Node ESM package built with `tsc`, with a `createServer()`
factory for tests and a separate executable entry in the `exports` field.
The `^build` rule compiles the servers before the client. [T6]

Nx has no MCP-specific plugin. The `@nx/js` plugin infers `build` and
`typecheck` targets from `tsconfig.lib.json` for a plain TypeScript package.
[N1]

Result: no difference for this criterion.

### 6. CI caching

Both tools hash the inputs of a task, store the outputs and the terminal
output, and replay the result when the hash matches. Both run only affected
tasks in a pull request.

Nx local cache and affected. Nx hashes the inputs, checks the local cache,
then checks the remote cache when one is configured. [N6] In CI, `nx affected`
runs only the projects that a change touches. The checkout needs
`fetch-depth: 0`. On a push to `main`, the `nrwl/nx-set-shas` action sets the
base to the last commit that passed CI. The base workflow does not need Nx
Cloud. "Caching, affected, and distribution only apply to tasks that `nx`
runs." [N7]

Nx remote cache. The documented path is Nx Cloud, connected with
`npx nx connect`. [N8] The Hobby plan is free, with 50,000 credits a month,
5 contributors, and 10 concurrent CI connections. The Team plan is $29 a
month. [N9] The Nx 20 pricing page says "We provide a free plan for
open-source projects." The current pricing page lists this FAQ question, and
the answer did not render in the fetch. [N10] Self-hosted options exist. From
Nx 20.8 a team can run its own cache server against a published OpenAPI spec
with `PUT` and `GET` at `/v1/cache/{hash}`. The packages `@nx/s3-cache`,
`@nx/gcs-cache`, `@nx/azure-cache`, and `@nx/shared-fs-cache` are "free but
require an activation key" that the install step issues. The same page says
that these bucket caches are listed in CVE-2025-36852 (CREEP) and that
"Nx Cloud is NOT affected". [N11] [N12]

Turborepo local cache and affected. Turborepo caches in `.turbo/cache`. The
`--affected` flag runs only the packages that changed on the branch, and by
default equals `--filter=...[main...HEAD]`. A shallow checkout marks all
packages as changed. [T7]

Turborepo remote cache. "Vercel Remote Cache is free to use on all plans, even
if you do not host your applications on Vercel." Setup is `turbo login` and
`turbo link`. "A Remote Cache can be implemented by any HTTP server that meets
Turborepo's Remote Caching API specification", and `turbo login --manual`
connects to it. [T8] The GitHub Actions guide sets `TURBO_TOKEN` and
`TURBO_TEAM`, with OIDC through `vercel/setup-turborepo-remote-cache-action`
as the recommended path. It also shows a fallback that stores the `.turbo`
folder with `actions/cache`. [T9] An open-source self-hosted server exists:
`ducktors/turborepo-remote-cache`, MIT license, last push 2026-10-30. [T10]
The Nx CREEP post says that the race condition affects remote cache plugins
"across numerous build systems" and most self-hosted caches. It does not name
Turborepo. [N12]

Result: both tools give local caching and affected runs with no account. Both
give a free hosted remote cache. Both publish an OpenAPI spec for a self-hosted
cache. Nx Cloud adds distributed task execution and Ultracache, which Grocy
Next does not need at its size. A self-hosted bucket cache carries the CREEP
risk with either tool.

### 7. Learning cost for a new contributor

Nx concepts. The "How Nx works" page lists the project graph, the task graph,
caching, inferred tasks from plugins, and explicit tasks. The configuration
files are `nx.json` for the task pipeline and the plugin list, `project.json`
for a project's targets, `package.json` with an optional `nx` section, and the
tool configuration files that plugins read. The precedence is plugin-inferred
tasks, then `targetDefaults`, then the project file. [N4] A contributor also
meets generators, the `nx` command set, `nx sync`, and the plugin version rule:
"Make sure to install the `@nx/react` version that matches the version of `nx`
in your repository." [N3] The `nx init` path is lighter. It adds `nx.json` and
the `nx` dependency, and plugins are optional. [N13]

Turborepo concepts. The configuration is one root `turbo.json` with `tasks`.
Each task has `dependsOn`, `outputs`, `inputs`, `cache`, `env`, and
`persistent`. [T4] Turborepo finds tasks by the script names in each
`package.json`. [T1] Code generation is optional through `turbo gen workspace`
and Plop-based custom generators. [T11] A contributor uses the Nest CLI and
Vite commands that the framework docs describe.

Result: Turborepo has fewer concepts and fewer files. A contributor who knows
pnpm, the Nest CLI, and Vite learns one file.

## Comparison table

| Criterion                | Nx 24.0.3                                                                  | Turborepo 2.11.10                                                          |
|--------------------------|----------------------------------------------------------------------------|----------------------------------------------------------------------------|
| pnpm workspaces          | Default for new workspaces. `nx sync` keeps project references current.    | Required. Reads `pnpm-workspace.yaml` and `pnpm-lock.yaml`.                |
| NestJS backend           | `@nx/nest` plugin with generators and webpack build.                       | No plugin. Runs Nest CLI scripts. Official `with-nestjs` example.          |
| React frontend           | `@nx/react` plugin with generators, Jest, Cypress, Storybook.              | No plugin. Runs Vite scripts. Official `with-vite-react` example.          |
| Shared domain packages   | `^build` ordering. Stable `enforce-module-boundaries` lint rule with tags. | `^build` ordering. Experimental `turbo boundaries` with tags.              |
| MCP server package       | Plain TypeScript package. `@nx/js` infers `build` and `typecheck`.         | Plain TypeScript package. Official `with-mcp-servers` example.             |
| Local cache and affected | Yes. `nx affected` with `nrwl/nx-set-shas`. No account needed.             | Yes. `turbo run --affected`. No account needed.                            |
| Hosted remote cache      | Nx Cloud. Free Hobby plan: 50,000 credits, 5 contributors. OSS plan.       | Vercel Remote Cache. Free on all plans.                                    |
| Self-hosted remote cache | OpenAPI spec from Nx 20.8. Bucket packages free with an activation key.    | OpenAPI spec. Community servers, for example `ducktors`.                   |
| Configuration files      | `nx.json`, optional `project.json`, plugin entries, `nx` in package.json.  | `turbo.json` and the scripts that already exist in each `package.json`.    |
| Code generation          | Built in, per plugin.                                                      | Optional, `turbo gen` with Plop.                                           |
| Learning cost            | Higher: graph, plugins, inferred tasks, generators, Nx command set.        | Lower: one file, framework tools as they are.                              |
| License                  | MIT                                                                        | MIT                                                                        |

## Recommendation

Use Turborepo 2.11.10 with pnpm 12.16.1 workspaces.

Reason: the project map lists an architecture document that a new contributor
reads in 15 minutes and a `good first issue` pipeline. Turborepo adds one file
to a pnpm workspace. Each app keeps the tool that its framework documents: the
Nest CLI, Vite, and `tsc`. A contributor who knows these tools does not learn
a second command set. For the other five criteria, the two tools give the same
result at the size of Grocy Next: both run NestJS, React, shared packages, and
an MCP server as workspace packages, and both cache locally, run affected
tasks, and offer a free remote cache.

Cost of this choice: no generators for Nest or React modules, so contributors
use the Nest CLI and hand-written files. The tag-based boundary check is
experimental, so the domain layer rules rely on `package.json` dependencies
and code review until it is stable.

When to pick Nx instead: if the maintainer wants generators for every Nest and
React artifact, or a stable lint rule that enforces DDD layer boundaries by tag
from day one, Nx 24.0.3 gives both. The cost is the larger concept set in
section 7.

The maintainer decides. The ADR for area 2, monorepo and tooling, records the
decision.

## Not verified

- The current nx.dev pages for `@nx/nest` and `@nx/react` returned empty
  content in the fetch. The findings cite the Nx 21 versioned pages. The
  current sources are in the Nx repository at
  `astro-docs/src/content/docs/technologies/node/nest/introduction.mdoc` and
  `astro-docs/src/content/docs/technologies/react/introduction.mdoc`.
- The current Nx pricing page lists the FAQ "Is there a plan for open source
  projects?" and the answer did not render. The Nx 20 pricing page gives the
  answer quoted in section 6.
- The Turborepo examples page rendered no example names. The example list
  comes from the GitHub repository contents.

## Sources

Nx:

- [N1] TypeScript project linking: <https://nx.dev/docs/kb/typescript-project-linking>
- [N2] `@nx/nest` introduction (Nx 21 docs): <https://21.nx.dev/docs/technologies/node/nest/introduction>
- [N3] `@nx/react` introduction (Nx 21 docs): <https://21.nx.dev/docs/technologies/react/introduction>
- [N4] How Nx works: <https://nx.dev/docs/getting-started/how-nx-works>
- [N5] Enforce module boundaries: <https://nx.dev/docs/features/enforce-module-boundaries>
- [N6] Cache task results: <https://nx.dev/docs/features/cache-task-results>
- [N7] Set up CI: <https://nx.dev/docs/getting-started/setup-ci>
- [N8] Remote cache: <https://nx.dev/docs/features/ci-features/remote-cache>
- [N9] Nx Cloud pricing: <https://nx.dev/pricing>
- [N10] Nx 20 pricing page, open-source answer: <https://20.nx.dev/pricing>
- [N11] Self-hosted remote cache (Nx 21 docs): <https://21.nx.dev/docs/guides/tasks--caching/self-hosted-caching>
- [N12] CVE-2025-36852 (CREEP) post: <https://nx.dev/blog/cve-2025-36852-critical-cache-poisoning-vulnerability-creep>
- [N13] Add Nx to an existing project: <https://nx.dev/docs/getting-started/start-with-existing-project>
- Nx repository: <https://github.com/nrwl/nx>

Turborepo:

- [T1] Structuring a repository: <https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository>
- [T2] `with-nestjs` example README: <https://github.com/vercel/turborepo/blob/main/examples/with-nestjs/README.md>
- [T3] Examples directory: <https://github.com/vercel/turborepo/tree/main/examples>
- [T4] Configuration reference: <https://turborepo.dev/docs/reference/configuration>
- [T5] Boundaries reference: <https://turborepo.dev/docs/reference/boundaries>
- [T6] `with-mcp-servers` example README: <https://github.com/vercel/turborepo/blob/main/examples/with-mcp-servers/README.md>
- [T7] `turbo run` reference, `--filter` and `--affected`: <https://turborepo.dev/docs/reference/run>
- [T8] Remote caching: <https://turborepo.dev/docs/core-concepts/remote-caching>
- [T9] GitHub Actions guide: <https://turborepo.dev/docs/guides/ci-vendors/github-actions>
- [T10] Community remote cache server: <https://github.com/ducktors/turborepo-remote-cache>
- [T11] Generating code: <https://turborepo.dev/docs/guides/generating-code>
- Turborepo docs index: <https://turborepo.dev/docs>
- Turborepo repository: <https://github.com/vercel/turborepo>

Package registry:

- `npm view <name> version` and `npm view <name> license`, run on 2026-11-01.
