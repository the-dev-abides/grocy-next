# Development

This document lists the commands and the variables that a contributor needs.
Node 26, pnpm, and the Imposter CLI are the prerequisites. `.nvmrc` holds the
Node version. Docker with the Compose plugin runs the developer stack.

## The Imposter CLI

Imposter is the one stand-in for Grocy and Open Food Facts in the tests, as
ADR 0015 decided. The API tests and the end-to-end tests start the two mocks
under `tools/mocks` through the Imposter CLI, so the CLI must be on the
`PATH`. The project files under `tools/mocks` pin the CLI version 1.13.0 and
the native engine version 5.21.3. The CLI downloads the engine into
`~/.imposter` on the first start. To install the CLI on Linux, run these
commands:

```sh
curl -sSfL -o /tmp/imposter-cli.tar.gz \
  https://github.com/imposter-project/imposter-cli/releases/download/v1.13.0/imposter-cli_linux_amd64.tar.gz
tar -xzf /tmp/imposter-cli.tar.gz -C ~/.local/bin imposter
imposter version
```

On macOS, `brew install imposter-project/imposter/imposter` installs the
current CLI. `tools/mocks/README.md` describes the two mocks and the fixture
household.

## Commands

| Command                                                                                                 | What it does                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                                                                          | Installs the workspace and the `lefthook` pre-commit hook. The hook runs the lint, the type check, and the format check on the projects that the staged files touch.                                                                                                       |
| `cp .env.example .env`                                                                                  | Creates the environment file. With no edit, it points at the bundled instances.                                                                                                                                                                                            |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres up -d --wait`   | Starts the bundled Grocy, Mealie, and PostgreSQL. The command returns when the health checks pass. Grocy listens on port 9283 with demo data and no login. Mealie listens on port 9925. The first Mealie login is `changeme@example.com` with `MyPassword`.                |
| `docker compose -f compose.dev.yaml --profile grocy up -d --wait`                                       | Starts only the bundled Grocy. Name only the profiles that you need.                                                                                                                                                                                                       |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres down`           | Stops the bundled instances. The data stays in the named volumes.                                                                                                                                                                                                          |
| `docker compose -f compose.dev.yaml --profile grocy --profile mealie --profile postgres down --volumes` | Stops the bundled instances and removes their data. The next start has fresh data.                                                                                                                                                                                         |
| `pnpm nx serve api`                                                                                     | Builds the API and runs it on port 3000. A change restarts it. The OpenAPI document is at `/api/v2/openapi.json`.                                                                                                                                                          |
| `pnpm nx serve web`                                                                                     | Runs the web app on port 4200 with instant reload. It forwards `/api` to port 3000. The product list page shows the demo products of Grocy.                                                                                                                                |
| `pnpm nx run-many -t test`                                                                              | Runs the unit tests of every project. The API tests start the two Imposter mocks and stop them after the run.                                                                                                                                                              |
| `pnpm exec playwright install --with-deps chromium`                                                     | Installs Chromium and its system packages for Playwright. `pnpm exec playwright install firefox webkit` adds the two other browsers.                                                                                                                                       |
| `pnpm nx e2e web-e2e`                                                                                   | Runs the end-to-end tests on Chromium, Firefox, and WebKit. Playwright starts the four processes of the test environment and stops them after the run. See the section below.                                                                                              |
| `pnpm nx e2e web-e2e -- --project=chromium`                                                             | Runs the end-to-end tests on Chromium only, as CI does.                                                                                                                                                                                                                    |
| `pnpm --filter @grocy-next/web-e2e camera-files`                                                        | Writes the four camera files of the end-to-end tests again, one per fixture code, with the ZXing writer and Chromium. See the section below.                                                                                                                               |
| `pnpm nx run-many -t lint typecheck`                                                                    | Runs the lint and the type check of every project.                                                                                                                                                                                                                         |
| `pnpm nx format:write`                                                                                  | Formats every file. `pnpm nx format:check` reports and changes nothing.                                                                                                                                                                                                    |
| `pnpm exec knip`                                                                                        | Reports an unused file, an unused export, an unused dependency, and a missing dependency. CI runs it.                                                                                                                                                                      |
| `pnpm nx run-many -t lint -- --fix`                                                                     | Applies the lint fixes that have one safe form, such as the import order and the Tailwind class order.                                                                                                                                                                     |
| `pnpm nx run api:openapi`                                                                               | Writes the OpenAPI document of the API to `apps/api/openapi.json` without a running server. The script creates the app on SQLite in memory, builds the document from the Zod schemas, and exits. The file is committed. Run it after a change to a controller or a schema. |
| `pnpm nx run-many -t build`                                                                             | Builds every project.                                                                                                                                                                                                                                                      |
| `docker build -t ghcr.io/the-dev-abides/grocy-next:main .`                                              | Builds the container image on the local architecture. The tag is the one that the two Compose files pull, so `docker compose up` then uses the local build.                                                                                                                |
| `GROCY_URL=... GROCY_API_KEY=... docker compose up -d --wait`                                           | Starts the image on SQLite with `compose.yaml` on port 3000. `compose.postgres.yaml` starts the image and a PostgreSQL, and also needs `DB_PASSWORD`. Inside a container, `localhost` is the container. Give the address of Grocy as the container reaches it.             |

## Variables

The API reads `.env` from the workspace root at start. A value in the shell
has priority over the file. `compose.dev.yaml` reads the `DB_*` values from
the same file, so the API and the bundled PostgreSQL agree.

| Variable         | Default in `.env.example`         | What it sets                                                                                                                |
| ---------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `DB_ENGINE`      | `sqlite`                          | The storage engine: `sqlite` or `postgres`. To use the bundled database, set `postgres`. Then start the `postgres` profile. |
| `DB_FILE`        | `./grocy-next.db`                 | The SQLite file. The folder must exist. Git ignores `*.db`.                                                                 |
| `DB_HOST`        | `localhost`                       | The PostgreSQL host.                                                                                                        |
| `DB_PORT`        | `5432`                            | The PostgreSQL port on the host. The bundled PostgreSQL publishes this port.                                                |
| `DB_NAME`        | `grocy-next`                      | The PostgreSQL database. The bundled PostgreSQL creates it at the first start.                                              |
| `DB_USER`        | `grocy-next`                      | The PostgreSQL user. The bundled PostgreSQL creates it at the first start.                                                  |
| `DB_PASSWORD`    | `grocy-next`                      | The PostgreSQL password.                                                                                                    |
| `GROCY_URL`      | `http://localhost:9283`           | The address of the Grocy instance. Set your own address to use your own Grocy.                                              |
| `GROCY_API_KEY`  | `demo`                            | An API key of the Grocy instance. The bundled Grocy accepts any value. Your own Grocy needs a real key.                     |
| `PORT`           | `3000`                            | The port that the API listens on.                                                                                           |
| `BARCODE_LOOKUP` | `on`                              | The online barcode lookup: `on` or `off`. Off means the server looks up no unknown code and the screens show the bare code. |
| `OPEN_FACTS_URL` | `https://world.openfoodfacts.org` | The base URL of the Open Facts service. The end-to-end tests and the API tests point it at the Open Food Facts mock.        |

A change to a `DB_*` value after the first start of the bundled PostgreSQL
does not change the database. Remove the volumes and start again.

The web dev server reads one variable of its own from the shell: `API_URL`,
the address that it forwards `/api` to. Unset means `http://localhost:3000`.

## The end-to-end tests

`pnpm nx e2e web-e2e` starts four processes, each on a port of its own, and
stops them after the run. Playwright never reuses a process that already
runs, so a test never touches the API on port 3000 or the web dev server on
port 4200. A port in use fails the run. Stop the process that holds the port
and run the tests again.

| Process                                        | Port  |
| ---------------------------------------------- | ----- |
| The Grocy mock on Imposter                     | 18080 |
| The Open Food Facts mock on Imposter           | 18081 |
| The API on a SQLite file in a temporary folder | 13000 |
| The web dev server                             | 14200 |

The API tests start the two mocks on ports 18082 and 18083, so the API tests
and the end-to-end tests can run at one time. The mocks hold no state. A
booking in the Grocy mock returns a fixed stock log row and changes nothing.

### The camera files

The camera tests run on Chromium only, with the Chromium fake camera, as ADR
0015 decided. The Chromium project runs them with three flags:
`--use-fake-ui-for-media-stream` grants the camera permission with no
prompt, `--use-fake-device-for-media-stream` offers a fake camera, and
`--use-file-for-fake-video-capture=<file>` plays a file as the camera
picture. The Firefox and WebKit projects leave the camera tests out.

The files are under `apps/web-e2e/src/camera`, one per fixture code. Each
file is one JPEG picture of the EAN-13 barcode, 640 by 360 pixels, with the
extension `.mjpeg`. Chromium accepts a `.y4m` file or a `.mjpeg` file for the
flag and refuses every other extension. It reads a file with one JPEG as a
one-frame MJPEG stream and loops it, so the barcode stays in view for the
whole test. The script `apps/web-e2e/src/camera/write-camera-files.ts`
writes the files again: the ZXing writer draws each barcode as SVG, and
Chromium renders it as a JPEG. Run it with
`pnpm --filter @grocy-next/web-e2e camera-files` after a change to the
fixture codes.

Headless Chromium on Linux has no native `BarcodeDetector`, so the camera
tests exercise the ZXing path in the Web Worker. The label on the camera
view in the test output names the decoder that ran.

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
