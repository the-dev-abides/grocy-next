---
status: accepted
---

# The repo checks

Almost all of the code in this repo is written by agents. An agent takes
the shortest path to a green check, and the shortest path is often a
comment that turns a rule off, a cast, or a looser configuration. Milestone 1
ran the "recommended" rule sets, with no rule that reads types, many rules
at "warn", no type check in CI, and nothing that stopped an `eslint-disable`
comment. We decided on the strictest set of checks that the chosen
frameworks allow, with no escape hatch inside the code, and a Claude Code
hook that stops an agent before it writes a bypass.

## The decision

- Every rule is an error. The lint runs with `--max-warnings 0`.
- No inline configuration. ESLint runs with `noInlineConfig: true`, so an
  `eslint-disable` comment has no effect and is reported. The
  `ban-ts-comment` rule bans `@ts-ignore`, `@ts-expect-error`, and
  `@ts-nocheck` with no exception. A rule changes only in the configuration
  file, in its own commit, with a comment that says why.
- One root `eslint.config.mjs` holds every rule, selected by file glob. Each
  project configuration is one identical form: import the root config and
  export it. A project cannot add or remove a rule.
- The base set is `typescript-eslint` `strict-type-checked` plus
  `stylistic-type-checked`, with the project service, so the rules read the
  types. The NX module boundary rule stays and also bans the framework
  packages of the other side: the web app cannot import NestJS, TypeORM, or
  axios, and the API and the libraries cannot import React.
- The frameworks that the ADRs chose get their strict plugin: React through
  `@eslint-react` and the React Compiler hooks rules, Tailwind through a
  class checker, Vitest, Playwright, and Testing Library. `unicorn`,
  `sonarjs`, and `perfectionist` add the opinion rules, so an agent has no
  style choice to make.
- The rules of the specs and the ADRs become lint errors: every Zod object
  schema is strict, no TypeORM Active Record, no mock and no call-count
  assertion in a test, no `enum`, no `console`, no `process.env` outside the
  option readers, no `any`, no non-null assertion, no `as` cast except
  `as const`, no default export outside the tool configuration files.
- Size limits on files and functions, and one naming rule with one
  exemption for the snake_case Grocy API shapes.
- The compiler gains every strictness flag that the frameworks allow.
  `erasableSyntaxOnly` is on for the web app only, because NestJS needs
  parameter properties and decorators.
- `knip` fails CI on an unused file, export, or dependency, and on a missing
  dependency.
- CI runs the lint, the type check, the format check, `knip`, and the tests
  as required jobs. A `lefthook` pre-commit hook runs the same checks on the
  staged projects.
- The shadcn/ui files that the generator writes meet the same rules. No
  folder is exempt.
- A Claude Code PreToolUse hook, a tested Node script in the workspace,
  rejects a write that contains a suppression comment, a write to a check
  configuration file, a project lint configuration that is not the identical
  form, and a shell command that bypasses a hook or a check. The hook is
  Claude Code only. Another agent tool gets the lint and the git hook as its
  box.
- The maintainer unlocks the configuration files with one constant at the
  top of the hook script, flipped by hand. The pre-commit hook refuses a
  commit of the script in the unlocked state.

Ticket [#107](https://github.com/the-dev-abides/grocy-next/issues/107)
holds the rule list, the plugin list, the limits, and the hook patterns.

## Considered options

- The NX "recommended" sets with a few rules added. Rejected: no rule reads
  types, and the type-aware rules catch the errors that matter most, such as
  a promise that nobody awaits.
- An `eslint-disable` comment with a required description. Rejected: an
  agent writes the description as readily as the comment. The config file
  is the one place for an exception, because a reviewer sees it in the
  diff.
- An environment variable as the unlock for the configuration files.
  Rejected: the maintainer did not want to set a variable at every start.
  A constant in the script is one edit, and the pre-commit hook keeps the
  unlocked state off `main`.
- An exemption for the shadcn/ui folder. Rejected: an exempt folder becomes
  the place where agents put things.
- `eslint-plugin-react` kept, with its ESLint 10 workaround. Rejected: the
  plugin does not support ESLint 10, and `@eslint-react` has a strict
  type-checked config.
- `unicorn/no-null` on. Rejected: ADR 0014 makes `null` the value of an
  unset field.
- `erasableSyntaxOnly` on every project. Rejected: NestJS needs parameter
  properties and decorators.

## Consequences

- Every pull request fights the rules before it fights the review. The
  review reads intent, not style.
- The milestone 1 code comes into line in the same pull request as the
  rules.
- A rule that blocks a framework feature is a defect of the rule list, and
  the fix is one commit to the root config with a comment.
- An agent that hits the hook must say what it wanted to do and why. The
  maintainer decides.
- A new library gets its lint configuration with no choice to make.

## Sources

- Ticket [#107](https://github.com/the-dev-abides/grocy-next/issues/107).
- ADR 0008 for the stack, ADR 0014 for the `null` rule, and the spec
  [#88](https://github.com/the-dev-abides/grocy-next/issues/88) for the
  Zod and test rules.
