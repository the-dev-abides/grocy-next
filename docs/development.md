# Development

This document lists the commands and the variables that a contributor needs.
Node 26 and pnpm are the prerequisites. `.nvmrc` holds the Node version.
Docker with the Compose plugin runs the developer stack.

## Commands

| Command                                                                                                 | What it does                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                                                                          | Installs the workspace and the `lefthook` pre-commit hook. The hook runs the lint, the type check, and the format check on the projects that the staged files touch.                                                                                           |
| `cp .env.example .env`                                                                                  | Creates the environment file. With no edit, it points at the bundled instances.                                                                                                                                                                                |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres up -d --wait`   | Starts the bundled Grocy, Mealie, and PostgreSQL. The command returns when the health checks pass. Grocy listens on port 9283 with demo data and no login. Mealie listens on port 9925. The first Mealie login is `changeme@example.com` with `MyPassword`.    |
| `docker compose -f compose.dev.yaml --profile grocy up -d --wait`                                       | Starts only the bundled Grocy. Name only the profiles that you need.                                                                                                                                                                                           |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres down`           | Stops the bundled instances. The data stays in the named volumes.                                                                                                                                                                                              |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres down --volumes` | Stops the bundled instances and removes their data. The next start has fresh data.                                                                                                                                                                             |
| `pnpm nx serve api`                                                                                     | Builds the API and runs it on port 3000. A change restarts it. The OpenAPI document is at `/api/v2/openapi.json`.                                                                                                                                              |
| `pnpm nx serve web`                                                                                     | Runs the web app on port 4200 with instant reload. It forwards `/api` to port 3000. The product list page shows the demo products of Grocy.                                                                                                                    |
| `pnpm nx run-many -t test`                                                                              | Runs the unit tests of every project.                                                                                                                                                                                                                          |
| `pnpm nx run-many -t lint typecheck`                                                                    | Runs the lint and the type check of every project.                                                                                                                                                                                                             |
| `pnpm nx format:write`                                                                                  | Formats every file. `pnpm nx format:check` reports and changes nothing.                                                                                                                                                                                        |
| `pnpm exec knip`                                                                                        | Reports an unused file, an unused export, an unused dependency, and a missing dependency. CI runs it.                                                                                                                                                          |
| `pnpm nx run-many -t lint -- --fix`                                                                     | Applies the lint fixes that have one safe form, such as the import order and the Tailwind class order.                                                                                                                                                         |
| `pnpm nx run-many -t build`                                                                             | Builds every project.                                                                                                                                                                                                                                          |
| `docker build -t ghcr.io/the-dev-abides/grocy-next:main .`                                              | Builds the container image on the local architecture. The tag is the one that the two Compose files pull, so `docker compose up` then uses the local build.                                                                                                    |
| `GROCY_URL=... GROCY_API_KEY=... docker compose up -d --wait`                                           | Starts the image on SQLite with `compose.yaml` on port 3000. `compose.postgres.yaml` starts the image and a PostgreSQL, and also needs `DB_PASSWORD`. Inside a container, `localhost` is the container. Give the address of Grocy as the container reaches it. |

## Variables

The API reads `.env` from the workspace root at start. A value in the shell
has priority over the file. `compose.dev.yaml` reads the `DB_*` values from
the same file, so the API and the bundled PostgreSQL agree.

| Variable        | Default in `.env.example` | What it sets                                                                                                                |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `DB_ENGINE`     | `sqlite`                  | The storage engine: `sqlite` or `postgres`. To use the bundled database, set `postgres`. Then start the `postgres` profile. |
| `DB_FILE`       | `./grocy-next.db`         | The SQLite file. The folder must exist. Git ignores `*.db`.                                                                 |
| `DB_HOST`       | `localhost`               | The PostgreSQL host.                                                                                                        |
| `DB_PORT`       | `5432`                    | The PostgreSQL port on the host. The bundled PostgreSQL publishes this port.                                                |
| `DB_NAME`       | `grocy-next`              | The PostgreSQL database. The bundled PostgreSQL creates it at the first start.                                              |
| `DB_USER`       | `grocy-next`              | The PostgreSQL user. The bundled PostgreSQL creates it at the first start.                                                  |
| `DB_PASSWORD`   | `grocy-next`              | The PostgreSQL password.                                                                                                    |
| `GROCY_URL`     | `http://localhost:9283`   | The address of the Grocy instance. Set your own address to use your own Grocy.                                              |
| `GROCY_API_KEY` | `demo`                    | An API key of the Grocy instance. The bundled Grocy accepts any value. Your own Grocy needs a real key.                     |

A change to a `DB_*` value after the first start of the bundled PostgreSQL
does not change the database. Remove the volumes and start again.

## Checks

ADR 0016 records the checks. Every rule is an error. No comment turns a rule
off. A rule changes only in the root `eslint.config.mjs`, in its own commit,
with a comment that says why. Each project `eslint.config.mjs` is one
re-export of the root configuration.

CI runs the lint with zero warnings, the type check, the format check,
`knip`, and the tests. The `lefthook` pre-commit hook runs the lint, the type
check, and the format check before each commit.

A Claude Code hook in `tools/checks/src/pre-tool-use.mjs` rejects a write
that contains a suppression comment, a write to a check configuration file,
a project lint configuration that is not the one re-export, and a shell
command that bypasses a hook or a check. To edit a check configuration file
with Claude Code, set `IS_UNLOCKED` at the top of the script to `true`, make the
change, and set it back to `false`. The pre-commit hook refuses a commit of
the script with the value `true`.
