# Development

This document lists the commands and the variables that a contributor needs.
Node 26 and pnpm are the prerequisites. `.nvmrc` holds the Node version.
Docker with the Compose plugin runs the developer stack.

## Commands

| Command                                                                                                 | What it does                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                                                                          | Installs the workspace.                                                                                                                                                                                                                                     |
| `cp .env.example .env`                                                                                  | Creates the environment file. With no edit, it points at the bundled instances.                                                                                                                                                                             |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres up -d --wait`   | Starts the bundled Grocy, Mealie, and PostgreSQL. The command returns when the health checks pass. Grocy listens on port 9283 with demo data and no login. Mealie listens on port 9925. The first Mealie login is `changeme@example.com` with `MyPassword`. |
| `docker compose -f compose.dev.yaml --profile grocy up -d --wait`                                       | Starts only the bundled Grocy. Name only the profiles that you need.                                                                                                                                                                                        |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres down`           | Stops the bundled instances. The data stays in the named volumes.                                                                                                                                                                                           |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres down --volumes` | Stops the bundled instances and removes their data. The next start has fresh data.                                                                                                                                                                          |
| `pnpm nx serve api`                                                                                     | Builds the API and runs it on port 3000. A change restarts it. The OpenAPI document is at `/api/v2/openapi.json`.                                                                                                                                           |
| `pnpm nx serve web`                                                                                     | Runs the web app on port 4200 with instant reload. It forwards `/api` to port 3000. The product list page shows the demo products of Grocy.                                                                                                                 |
| `pnpm nx run-many -t test`                                                                              | Runs the unit tests of every project.                                                                                                                                                                                                                       |
| `pnpm nx run-many -t lint typecheck`                                                                    | Runs the lint and the type check of every project.                                                                                                                                                                                                          |
| `pnpm nx format:write`                                                                                  | Formats every file. `pnpm nx format:check` reports and changes nothing.                                                                                                                                                                                     |
| `pnpm nx run-many -t build`                                                                             | Builds every project.                                                                                                                                                                                                                                       |

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
