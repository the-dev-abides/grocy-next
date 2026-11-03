# NestJS 12 inside an NX 24 workspace

Ticket: GitHub issue #31, "Decide the stack".
Parent map: GitHub issue #1.

This document records facts. It does not choose. ADR 8 chooses.


Date of research: 2026-11-02. All facts come from the sources that are named next to them.

## 1. The state of the packages on npm (2026-11-02)

| Package | Latest | Date | Fact |
| --- | --- | --- | --- |
| `nx` | 24.0.3 | 2026-10-30 | Nx 24.0.0 was published 2026-10-21. |
| `@nx/nest` | 24.0.3 | 2026-10-30 | Peer range `@nestjs/core >=10.0.0 <12.0.0`, `@nestjs/common >=10.0.0 <12.0.0`. Both peers are marked optional in `peerDependenciesMeta`. Dependency `@nestjs/schematics ^11.0.0`. |
| `@nestjs/core` | 12.3.2 | 2026-10-27 | `"type": "module"`. `engines.node >= 20`. Version 12.0.0 became `latest` on 2026-08-27. |
| `@nestjs/schematics` | 12.0.12 | 2026-10-28 | 12.0.0 was published 2026-08-27. Peer `typescript >=6.0.0` and `prettier ^3.0.0`. Depends on `@angular-devkit/schematics 22.2.4`. |
| `@nestjs/cli` | 12.0.11 | 2026-10 | Depends on `@nestjs/schematics ^12.0.0` and `typescript ~6.0.2`. |

Source: the npm registry JSON for each package.

The `@nx/nest` peer range on NestJS is new in Nx 23. The 22.x releases of `@nx/nest` (22.7.8 to 22.7.11, July to September 2026) declare no `@nestjs/*` peer at all. The range `>=10.0.0 <12.0.0` appears in 23.0.0 (2026-06-16) and in every later release up to 24.0.3. Source: the npm registry `peerDependencies` field of each version.

The `@nx/nest` master branch on GitHub (2026-11-02) still has the same peer range and still depends on `@nestjs/schematics ^11.0.0`. Source: `packages/nest/package.json` on `nrwl/nx` master.

## 2. What the three issues report

### Issue nrwl/nx#36936 (opened 2026-09-07 by johnnyhuirilef, open, priority: high)

Title: "@nx/nest cannot be installed with NestJS 12, and generating an app leaves the workspace unable to load".

The reporter lists three separate failures with Nx 23.2.0 and npm 11.17:

1. `npm install -D @nx/nest` fails with `ERESOLVE` because of the peer range. The peers are optional, so `--legacy-peer-deps` installs the package.
2. The version map in `packages/nest/src/utils/versions.ts` has an entry for major 10 only. Every other major falls back to the "latest" constants, which are `^11.0.0`. A workspace with `@nestjs/core ^12.0.1` gets `@nestjs/platform-express ^11.0.0`, `@nestjs/schematics ^11.0.0` and `@nestjs/testing ^11.0.0` written into `package.json`.
3. The application generator registers `@nx/webpack/plugin` in `nx.json` and then runs `npm install` to add `@nx/webpack`. That install hits the same peer conflict and fails. The files are already written. `nx show projects` then fails with `Plugin listed in nx.json not found: @nx/webpack/plugin`. This also happens with `NX_DAEMON=false`.

Maintainer response: AgentEnder (Nx team member) replied on 2026-09-20. They confirmed the three failures as distinct problems and set priority high. They pointed to PR #36937 as the fix. No maintainer in the thread confirmed a workaround.

Workarounds in the thread: only `--legacy-peer-deps`, reported by the issue author, which gets past failure 1 and then runs into failures 2 and 3. Nobody reported a working end-to-end workaround in this thread.

### Issue nrwl/nx#36913 (opened 2026-09-03 by johnnyhuirilef, open, type: enhancement, priority: medium)

Title: "The @nx/nest:application generator hardcodes webpack and cannot follow NestJS 12".

Facts from the issue and the maintainer confirmation (AgentEnder, 2026-09-20, verified on master commit `c32c1cc0a2`):

- `packages/nest/src/generators/application/lib/normalize-options.ts` sets `bundler: 'webpack'` as a literal.
- The option `bundler` is absent from the generator schema. The schema sets `additionalProperties: false`, so `--bundler=rspack` is rejected.
- The maintainer wrote: "there is genuinely no way around it from the outside."
- The reporter measured three bundlers on a generated Nest app with a two-level provider chain. webpack: HTTP 200. rspack: HTTP 200. esbuild: builds, boots, and answers HTTP 500 with `TypeError: Cannot read properties of undefined (reading 'getData')`. Cause: esbuild does not emit `design:paramtypes`, which NestJS reads for constructor injection. Reproduction: `github.com/johnnyhuirilef/nx-repros/tree/main/nest-bundler-decorator-metadata`.
- Related PR: #36881 (see section 5).

Workarounds in the thread: none. The reporter and the maintainer agree there is no user-side workaround for the generator.

### Issue nrwl/nx#37388 (opened 2026-10-12 by minijus, open, scope: core, priority: high)

Title: "generatePackageJson silently drops peer dependencies of packages whose exports don't expose ./package.json (e.g. NestJS 12)".

Facts:

- With `@nx/webpack` and `generatePackageJson: true` on Nx 23.3.0, the generated `dist/**/package.json` for a NestJS 12.1.3 app lacks `@nestjs/platform-express`, `reflect-metadata` and `rxjs`. The app then fails on start with `ERR_MODULE_NOT_FOUND`.
- Cause: `recursivelyCollectPeerDependencies` in `packages/nx/src/plugins/js/package-json/create-package-json.ts` calls `require('<pkg>/package.json')`. The NestJS 12 `exports` map has `"./*": "./*.js"`, so that resolves to `package.json.js` and throws. The catch block swallows the error.
- Maintainer response: AgentEnder confirmed on master commit `b25a108ba4` on 2026-10-22 and set priority high.
- Workaround reported by the issue author: add side-effect imports to `main.ts` so the packages appear as direct imports in the project graph:

```ts
import 'reflect-metadata';
import 'rxjs';
import '@nestjs/platform-express';
```

- The issue author also opened nestjs/nest#18116 (2026-10-12) to ask NestJS to export `./package.json`. Kamil Mysliwiec closed it the next day and tracked it in nestjs/nest#18122. The npm registry shows that `@nestjs/core` and `@nestjs/common` 12.2.0 (2026-10-19) and later export `./package.json`. Versions 12.0.0 to 12.1.3 do not. So this failure is gone on NestJS 12.2.0 and later, without an Nx change.

No maintainer confirmed the side-effect import workaround.

### Linked issues and PRs

- nrwl/nx#33993 (opened 2025-12-27 by robertIsaac, open): "can't run nestjs project if it's using esm". On 2026-09-04 johnnyhuirilef measured on Nx 23.2.0: a generated Nest app with `"type": "module"` fails during project graph processing because the generated `webpack.config.js` uses `require()` and a `.js` file is ESM under `"type": "module"`. The error is `require is not defined in ES module scope`. No workaround was confirmed.
- nrwl/nx#36389 (opened 2026-07-17 by Clashsoft, closed 2026-10-28): Nest projects could not be migrated off the deprecated `@nx/webpack:webpack` executor. On 2026-08-08 user pbintcha posted a manual migration recipe: rewrite `webpack.config.js` to use `NxAppWebpackPlugin` from `@nx/webpack/app-plugin`, delete the `build` target from `project.json`, register `@nx/webpack/plugin` in `nx.json`, keep the `serve` target on `@nx/js:node`, and install `webpack-cli`. No maintainer confirmed it in the thread. The same shape appears in the real repositories in section 7.
- nrwl/nx#36946 (opened 2026-09-07 by Forceres, closed 2026-10-20 as stale): `@nx/rspack` NestJS 12 ESM build. The reporter said the `serve` target worked, but the production build with `optimization: true` failed with `'import', and 'export' cannot be used outside of module code`, and `@rspack/core 2.2.2` failed with `immutablePaths is undefined`. The maintainer asked for a reproduction. None was provided.
- nrwl/nx#36984 and PR #36985 (merged 2026-09-30): the project graph lost edges to packages whose wildcard `exports` reroute `package.json`. This fix is in Nx 23.3 and 24. It does not fix #37388, which is a different code path.
- nrwl/nx#35503 (opened 2026-04-30 by FrozenPandaz on behalf of vrxj81, open, type: feature, priority: low): "Exploring a modern Nx-native NestJS v12 plugin aligned with Nest CLI and Project Crystal". FrozenPandaz (Nx core team) agreed to the direction on 2026-05-02 and asked for a full inference plugin as one milestone on 2026-05-05. On 2026-10-18 user jase88 asked whether the priority is still low. No maintainer answered.
- PR nrwl/nx#35551 (opened 2026-05-03 by vrxj81, open): "feat(nest): infer Nest projects from nest-cli.json". It adds `@nx/nest/plugin`, which detects `nest-cli.json` and infers a cacheable `build` target (`nest build`) and a continuous `start` target (`nest start`). FrozenPandaz requested changes on 2026-06-18 and 2026-07-15. The author rebased in September 2026 and marked it ready. No review since.

## 3. Running NestJS 12 in Nx 24 without `@nx/nest`

### What `@nx/nest` provides

Generators only. `@nx/nest` has no executors. Its `generators.json` lists `application`, `init`, `library`, and the wrappers `class`, `controller`, `decorator`, `filter`, `gateway`, `guard`, `interceptor`, `interface`, `middleware`, `module`, `pipe`, `provider`, `resolver`, `resource`, `service`. The wrappers call `@nestjs/schematics` through `wrapAngularDevkitSchematic` from `@nx/devkit/ngcli-adapter`. Source: `packages/nest/generators.json` and `packages/nest/src/generators/utils/run-nest-schematic.ts` on master.

`@nx/nest` has no inference plugin on master (PR #35551 adds one, not merged). The application generator delegates its build setup to `@nx/node`, which writes a webpack config and registers `@nx/webpack/plugin`. The `serve` target uses `@nx/js:node`. Source: issue #36913, PR #36881, Nx docs "Nx with Nest.js".

So without `@nx/nest` you lose: the Nest application and library generators, the schematic wrappers, and the `--frontendProject` proxy wiring of the Nest generator. You lose nothing at build or serve time, because those targets come from other packages anyway.

### What `@nx/node` provides in Nx 24

`@nx/node` 24.0.3 has no executors. It has generators. Source: npm registry `@nx/node@24.0.3` has no `executors` field, and `packages/node/executors.json` does not exist on master.

The `@nx/node:application` generator options on master:

- `bundler`: `tsc`, `rolldown`, `esbuild`, `webpack`. Default `tsc` in TypeScript solution workspaces, otherwise `rolldown`. `tsc` requires project references. `rolldown` is rejected with `fastify`.
- `framework`: `express`, `fastify`, `koa`, `nest`, `none`. With `nest`, the generator calls the `@nx/nest` application generator. So `@nx/node --framework=nest` does not avoid `@nx/nest`. Source: `packages/node/src/generators/application/application.ts` line 150.
- `frontendProject`: "Frontend project that needs to access this application. This sets up proxy configuration." The implementation in `lib/add-proxy.ts` adds `dependsOn: ["<app>:serve"]` and `proxyConfig: <frontend>/proxy.conf.json` to the frontend `serve` or `dev` target, and writes `{"/api": {"target": "http://localhost:<port>", "secure": false}}`. This is plain JSON. You can write it by hand without the generator.
- `unitTestRunner`: `jest`, `vitest`, `none`.

Source: `packages/node/src/generators/application/schema.json` and `lib/add-proxy.ts` on master.

The Nx docs "Nx with Node.js" page (nx.dev/docs/technologies/node/introduction, read 2026-11-02) says:

- "The serve task comes from the first two lines of src/main.ts: `#!/usr/bin/env node` `// @nx-target-name: serve`. `@nx/js/node` picks up files whose shebang names node."
- "nx serve runs the file with node --watch and restarts it on changes without a build step."
- "Node runs the TypeScript source directly, which requires Node.js 22.18 or later. These applications are ES modules, with "type": "module" in their package.json, so relative imports name the .ts file (./message.ts). The build rewrites them to .js."
- "In workspaces that use TypeScript path aliases, and for esbuild, Jest, or JavaScript (--js) applications, the shebang names tsx instead."
- "Applications that use webpack, or workspaces with inference plugins turned off, get an explicit serve target in project.json instead."
- "Applications build with tsc in TypeScript workspaces that use project references, and with Rolldown in workspaces that use TypeScript path aliases."

The `@nx/js/node` plugin source confirms the command: `['node', ...(watch ? ['--watch'] : []), ...shebang.args, file]`. Source: `packages/js/src/plugins/scripts/node-plugin.ts` on master. PR #37400 (merged 2026-10-14, by jaysoo) introduced this and the Rolldown plugin.

### The decorator problem with the Nx 24 Node defaults

NestJS needs two TypeScript features: `experimentalDecorators` and `emitDecoratorMetadata`. The NestJS 12 ESM tsconfig example sets both. Source: docs.nestjs.com migration guide, "Switching your project to ESM".

- Node's built-in type stripping does not transform decorators. The Node.js docs say: "Since Decorators are currently a TC39 Stage 3 proposal, they are not transformed and will result in a parser error." Source: nodejs.org/api/typescript.html, Node 26.13 docs. So `node --watch src/main.ts` cannot run NestJS source.
- `tsx` uses esbuild. The tsx docs say: "`emitDecoratorMetadata` is not supported." Source: github.com/privatenumber/tsx `docs/typescript.md`.
- esbuild: "Experimental decorators: Requires experimentalDecorators, does not support emitDecoratorMetadata." Source: esbuild.github.io/content-types. This is why `@nx/esbuild:esbuild` builds a NestJS app that answers HTTP 500 (issue #36913).
- SWC emits the metadata. `@nx/rspack` passes `decoratorMetadata: true` to `builtin:swc-loader` (issue #36913 quotes `packages/rspack/src/plugins/utils/apply-base-config.ts`). The `@nx/js:swc` executor and the Nest CLI `swc` builder also use SWC.
- Rolldown uses the oxc transformer. The oxc docs say the transformer supports legacy decorators and an `emitDecoratorMetadata` option, with the note "Types that requires type inference will fallback to Object". Source: oxc.rs/docs/guide/usage/transformer/typescript.html. PR #36881 proposes `rolldown` as an accepted Nest bundler, but that PR is not merged and master has no Nest-specific Rolldown config.
- `tsc` emits the metadata. The `@nx/js:tsc` executor and the Nest CLI default `tsc` builder work.

Consequence for the "no plugin" paths: the Nx 24 default Node app (`tsc` build, `node --watch src/main.ts` serve) does not work for NestJS source, because the serve step uses Node type stripping. The build step with `tsc` works. The serve step must run compiled output, or run SWC or tsc in watch mode.

### Build executors and ESM output

- `@nx/esbuild:esbuild`: `format` is an array with values `esm` and `cjs`. "Defaults to matching format from tsconfig (e.g. CJS for CommonJS, and ESM otherwise)." `platform` default `node`. Source: `packages/esbuild/src/executors/esbuild/schema.json`. ESM output works. Decorator metadata does not (see above).
- `@nx/js:tsc`: options `main`, `outputPath`, `tsConfig`, `transformers`, `generatePackageJson` (default true). The module format follows the tsconfig. Source: `packages/js/src/executors/tsc/schema.json`.
- `@nx/js:swc`: options `main`, `outputPath`, `tsConfig`, `swcrc`, `skipTypeCheck`. Source: `packages/js/src/executors/swc/schema.json`.
- `@nx/webpack:webpack` and `@nx/rspack:rspack`: removed in Nx 24. Source: nx.dev/docs/reference/deprecated/removed-executors lists `webpack`, `dev-server` for `@nx/webpack` and `rspack`, `dev-server` for `@nx/rspack`. Only `ssr-dev-server` stays. The replacement is the inferred `@nx/webpack/plugin` or `@nx/rspack/plugin` with a `webpack.config.js` or `rspack.config.*` that uses `NxAppWebpackPlugin` or `NxAppRspackPlugin`.
- `@nx/js:node`: still present in Nx 24. Options `buildTarget`, `watch` (default true), `inspect`, `port`, `runtimeArgs`, `waitUntilTargets`. It runs the output of a build target and rebuilds on change. Source: `packages/js/src/executors/node/schema.json`.
- `nx:run-commands`: runs any shell command as a target, with caching, `dependsOn`, and `continuous: true` for long-running processes. Source: nx.dev/docs/kb/run-commands-executor. The Nest CLI commands `nest build` and `nest start --watch` run this way. The real repositories in section 7 use this executor for `webpack-cli build` and `rspack build`.

### NestJS 12 facts that matter for the choice

From docs.nestjs.com migration guide (source file `content/migration.md` in `nestjs/docs.nestjs.com`):

- "All core Nest packages now ship as ESM."
- "Migrating your own application to ESM is entirely optional and not part of upgrading to v12. Because Nest's ESM packages can be consumed from CommonJS through `require(esm)`, a CommonJS application can upgrade to v12 and stay CommonJS for as long as you like."
- Runtime: Node 20.19+ or 22.12+. Node 21 is not supported. `nest new`, `nest generate`, `nest upgrade` need Node 22.22.3+, 24.15+, or 26+.
- "`@nestjs/schematics` v12 requires TypeScript 6 as a peer dependency."
- "If you stay on Jest, note that it can load the ESM-only v12 packages only on Node.js v24.9 or later." ESM projects use Vitest by default.
- "Rspack is now the default bundler for monorepos, and the `--webpack` / `--webpackPath` CLI flags ... are deprecated in favor of `--builder rspack`."
- The Nest CLI webpack compiler refuses ESM projects. Source code: `lib/compiler/webpack-compiler.ts` in `nestjs/nest-cli` throws `The webpack compiler does not support ESM projects ("type": "module" in package.json). Please use rspack instead`.
- The Nest CLI 12.0.0 release notes (2026-08-27) say: "If you build with tsc (the default) or with SWC, nothing changes." `nest new` scaffolds `rspack` into `nest-cli.json` for new projects. webpack moved to optional peer dependencies.

So "NestJS 12 is ESM-only" is true for the packages. It is not true for the application. An Nx Nest app can stay CommonJS, compile with `tsc` or SWC through webpack or rspack, and load the ESM packages through `require(esm)`. This is what the Nx 24 repositories in section 7 do.

## 4. Peer dependency overrides

### npm

- `--legacy-peer-deps`: "Causes npm to completely ignore peerDependencies when building a package tree." Source: docs.npmjs.com/cli/v11/using-npm/config. Issue #36936 confirms it installs `@nx/nest` 23.2.0 next to NestJS 12.
- `overrides` replaces a package version in the tree. It does not rewrite a dependency's declared peer range. Source: docs.npmjs.com package.json `overrides` section.
- Real case: iqb-berlin/coding-box (default branch `develop`, commit "Upgrade backend to Nest 12 and Node 24" on 2026-11-01) has `@nestjs/core 12.3.2` and `@nx/nest 22.7.12` in `package-lock.json` at the root, installed with npm and `npm ci` in GitLab CI, with no `.npmrc` and no `legacy-peer-deps`. This works because `@nx/nest` 22.x declares no NestJS peer (section 1). An Nx 23 or 24 workspace on npm cannot do this without `--legacy-peer-deps`.

### pnpm

- `strictPeerDependencies`: "Default: false. If this is enabled, commands will fail if there is a missing or invalid peer dependency in the tree." So pnpm installs `@nx/nest` 24 next to NestJS 12 by default and prints a warning. Source: pnpm.io/settings/peer-dependencies.
- `autoInstallPeers`: "Default: true. When true, any missing non-optional peer dependencies are automatically installed." The `@nx/nest` peers are optional, so pnpm does not pull in a second NestJS.
- `peerDependencyRules.allowedVersions`: "Unmet peer dependency warnings will not be printed for peer dependencies of the specified range." It only silences the warning.
- `overrides` with `:peer`: "Use `:peer` on the target selector to target only peerDependencies", for example `"@nx/nest>@nestjs/core:peer": ">=10.0.0 <13.0.0"`. "The peer dependency range is replaced in peerDependencies." Source: pnpm.io/settings/dependency-resolution. This rewrites the declared range and removes the warning.
- Real cases: chaotic-cx/chaotic-next and ZenSoftware/zen use pnpm with `.npmrc` `strict-peer-dependencies=false` and `auto-install-peers=true`. hsimpson/dmx-light-control uses pnpm 12 with no peer settings. All three have `@nx/nest` 24.0.x next to `@nestjs/core ^12.2.0`.

### yarn

- Yarn Berry reports a peer mismatch as warning `YN0060 - INCOMPATIBLE_PEER_DEPENDENCY`: "This will not prevent resolution, but may leave the system in an incorrect state." Source: yarnpkg.com/advanced/error-codes. `resolutions` changes installed versions, not declared peer ranges.
- Real case: ever-co/ever-gauzy uses Yarn 1.22 with `@nx/nest 23.3.0` and `@nestjs/core ^12.1.3`, no peer-related `resolutions`.

### What breaks after a forced install

The executors do not break. The repositories in section 7 build and serve NestJS 12 with `@nx/nest` 24 installed. `@nx/nest` has no executors, so there is nothing of it on the build or serve path.

The generators break in these ways:

- `@nx/nest:application` and `@nx/nest:library` write `^11.0.0` for `@nestjs/platform-express`, `@nestjs/schematics` and `@nestjs/testing` next to `@nestjs/core 12` (issue #36936, confirmed by the version map in `versions.ts` on master).
- `@nx/nest:application` registers `@nx/webpack/plugin` and runs the package manager install. On npm that install fails on the peer conflict and leaves `nx.json` pointing at a missing plugin (issue #36936, failure 3). On pnpm with default settings the install succeeds with a warning.
- The schematic wrappers (`controller`, `service`, ...) load `@nestjs/schematics` 11, which `@nx/nest` depends on. They generate NestJS 11 style code. Whether they fail against a NestJS 12 project was not reported in any issue.
- Generated Jest setup cannot load the ESM-only `@nestjs/testing` 12 and fails with `SyntaxError: Unexpected token 'export'`. PR #36937 author measured this in the Nx e2e suite on 2026-10-21.

## 5. `@nestjs/schematics` 12 and `@nx/nest`

`@nestjs/schematics` 12.0.12 exists on npm (2026-10-28). It peers on `typescript >=6.0.0` and `prettier ^3.0.0`.

`@nx/nest` 24.0.3 depends on `@nestjs/schematics ^11.0.0`. PR #36937 changes that to `>=11.0.0 <13.0.0`, so the workspace chooses the major. On master today, a pnpm `overrides` entry `"@nx/nest>@nestjs/schematics": "^12.0.0"` or an npm `overrides` entry `"@nestjs/schematics": "^12.0.0"` would force version 12 under `@nx/nest`. Nobody in the issues reported testing this. The wrapper calls the schematics through `@nx/devkit/ngcli-adapter`, which is a generic Angular devkit adapter, so version 12 is likely to load if TypeScript 6 is installed. This is not verified.

Nx 24 installs TypeScript 6 by default. `packages/js/src/utils/versions.ts` on master sets `typescriptVersion = '~6.0.3'` and `minSupportedTypescriptVersion = '5.8.0'`.

## 6. Maintainer timeline and open PRs

### PR nrwl/nx#36937 "feat(node): support NestJS 12" (opened 2026-09-07 by johnnyhuirilef, open)

State on 2026-11-02: review decision APPROVED, mergeable, all CI checks SUCCESS (`main-linux`, `main-macos`, CodeQL, Socket), assigned to leosvelperez (Nx team), no milestone, labels `type: bug`, `scope: node`. Last commits 2026-10-21. Last comment 2026-11-01 (gperdomor: "Can we merge this please?").

What it changes (from the PR diff):

- Peer range to `>=10.0.0 <13.0.0`. `@nestjs/schematics` dependency to `>=11.0.0 <13.0.0`.
- `versions.ts`: fresh installs get `^12.0.0`; major 11 gets its own map entry; major 10 keeps its entry.
- Default unit test runner becomes `vitest` when the workspace has NestJS 12. `--unitTestRunner=jest` with NestJS 12 fails on Node below 24.9 and otherwise installs Jest 30.5 and sets `NODE_OPTIONS=--experimental-vm-modules` on the test target.
- A new `ensureTypescriptForNestSchematics` upgrades `typescript` to the Nx default when `@nestjs/schematics` 12 is installed on TypeScript 5.
- A new optional migration `upgrade-to-nest-12` with version `24.1.0-beta.0`.
- The docs change says: "NestJS 12 requires Nx 24.1 or later." and "Starting with Nx 24.1, fresh installs default to NestJS v12."

So the PR author targets Nx 24.1. No maintainer has stated a date. The PR does not change the bundler. Generated NestJS 12 apps still use webpack with a CommonJS tsconfig.

AgentEnder on 2026-09-20: "Thanks for the PR, and for splitting the version bump out from the bundler work in #36881. Approving the workflow run so CI can build this, and assigning it." On #36913 AgentEnder said the two "should probably land in order."

marc-wilson asked on 2026-10-17 to put it on the 24.0 milestone. It did not ship in 24.0.0 (2026-10-21), 24.0.1, 24.0.2, or 24.0.3.

### PR nrwl/nx#36881 "feat(nest): let the application generator choose its bundler" (opened 2026-09-01 by johnnyhuirilef, open)

Reworked on 2026-10-21 after PR #37400 reorganized `@nx/node`. Current content: `@nx/nest:application` accepts `bundler` with `webpack` (default) or `rolldown`. `esbuild` and `tsc` with Nest log a warning and use webpack. `rspack` is no longer in this PR. CI on the 2026-10-21 head failed on one e2e test, which the author then fixed. No maintainer review of the new head. Not merged.

### PR nrwl/nx#35551 "feat(nest): infer Nest projects from nest-cli.json" (opened 2026-05-03 by vrxj81, open)

Changes requested twice by FrozenPandaz (June and July 2026). Rebased and ready since 2026-09-04. No review since. The author published the same design as the community plugin `@anarchitects/nest` (section 7).

### Issue nrwl/nx#35503

Priority low. FrozenPandaz endorsed the plugin direction in May 2026. No timeline.

### Summary of timeline

No Nx maintainer has stated a release date for NestJS 12 support. The only concrete target is the PR author's own choice of Nx 24.1 in the migration version and docs text. The PR is approved and green, and waits for a merge by leosvelperez.

## 7. Public repositories that run NestJS 12 inside Nx

Found through the GitHub code search API and verified by reading each repository's `package.json`, lockfile, `nx.json`, and project configuration on 2026-11-02.

### chaotic-cx/chaotic-next (pushed 2026-11-01)

- `nx 24.0.3`, `@nx/nest 24.0.1`, `@nx/rspack 24.0.1`, `@nestjs/core ^12.2.0`, `typescript 6.0.3`, `vitest ~5.0.4`, pnpm 12, root `"type": "module"`.
- Install: `.npmrc` with `strict-peer-dependencies=false` and `auto-install-peers=true`.
- `nx.json` plugins: `@nx/eslint/plugin`, `@nx/js/typescript`, `@nx/vite/plugin`, `@nx/vitest`. No webpack or rspack inference plugin.
- `backend/project.json`: `build` is `nx:run-commands` with `rspack build --node-env=development|production`, `cwd: backend`, `dependsOn: ["^build"]`, `outputs: dist/backend`. `serve` is `@nx/js:node` with `buildTarget: backend:build:development` and `dependsOn: ["build"]`. Tests run `vitest` through `nx:run-commands`.
- `backend/rspack.config.mjs`: `NxAppRspackPlugin({ target: 'node', main: './src/main.ts', tsConfig: './tsconfig.app.json' })`, `output.module: true`, `experiments.outputModule: true`, a custom plugin that sets the swc loader to `module.type: 'es6'`, a minimizer with `keep_classnames` and `keep_fnames`, and an `afterEmit` hook that writes `"type": "module"` into the generated `dist/package.json`. This is an ESM NestJS 12 build with rspack.
- `backend/nest-cli.json` exists with `"plugins": ["@nestjs/swagger"]`, but the Nest CLI is not on the build path.
- `backend/tsconfig.app.json`: `emitDecoratorMetadata: true`, `target: esnext`.

### ZenSoftware/zen (pushed 2026-10-31)

- `nx 24.0.0`, `@nx/nest 24.0.0`, `@nx/node 24.0.0`, `@nx/webpack 24.0.0`, `@nestjs/core ^12.2.0`, `@nestjs/schematics ^12.0.10`, `typescript ^6.0.3`, `vitest ^4.1.12`, `webpack-cli ^7.2.3`, pnpm.
- Install: `.npmrc` with `strict-peer-dependencies=false` and `auto-install-peers=true`.
- `nx.json` plugins include `@nx/webpack/plugin` and `@nx/vitest`.
- `apps/api/project.json`: `build` is `nx:run-commands` with `command: webpack-cli build`, `args: ["node-env=production"]`, a `development` configuration. `serve` is `@nx/js:node`, `continuous: true`, `buildTarget: api:build`, `dependsOn: ["build"]`. `prune-lockfile` and `copy-workspace-modules` from `@nx/js` prepare the Docker output.
- `apps/api/webpack.config.js`: `NxAppWebpackPlugin({ target: 'node', compiler: 'tsc', main: './src/main.ts', tsConfig: './tsconfig.app.json', generatePackageJson: true })`.
- `apps/api/tsconfig.app.json`: `module: commonjs`, `moduleResolution: bundler`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`. This is a CommonJS app on NestJS 12 through `require(esm)`.

### hsimpson/dmx-light-control (pushed 2026-11-02)

- `nx ^24.0.1`, `@nx/nest 24.0.1`, `@nx/node 24.0.1`, `@nx/rspack 24.0.1`, `@nestjs/core ^12.2.0`, `@nestjs/schematics ^12.0.10`, `typescript ^6.0.3`, `vitest ~5.0.5`, pnpm 12.17, Node 26.13, root `"type": "module"`.
- Install: no `.npmrc`. pnpm defaults (`strictPeerDependencies: false`).
- `nx.json` plugins include `@nx/rspack/plugin`, so `build` is inferred from `apps/backend/rspack.config.cjs`.
- `apps/backend/rspack.config.cjs`: `NxAppRspackPlugin({ target: 'node', compiler: 'tsc', main: './src/main.ts', tsConfig: './tsconfig.app.json', generatePackageJson: true, outputFileName: 'main.js', cache: false })` with the comment "Nx 23.2 defaults cache to true; Rspack 2 treats that as persistent cache and crashes."
- `apps/backend/project.json`: `serve` is `@nx/js:node`, `continuous: true`, `buildTarget: backend:build`, `watch: true`.
- `apps/backend/tsconfig.app.json`: `module: commonjs`, `emitDecoratorMetadata: true`, `experimentalDecorators: true`. CommonJS app.

### dereekb/dbx-components (pushed 2026-11-03)

- `nx 23.2.0`, no `@nx/nest`, `@nx/node 23.2.0`, `@nx/esbuild 23.2.0`, `@nestjs/core ^12.0.1`, `@nestjs/schematics 12.0.0`, `typescript 6.0.3`, `vitest 4.1.11`, npm, Node >=24.
- `apps/demo-api/project.json`: `build-base` is `@nx/esbuild:esbuild` with `platform: node`, `target: node24`, `format: ["esm"]`, `bundle: true`, `thirdParty: false`, `generatePackageJson: true`. `serve` is `nx:run-commands` and `continuous: true` with a `build-watch` dependency.
- `tsconfig.base.json`: `experimentalDecorators: true`, no `emitDecoratorMetadata`. The repository ships an ESLint rule `require-inject` that requires `@Inject()`, `@Optional()`, `@Self()`, `@SkipSelf()`, or `@Host()` on every constructor parameter of `@Injectable`, `@Controller`, and `@Resolver` classes. Their upgrade notes say `emitDecoratorMetadata` was removed from `tsconfig.base.json` in v13.1.0. This is the esbuild path made to work by removing the dependency on decorator metadata.

### ever-co/ever-gauzy (pushed 2026-11-02)

- `nx 23.3.0`, `@nx/nest 23.3.0`, `@nx/webpack 23.3.0`, `@nestjs/core ^12.1.3`, `jest 30.5.2`, `typescript ~6.0.3`, Yarn 1.22, Node >=26.
- `apps/api/project.json`: `build` is the `@nx/webpack:webpack` executor (still present in Nx 23) with `compiler: swc`, `target: node`. `serve` is `@nx/js:node`. This wiring needs a rewrite before Nx 24, because Nx 24 removed that executor.

### iqb-berlin/coding-box (pushed 2026-11-02, default branch `develop`)

- `nx 22.7.12`, `@nx/nest 22.7.12`, `@nx/webpack 22.7.12`, `@nestjs/core ^12.3.2`, `jest 30.5.2`, `typescript 5.9.3`, npm, Node >=24.22.1.
- `apps/backend/project.json`: `build` is `@nx/webpack:webpack` with `compiler: tsc`, `target: node`, `generatePackageJson: true`, and a `webpack.config.js` that uses `composePlugins(withNx())`. `serve` is `@nx/js:node`. Both the executor and the config helpers are removed in Nx 24.
- `tsconfig.app.json`: `module: node20`, `moduleResolution: node16`, `emitDecoratorMetadata: true`.

### anarchitects/anarchitecture-plugins (pushed 2026-10-25) and the `@anarchitects/nest` plugin

- The npm package `@anarchitects/nest` 0.1.0 (2026-10-25) by vrxj81, the author of PR #35551. Peers: `nx >=23.2.0 <25`, `@nx/devkit >=23.2.0 <25`, `@nestjs/cli >=12.0.0 <13`. Depends on `@nestjs/schematics 12.0.6` and `typescript >=6.0.0 <7`.
- README: "Nest owns framework configuration, compilation, startup, and scaffolding. Nx owns workspace integration, the project graph, task orchestration, and caching." It discovers `nest-cli.json`, infers a cacheable `build` target that runs `nest build` and a continuous `start` target that runs `nest start`. Build outputs follow the effective TypeScript `outDir`. It has `application`, `library`, `resource`, and `configuration` generators. "The runtime contract is NestJS 12 only." Verification baselines: Nx 23.2.0 and 24.0.1, Nest CLI 12.0.0, Nest 12.1.2, TypeScript 6.0.3.
- Its e2e package pins `nx 24.0.1`, `@nestjs/core 12.1.2`, `@nestjs/cli 12.0.0`, `@rspack/core 2.1.10`, `vitest 4.1.11`.
- Found in no third-party repository on GitHub (code search returned only the author's own repositories).

## 8. Viable paths and their cost

Facts only. No choice.

### Path A: install `@nx/nest` 24 past the peer range, write the build wiring by hand

How: pnpm with default settings, or pnpm `overrides` with `:peer`, or npm `--legacy-peer-deps`, or Yarn. Then write `project.json` targets as in ZenSoftware/zen (webpack, CommonJS, `nx:run-commands` + `webpack-cli build`, `@nx/js:node` serve) or chaotic-cx/chaotic-next (rspack, ESM, `nx:run-commands` + `rspack build`, `@nx/js:node` serve) or hsimpson/dmx-light-control (`@nx/rspack/plugin` inferred build, `@nx/js:node` serve).

Cost:

- Do not run `nx g @nx/nest:application`. It writes NestJS 11 versions and, on npm, breaks `nx.json`. Write the app files, tsconfig, and bundler config by hand, or copy them from one of the three repositories.
- The schematic wrappers run `@nestjs/schematics` 11. Use `nest generate` from `@nestjs/cli` 12 instead, or force schematics 12 with a package manager override (unverified).
- Proxy to the React app: write `proxy.conf.json` and the `dependsOn` entry by hand. It is a few JSON lines.
- Tests: Vitest. Jest needs Node 24.9+ and `--experimental-vm-modules`.
- When PR #36937 ships (author targets Nx 24.1), remove the override. Generated apps will still be webpack and CommonJS.

### Path B: no `@nx/nest`, `@nx/node` plus a bundler that emits decorator metadata

How: `@nx/node:application --framework=none` cannot be used for Nest scaffolding, so write the app by hand. Build with `@nx/rspack/plugin` (SWC, metadata works, ESM or CommonJS), or `@nx/js:tsc` / `@nx/js:swc` executors (no bundle, metadata works), or `nx:run-commands` with `webpack-cli` and `NxAppWebpackPlugin`. Serve with `@nx/js:node` on the build output.

Cost:

- Same hand-written wiring as path A, minus the install override.
- No Nest generators from Nx. Use `@nestjs/cli` 12 (`nest generate`), which needs Node 22.22.3+, 24.15+, or 26+ for schematics.
- Do not use the Nx 24 default serve (`node --watch src/main.ts`). Node type stripping rejects decorators. Do not use `tsx` or `@nx/esbuild:esbuild` unless every constructor parameter carries an explicit `@Inject()` token, as dereekb/dbx-components enforces with a lint rule.
- `@nx/node --frontendProject` is not available without running the generator. Write `proxy.conf.json` by hand.

### Path C: Nest CLI as the build tool, Nx as the task runner

How: a normal `nest-cli.json` project inside the workspace. `build` target: `nx:run-commands` with `nest build` (tsc default, or `--builder swc` or `--builder rspack`), `cache: true`, `outputs` set to the Nest `outDir`. `serve` target: `nx:run-commands` with `nest start --watch` and `continuous: true`. This is the shape that PR #35551 and `@anarchitects/nest` automate.

Cost:

- No Nx bundler plugin involvement. `generatePackageJson` and `prune-lockfile` from `@nx/js` need a `buildTarget` with a known output; `@nx/js:prune-lockfile` takes `buildTarget` and works with any target that produces `dist`. Not verified with `nest build` output in any source read here.
- ESM app: must use `--builder rspack` or `tsc` or `swc`. The Nest webpack compiler refuses ESM projects.
- Inputs and outputs for caching are written by hand.
- `@nestjs/cli` 12 needs Node 22.22.3+, 24.15+, or 26+.
- Proxy to the React app: hand-written `proxy.conf.json`.

### Path D: the community plugin `@anarchitects/nest`

How: `nx add @anarchitects/nest` with `@nestjs/cli@^12` installed. It infers `build` (`nest build`) and `start` (`nest start`) from `nest-cli.json` and provides NestJS 12 generators.

Cost:

- Version 0.1.0, published 2026-10-25, one author, no third-party users found on GitHub. Verified by the author on Nx 23.2.0 and 24.0.1.
- It is the external incubator of PR #35551, so its future depends on that PR or on the author's maintenance.
- Same Nest CLI Node version floor as path C.

### Path E: wait for Nx 24.1 with PR #36937

Cost:

- No date from a maintainer. The PR is approved and green since 2026-10-21 and not merged on 2026-11-02.
- After it lands, generated NestJS 12 apps still use webpack and a CommonJS tsconfig. ESM apps still need PR #36881 (rolldown) or hand-written rspack wiring.
- Default test runner becomes Vitest.

### Facts common to every path

- A CommonJS NestJS 12 app works on Nx 24 through `require(esm)` with tsc or SWC. The three Nx 24 repositories prove this.
- An ESM NestJS 12 app on Nx 24 works with rspack and `output.module: true` (chaotic-cx/chaotic-next). No read source shows an ESM NestJS 12 app on Nx 24 with webpack.
- NestJS 12.2.0 and later export `./package.json`, which removes the `generatePackageJson` peer loss from issue #37388. Pin NestJS 12.2.0 or later.
- TypeScript 6 is the Nx 24 default and the `@nestjs/schematics` 12 requirement.
