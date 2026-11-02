# Research: one image for SQLite and PostgreSQL on Docker and Kubernetes

Ticket: https://github.com/the-dev-abides/grocy-next/issues/10
Date: 2026-11-01

## Question

How does one image serve SQLite and PostgreSQL users with no extra setup on
Docker, Compose, Portainer, and k3s or Kubernetes? Report, with primary
sources: how Grocy, Mealie, and Immich ship their images and Compose files,
Helm chart against plain manifests, image publishing on GitHub Container
Registry, and semantic release tooling with versions from `npm view`.

## Summary

One image can serve both engines. The image contains both database drivers.
One environment variable selects the engine. SQLite is the default and needs
no variable. The process runs the schema migrations at every start. Mealie
uses this exact pattern with `DB_ENGINE`, and its image creates the SQLite
file at first start with no setup.

Grocy ships no image. The LinuxServer.io image is a third-party image for a
SQLite-only app. Immich is PostgreSQL-only, needs a database extension, and
ships a four-service Compose file plus an official Helm chart. Mealie ships
one Compose file for SQLite and one for PostgreSQL.

For Kubernetes, a Kustomize base with two overlays costs the least and needs
no extra tool. A Helm chart costs the most but is the only option that
Portainer and the k3s HelmChart controller install directly. SQLite on
Kubernetes needs one replica, the `Recreate` strategy, and a local volume.

The standard GitHub Actions workflow publishes a multi-arch image to GHCR with
the five Docker actions. For releases, semantic-release fits a squash-merge
repo with one container image. The exact versions are in section 6.

## Findings

### 1. How one image serves both engines

**Both drivers in one image.** TypeORM selects the engine with the `type`
option of the DataSource. The accepted values include `postgres` and
`better-sqlite3` ([TypeORM data source options][typeorm-dso]). TypeORM 1.0
dropped the `sqlite3` package. The release notes state: "SQLite: `sqlite3`
dropped, `better-sqlite3` is the default" ([TypeORM 1.0 release
notes][typeorm-rn]). TypeORM 1.0 needs Node.js 20 or later ([TypeORM upgrade
guide][typeorm-up]). The PostgreSQL driver is the `pg` package ([TypeORM
Postgres driver][typeorm-pg]). The SQLite `database` option is a file path
([TypeORM SQLite driver][typeorm-sqlite]).

**Native binary.** `better-sqlite3` is a native Node.js addon. The README
states: "Prebuilt binaries are available for major platforms/architectures"
([better-sqlite3 README][bs3-readme]). The npm package 13.0.3 ships these
prebuilt files inside the tarball: `linux-x64`, `linux-arm64`,
`linuxmusl-x64`, `linuxmusl-arm64`, `darwin-x64`, `darwin-arm64`,
`win32-x64`, `win32-arm64`. This is the output of `npm pack
better-sqlite3@13.0.3 --dry-run` on 2026-11-01. The package needs Node.js 22
or later (`engines` field in [package.json][bs3-pkg]). The image build needs
no compiler on Debian or Alpine for amd64 and arm64.

**Default engine.** When the engine variable is not set, the application
opens a SQLite file inside a mounted volume. A user who wants PostgreSQL sets
the engine variable and the connection variables. SQLite creates the file
when it does not exist: "The database is opened for reading and writing, and
is created if it does not already exist" ([sqlite3_open][sqlite-open]).

**Migrations at start.** TypeORM has a `migrationsRun` option: "Indicates if
migrations should be auto-run on every application launch" ([TypeORM data
source options][typeorm-dso]). The `synchronize` option creates the schema
from the entities. The docs warn: "it is unsafe to use `synchronize: true`
for schema synchronization on production" ([TypeORM migrations:
why][typeorm-why]). The migration API uses `QueryRunner` methods such as
`createTable`, `addColumn`, and `createForeignKey` ([TypeORM migration
API][typeorm-api]). These methods work on both engines. A migration with raw
SQL must use SQL that both engines accept, or branch on the driver type. The
CI must run the migrations against both engines.

**SQLite needs one writer on one local disk.** The SQLite project states:
"only one process can be making changes to the database at any moment"
([SQLite FAQ, question 5][sqlite-faq]). It also states: "some filesystems
contain bugs in their locking logic such that the locks do not always behave
as advertised. This is especially true of network filesystems and NFS in
particular" ([How To Corrupt An SQLite Database File, section
2.1][sqlite-corrupt]). The SQLite deployment runs one replica with a local
volume. Section 4 gives the Kubernetes consequence.

**Node base image.** The Node.js project lists v22, v24, and v26 as LTS lines
([Node.js previous releases][node-releases]). The official `node` image has
Debian, `slim`, and `alpine` variants for amd64 and arm64v8. The page warns
that Alpine "does use musl libc instead of glibc and friends, so software will
often run into issues depending on the depth of their libc
requirements/assumptions" ([Docker Hub node image][node-hub]).
`better-sqlite3` ships `linuxmusl` prebuilds, so Alpine works for this
dependency. The `slim` variant avoids the musl risk at a larger size.

**Compose: defaults and optional services.** Compose interpolation
`${VAR:-default}` gives a default when the variable is unset or empty
([Compose interpolation][compose-interp]). Compose reads an `.env` file next
to `compose.yaml`. A shell variable overrides the file ([Compose variable
interpolation][compose-env]). Compose profiles start a service only when the
user activates the profile: "Services without a `profiles` attribute are
always enabled". The user activates a profile with `--profile` or
`COMPOSE_PROFILES` ([Compose profiles][compose-profiles]). The Portainer docs
do not state whether a stack can activate a profile. I did not verify this.
Two Compose files, as Mealie ships, avoid the question.

Package versions from `npm view <name> version` on 2026-11-01:

| Package | Version |
| --- | --- |
| typeorm | 1.1.2 |
| @nestjs/typeorm | 12.0.2 |
| better-sqlite3 | 13.0.3 |
| pg | 8.23.1 |
| drizzle-orm | 0.45.4 |
| kysely | 0.29.8 |
| @prisma/client | 7.10.1 |

### 2. How Grocy, Mealie, and Immich ship

**Mealie.** The image is `ghcr.io/mealie-recipes/mealie` on GHCR and
`hkotel/mealie` on Docker Hub. The publish workflow builds
`linux/amd64,linux/arm64` ([publish.yml][mealie-publish]). The release
workflow runs on a published GitHub release and pushes the release tag and
`latest` ([release.yml][mealie-release]). A nightly workflow pushes `nightly`
([nightly.yml][mealie-nightly]). The `DB_ENGINE` variable has the default
`sqlite` and accepts `sqlite` or `postgres` ([backend
config][mealie-config]). An other value raises `DB_ENGINE must be 'sqlite' or
'postgres'`. The SQLite file is `{data_dir}/mealie.db`
([db_providers.py][mealie-providers]). The entrypoint sets the user and group,
loads `*_FILE` secrets, and starts the app ([entry.sh][mealie-entry]). The
app startup calls `init_db.main()` ([app.py][mealie-app]). That function runs
`command.upgrade(alembic_cfg, "head")` when the schema is not at head,
creates `pg_trgm` on PostgreSQL, and seeds the first user when no user exists
([init_db.py][mealie-initdb]). The SQLite Compose file has one service, one
volume `mealie-data:/app/data/`, and no database variable ([SQLite
Compose][mealie-sqlite]). The PostgreSQL Compose file has two services and
sets `DB_ENGINE: postgres`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_SERVER`, `POSTGRES_PORT`, and `POSTGRES_DB` ([PostgreSQL
Compose][mealie-postgres]). The Dockerfile builds with `node:24` and runs on
`python:3.14-slim` ([Dockerfile][mealie-dockerfile]). Mealie ships no Helm
chart. TrueCharts has a community chart ([TrueCharts mealie][truecharts]).

**Immich.** The images are `ghcr.io/immich-app/immich-server` and
`ghcr.io/immich-app/immich-machine-learning`. Tags are `release`, `vX.Y.Z`,
the major version, `-rc`, `pr-N`, and `commit-<sha>`
([docker.yml][immich-docker]). Immich needs PostgreSQL 14 to 19 with the
VectorChord extension. The server refuses to start without it. Immich 3.0
dropped pgvecto.rs ([Immich standalone Postgres][immich-pg]). The Compose
file is a release asset with four services: server, machine learning, Valkey,
and `ghcr.io/immich-app/postgres` ([docker-compose.yml][immich-compose];
[Immich Compose install][immich-install]). The user sets `UPLOAD_LOCATION` and
`DB_PASSWORD` in `.env` ([example.env][immich-env]). The official Helm chart
installs from `oci://ghcr.io/immich-app/immich-charts/immich`. It bundles no
PostgreSQL: "You need to deploy a suitable postgres instance with the
vectorchord extension yourself" ([immich-charts][immich-charts]). The build
runs one runner per architecture and merges the manifests with
`docker buildx imagetools create` ([multi-runner-build.yml][immich-build]).

**Grocy.** The project ships no image. The `grocy/grocy` repo has no
Dockerfile, Compose file, or chart ([grocy/grocy][grocy-repo]). The org repo
`grocy-docker` is archived with the note "Use the LinuxServer.io image
instead" ([grocy-docker][grocy-docker]). The de-facto image is
`lscr.io/linuxserver/grocy` with `amd64` and `arm64v8` tags
([linuxserver/docker-grocy][lsio-grocy]). Grocy opens
`GROCY_DATAPATH/grocy.db` with PDO SQLite
([DatabaseService.php][grocy-dbservice]). The root route runs
`MigrateDatabase()`, which applies every unrecorded migration file
([SystemController.php][grocy-sysctl];
[DatabaseMigrationService.php][grocy-migrate]). The LinuxServer Compose
example has one service, volume `/config`, and `PUID`, `PGID`, `TZ`
([linuxserver/docker-grocy][lsio-grocy]). The Dockerfile uses
`ghcr.io/linuxserver/baseimage-alpine-nginx` and downloads the Grocy release
tarball ([LinuxServer Dockerfile][lsio-dockerfile]).

| Project | Own image | Registry | Engines | Compose services | Chart |
| --- | --- | --- | --- | --- | --- |
| Grocy | No, LinuxServer.io | lscr.io, Docker Hub, GHCR | SQLite | 1 | None |
| Mealie | Yes | GHCR, Docker Hub | SQLite, PostgreSQL | 1 or 2 | Community |
| Immich | Yes | GHCR, Docker Hub mirror | PostgreSQL | 4 | Official, OCI |

### 3. Helm chart against plain manifests

**Helm.** A chart is "a collection of files that describe a related set of
Kubernetes resources" with `Chart.yaml`, `values.yaml`, and `templates/`
([Helm charts][helm-charts]). The user runs `helm install`, `helm upgrade`,
and `helm rollback`. Values come from `-f` or `--set` ([Using
Helm][helm-using]). OCI registry support became stable in Helm 3.8.0 ([Helm
3.8.0 release][helm-380]). The project pushes a chart with `helm push
chart.tgz oci://ghcr.io/OWNER/charts`. The user installs with `helm install
name oci://ghcr.io/OWNER/charts/app --version X` ([Helm
registries][helm-reg]).

**Plain manifests.** `kubectl apply -f` takes files, directories, or URLs.
`kubectl apply -k` applies a directory with `kustomization.yaml`. The two
flags do not combine ([kubectl apply][k8s-apply]). Kustomize is built into
kubectl since 1.14 ([Kustomize task][k8s-kust]). A base lists `resources`. An
overlay references the base and patches it. The `images` field changes the
image name and tag ([kustomization reference][kust-ref]). Kustomize has no
conditionals. A SQLite or PostgreSQL switch needs two overlays.

**k3s.** k3s has a Helm controller with a `HelmChart` custom resource. The
fields include `repo`, `chart`, `version`, `targetNamespace`, and
`valuesContent` ([k3s Helm][k3s-helm]). Any file in
`/var/lib/rancher/k3s/server/manifests` deploys at start and on change
([k3s packaged components][k3s-pkg]). k3s ships the Local Path Provisioner as
the default storage class `local-path` with `volumeBindingMode:
WaitForFirstConsumer`. A local-path volume binds the pod to one node ([k3s
storage][k3s-storage]; [local-storage.yaml][k3s-localyaml]).

**Portainer.** On Docker, a stack comes from the web editor, an upload, a Git
repository, or a custom template. The `env_file: stack.env` form works on
standalone Docker but not on Swarm ([Portainer add stack][port-stack]).
Portainer does not run `build` steps in a Compose file on remote
environments ([Portainer known issue][port-build]). On Kubernetes, Portainer
deploys a manifest from Git, the web editor, a URL, or a template ([Portainer
manifest][port-manifest]). It installs a Helm chart from a configured Helm
repository. OCI registries and Git-sourced charts need the Business Edition
([Portainer Helm][port-helm]). Portainer has no Kustomize support. The
request became a discussion in 2023 ([portainer issue 6368][port-kust]).

**SQLite persistence on Kubernetes.** A PersistentVolumeClaim "is a request
for storage by a user". `ReadWriteOnce` allows one node. `ReadWriteOncePod`
allows one pod ([Persistent volumes][k8s-pv]). The default deployment
strategy is `RollingUpdate`. With `Recreate`, "All existing Pods are killed
before new ones are created" ([Deployments][k8s-deploy]). The SQLite
deployment therefore has one replica, `strategy.type: Recreate`, and one
`ReadWriteOnce` claim on `local-path`.

**PostgreSQL on Kubernetes.** The options are the CloudNativePG operator
([cloudnative-pg][cnpg]), the Bitnami chart ([bitnami
postgresql][bitnami-chart]), or a plain StatefulSet with
`volumeClaimTemplates` ([StatefulSets][k8s-sts]). From 2025-08-28 the free
Bitnami catalog shrank to `latest`-only images. Versioned images moved to
`bitnamilegacy`, which "will receive no further updates or support" ([Bitnami
containers issue 83267][bitnami-change]). The project should not depend on
Bitnami images.

| | Helm chart | Plain manifests | Kustomize |
| --- | --- | --- | --- |
| Install | `helm install x oci://ghcr.io/org/charts/app` | `kubectl apply -f URL` | `kubectl apply -k dir` |
| Upgrade | `helm upgrade`, `helm rollback` | `kubectl apply -f` again | `kubectl apply -k` again |
| Parameters | values and templates with conditionals | none, edit YAML | overlays and patches, no conditionals |
| Extra tool | helm CLI, or none with k3s HelmChart | none | none |
| Portainer | yes, Helm repository | yes | no |
| k3s HelmChart controller | yes | no | no |
| Project maintenance | highest | lowest | medium |

### 4. Image publishing on GitHub Container Registry

The registry host is `ghcr.io`. The image name is
`ghcr.io/NAMESPACE/IMAGE:TAG`. New packages are private. Each layer has a 10
GB limit ([Working with the Container registry][ghcr-work]). The job needs
`permissions: packages: write`. The tutorial also grants `contents: read`,
`attestations: write`, and `id-token: write`, and pins the actions to a
commit SHA ([Publishing Docker images][ghcr-publish]). A package that a
workflow pushes with `GITHUB_TOKEN` links to the repository. A push from a
CLI needs the label `org.opencontainers.image.source` ([Connecting a
repository][ghcr-link]). A public package cannot become private again
([Package visibility][ghcr-vis]). Public packages are free. Private storage
starts at 500 MB on the Free plan ([Billing for GitHub
Packages][ghcr-billing]).

The standard workflow uses five Docker actions. The current major tags are:

| Action | Tag | Purpose |
| --- | --- | --- |
| docker/login-action | v4 | login to `ghcr.io` with `GITHUB_TOKEN` |
| docker/metadata-action | v6 | tags and labels from the git ref |
| docker/setup-qemu-action | v4 | emulation for other architectures |
| docker/setup-buildx-action | v4 | BuildKit builder |
| docker/build-push-action | v7 | build and push, `platforms`, cache |

Sources: [login-action][act-login], [metadata-action][act-meta],
[setup-qemu-action][act-qemu], [setup-buildx-action][act-buildx],
[build-push-action][act-build]. The Docker CI guide shows this sequence with
`platforms: linux/amd64,linux/arm64` ([Docker multi-platform CI][docker-ci]).
The GitHub Actions cache `type=gha` needs Buildx 0.21.0 and BuildKit 0.20.0
or later ([Docker cache in CI][docker-cache]).

The metadata-action maps a git tag `v1.2.3` to `1.2.3`, `1.2`, `1`, and
`latest` with `type=semver` patterns. `latest` comes from `flavor:
latest=auto`. A pre-release tag gets no `latest`. `type=sha` adds
`sha-<7 chars>` ([metadata-action][act-meta]).

QEMU emulation "can be much slower than native builds" ([Docker
multi-platform builds][docker-mp]). GitHub arm64 runners for public
repositories reached general availability on 2025-08-07 with the labels
`ubuntu-24.04-arm` and `ubuntu-22.04-arm` ([GitHub changelog
2025-08-07][gh-arm-ga]). Standard runners are free on public repositories
([GitHub-hosted runners][gh-runners]). Docker's reusable workflow
`docker/github-builder` builds one platform per runner and merges the
manifest ([Docker multi-platform CI][docker-ci]).

build-push-action adds provenance attestations by default on a registry
push. SBOM is off until `sbom: true` ([Docker attestations in
CI][docker-attest]). GitHub artifact attestation uses `actions/attest` with
`subject-name` and `subject-digest` ([Artifact attestations][gh-attest]).

A Helm chart publishes to GHCR as an OCI artifact: `helm registry login
ghcr.io`, `helm package`, then `helm push` ([helm registry
login][helm-login]; [Helm registries][helm-reg]).

One limit matters for release automation: "events triggered by the
`GITHUB_TOKEN` will not create a new workflow run" ([GITHUB_TOKEN
concept][gh-token]). A tag that a release tool pushes with `GITHUB_TOKEN`
does not start a separate image workflow. The image build must run in the
same job, or the release tool must use a different token.

### 5. Semantic release tooling

Versions from `npm view <name> version` on 2026-11-01:

| Package | Version |
| --- | --- |
| semantic-release | 25.0.9 |
| @semantic-release/changelog | 7.0.0 |
| @semantic-release/git | 11.0.1 |
| @semantic-release/github | 12.0.10 |
| @semantic-release/exec | 7.1.0 |
| @changesets/cli | 3.0.3 |
| release-please | 17.11.2 |
| @commitlint/cli | 21.2.4 |
| @commitlint/config-conventional | 21.2.4 |
| nx | 24.0.3 |

**Conventional Commits.** The format is `<type>[scope]: <description>`.
`fix` gives a patch, `feat` gives a minor, and a `BREAKING CHANGE:` footer or
`!` gives a major ([Conventional Commits 1.0.0][cc]). This repo squash-merges
and the PR title becomes the commit on `main` ([AGENTS.md][agents]). The PR
title must therefore be a conventional message. `@commitlint/cli` with
`@commitlint/config-conventional` can check it in CI.

**semantic-release.** It "uses the commit messages to determine the consumer
impact of changes" ([semantic-release][sr]). The commit analyzer maps
breaking to major, `feat` to minor, and `fix` or `perf` to patch
([commit-analyzer][sr-analyzer]). The default plugins are commit-analyzer,
release-notes-generator, npm, and github. The `main` branch is in the default
`branches` list ([semantic-release configuration][sr-config]). The github
plugin publishes a GitHub Release ([semantic-release/github][sr-github]). It
commits no version by default. The git plugin commits `CHANGELOG.md` and
`package.json`, and its README states "You likely do not need this plugin"
([semantic-release/git][sr-git]; [semantic-release/changelog][sr-changelog]).
The exec plugin runs shell commands with `${nextRelease.version}` in a
`publishCmd` ([semantic-release/exec][sr-exec]). The recommended GitHub
Actions job needs `contents: write`, `issues: write`, `pull-requests:
write`, `id-token: write`, and a checkout with `fetch-depth: 0`
([semantic-release GitHub Actions recipe][sr-gha]). It has no monorepo mode.

**changesets.** A changeset is a Markdown file in `.changeset/`. The tool
opens a "Version Packages" PR and publishes on merge. It is built "with a
focus on monorepos, keeping packages that rely on each other up to date"
([changesets][cs]; [changesets/action][cs-action]). It ignores commit
messages. Each PR needs a changeset file.

**release-please.** It parses Conventional Commits, keeps a Release PR open,
and on merge updates the changelog, tags, and creates a GitHub Release. The
README states "We highly recommend that you use squash-merges when merging
pull requests" ([release-please][rp]). The action outputs `release_created`,
`tag_name`, and `version` for later steps. The default `GITHUB_TOKEN` cannot
start CI on the Release PR ([release-please-action][rp-action]). Manifest
mode handles many packages ([manifest releaser][rp-manifest]).

**Nx release.** `nx release` versions, writes changelogs, and publishes
([Manage releases][nx-release]). `release.version.conventionalCommits:
true` in `nx.json` turns on commit parsing ([Nx conventional
commits][nx-cc]). `createRelease: "github"` creates a GitHub Release ([Nx
GitHub releases][nx-gh]).

| | semantic-release | changesets | release-please | nx release |
| --- | --- | --- | --- | --- |
| Version source | commits | changeset files | commits | commits, opt-in |
| Release PR | no | yes | yes | no |
| GitHub Release | default | action option | on merge | option |
| Changelog | plugin | yes | yes | yes |
| Monorepo | none | core design | manifest mode | built in |
| Fits squash-merge titles | yes | no | yes | yes |
| One image | exec `publishCmd` | custom script | step on `release_created` | step after release |

## Comparison of deployment paths

| Target | Artifact the project ships | User action | Extra setup for SQLite |
| --- | --- | --- | --- |
| Docker | one image | `docker run` with one volume | none |
| Compose | `compose.yaml` and `compose.postgres.yaml` | `docker compose up` | none |
| Portainer on Docker | the same Compose files | paste or Git URL as a stack | none |
| k3s or Kubernetes | Kustomize base with two overlays | `kubectl apply -k` | none |
| Portainer on Kubernetes | a rendered manifest from the Kustomize base | paste or Git URL | none |
| Helm | deferred | `helm install oci://...` | none |

## Recommendation

This is a proposal. The maintainer decides.

**Image.** Ship one multi-arch image, `linux/amd64` and `linux/arm64`, to
GHCR as `ghcr.io/the-dev-abides/grocy-next`. Use a Node 24 `slim` base. The
image contains `better-sqlite3` and `pg`. The variable `DB_ENGINE` selects
`sqlite` or `postgres`, with the default `sqlite` and the file at
`/data/grocy-next.db`. The process runs the TypeORM migrations at start and
then serves. This is the Mealie pattern, and Mealie proves it with the
largest install base of the three projects.

**Compose.** Ship two Compose files, as Mealie does: a one-service SQLite
file and a two-service PostgreSQL file. Two files work in Portainer without
profile flags. Publish a `v1.2.3`, `1.2`, `1`, and `latest` tag set with
metadata-action.

**Kubernetes.** Ship a Kustomize base with a `sqlite` overlay and a
`postgres` overlay in `deploy/kubernetes/`. The SQLite overlay sets one
replica, `strategy.type: Recreate`, and one `ReadWriteOnce` claim. Defer the
Helm chart to a later ticket. Add it when Portainer Kubernetes users or the
k3s HelmChart install ask for it.

**Release.** Use semantic-release with the default plugins plus
`@semantic-release/exec`. Run the image build and push in the same workflow
job after the version is known, because a tag pushed with `GITHUB_TOKEN`
starts no second workflow. Do not add `@semantic-release/git`. Check PR
titles with commitlint. The reason over release-please: no Release PR, and
the tag and GitHub Release are default behaviour. The reason over changesets:
changesets ignores commit messages and targets many npm packages. The reason
over `nx release`: it adds Nx-specific release config for one artifact. If
the maintainer wants a human-approved Release PR, release-please with
`release-type: simple` is the second choice.

**Not verified.** Whether Portainer activates a Compose profile when it
deploys a stack. Whether a community Helm chart for Grocy exists. The two
k3s doc pages for Helm and storage render with JavaScript, so the citations
point at the Markdown source in the k3s docs repo.

## Sources

[typeorm-dso]: https://github.com/typeorm/typeorm/blob/master/docs/docs/data-source/2-data-source-options.md
[typeorm-rn]: https://github.com/typeorm/typeorm/blob/master/docs/docs/releases/1.0/01-release-notes.md
[typeorm-up]: https://github.com/typeorm/typeorm/blob/master/docs/docs/releases/1.0/02-upgrading-from-0.3.md
[typeorm-pg]: https://typeorm.io/docs/drivers/postgres
[typeorm-sqlite]: https://typeorm.io/docs/drivers/sqlite
[typeorm-why]: https://github.com/typeorm/typeorm/blob/master/docs/docs/migrations/01-why.md
[typeorm-api]: https://github.com/typeorm/typeorm/blob/master/docs/docs/migrations/09-api.md
[bs3-readme]: https://github.com/WiseLibs/better-sqlite3/blob/master/README.md
[bs3-pkg]: https://github.com/WiseLibs/better-sqlite3/blob/master/package.json
[sqlite-open]: https://sqlite.org/c3ref/open.html
[sqlite-faq]: https://www.sqlite.org/faq.html#q5
[sqlite-corrupt]: https://www.sqlite.org/howtocorrupt.html
[node-releases]: https://nodejs.org/en/about/previous-releases
[node-hub]: https://hub.docker.com/_/node
[compose-profiles]: https://docs.docker.com/compose/how-tos/profiles/
[compose-interp]: https://docs.docker.com/reference/compose-file/interpolation/
[compose-env]: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
[mealie-publish]: https://github.com/mealie-recipes/mealie/blob/mealie-next/.github/workflows/publish.yml
[mealie-release]: https://github.com/mealie-recipes/mealie/blob/mealie-next/.github/workflows/release.yml
[mealie-nightly]: https://github.com/mealie-recipes/mealie/blob/mealie-next/.github/workflows/nightly.yml
[mealie-config]: https://github.com/mealie-recipes/mealie/blob/mealie-next/docs/docs/documentation/getting-started/installation/backend-config.md
[mealie-providers]: https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/core/settings/db_providers.py
[mealie-entry]: https://github.com/mealie-recipes/mealie/blob/mealie-next/docker/entry.sh
[mealie-app]: https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/app.py
[mealie-initdb]: https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/db/init_db.py
[mealie-sqlite]: https://github.com/mealie-recipes/mealie/blob/mealie-next/docs/docs/documentation/getting-started/installation/sqlite.md
[mealie-postgres]: https://github.com/mealie-recipes/mealie/blob/mealie-next/docs/docs/documentation/getting-started/installation/postgres.md
[mealie-dockerfile]: https://github.com/mealie-recipes/mealie/blob/mealie-next/docker/Dockerfile
[truecharts]: https://github.com/truecharts/charts/tree/master/charts/stable/mealie
[immich-docker]: https://github.com/immich-app/immich/blob/main/.github/workflows/docker.yml
[immich-pg]: https://docs.immich.app/administration/postgres-standalone
[immich-compose]: https://github.com/immich-app/immich/blob/main/docker/docker-compose.yml
[immich-install]: https://docs.immich.app/install/docker-compose
[immich-env]: https://github.com/immich-app/immich/blob/main/docker/example.env
[immich-charts]: https://github.com/immich-app/immich-charts
[immich-build]: https://github.com/immich-app/devtools/blob/main/.github/workflows/multi-runner-build.yml
[grocy-repo]: https://github.com/grocy/grocy
[grocy-docker]: https://github.com/grocy/grocy-docker
[lsio-grocy]: https://github.com/linuxserver/docker-grocy
[lsio-dockerfile]: https://github.com/linuxserver/docker-grocy/blob/master/Dockerfile
[grocy-dbservice]: https://github.com/grocy/grocy/blob/master/services/DatabaseService.php
[grocy-sysctl]: https://github.com/grocy/grocy/blob/master/controllers/SystemController.php
[grocy-migrate]: https://github.com/grocy/grocy/blob/master/services/DatabaseMigrationService.php
[helm-charts]: https://helm.sh/docs/topics/charts/
[helm-using]: https://helm.sh/docs/intro/using_helm/
[helm-380]: https://github.com/helm/helm/releases/tag/v3.8.0
[helm-reg]: https://helm.sh/docs/topics/registries/
[helm-login]: https://helm.sh/docs/helm/helm_registry_login/
[k8s-apply]: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
[k8s-kust]: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
[kust-ref]: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
[k3s-helm]: https://github.com/k3s-io/docs/blob/main/docs/add-ons/helm.md
[k3s-pkg]: https://docs.k3s.io/installation/packaged-components
[k3s-storage]: https://github.com/k3s-io/docs/blob/main/docs/add-ons/storage.md
[k3s-localyaml]: https://github.com/k3s-io/k3s/blob/master/manifests/local-storage.yaml
[port-stack]: https://docs.portainer.io/user/docker/stacks/add
[port-build]: https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail
[port-manifest]: https://docs.portainer.io/user/kubernetes/applications/manifest/create
[port-helm]: https://docs.portainer.io/user/kubernetes/applications/manifest/helm
[port-kust]: https://github.com/portainer/portainer/issues/6368
[k8s-pv]: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
[k8s-deploy]: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
[k8s-sts]: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
[cnpg]: https://github.com/cloudnative-pg/cloudnative-pg
[bitnami-chart]: https://github.com/bitnami/charts/tree/main/bitnami/postgresql
[bitnami-change]: https://github.com/bitnami/containers/issues/83267
[ghcr-work]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
[ghcr-publish]: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
[ghcr-link]: https://docs.github.com/en/packages/guides/connecting-a-repository-to-a-container-image
[ghcr-vis]: https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
[ghcr-billing]: https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-packages/about-billing-for-github-packages
[act-login]: https://github.com/docker/login-action
[act-meta]: https://github.com/docker/metadata-action
[act-qemu]: https://github.com/docker/setup-qemu-action
[act-buildx]: https://github.com/docker/setup-buildx-action
[act-build]: https://github.com/docker/build-push-action
[docker-ci]: https://docs.docker.com/build/ci/github-actions/multi-platform/
[docker-cache]: https://docs.docker.com/build/ci/github-actions/cache/
[docker-mp]: https://docs.docker.com/build/building/multi-platform/
[docker-attest]: https://docs.docker.com/build/ci/github-actions/attestations/
[gh-arm-ga]: https://github.blog/changelog/2025-08-07-arm64-hosted-runners-for-public-repositories-are-now-generally-available/
[gh-runners]: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
[gh-attest]: https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds
[gh-token]: https://docs.github.com/en/actions/concepts/security/github_token
[cc]: https://www.conventionalcommits.org/en/v1.0.0/
[agents]: https://github.com/the-dev-abides/grocy-next/blob/main/AGENTS.md
[sr]: https://semantic-release.gitbook.io/semantic-release
[sr-analyzer]: https://github.com/semantic-release/commit-analyzer
[sr-config]: https://semantic-release.gitbook.io/semantic-release/usage/configuration
[sr-github]: https://github.com/semantic-release/github
[sr-git]: https://github.com/semantic-release/git
[sr-changelog]: https://github.com/semantic-release/changelog
[sr-exec]: https://github.com/semantic-release/exec
[sr-gha]: https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions
[cs]: https://github.com/changesets/changesets
[cs-action]: https://github.com/changesets/action
[rp]: https://github.com/googleapis/release-please
[rp-action]: https://github.com/googleapis/release-please-action
[rp-manifest]: https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md
[nx-release]: https://nx.dev/docs/features/manage-releases
[nx-cc]: https://nx.dev/docs/guides/nx-release/automatically-version-with-conventional-commits
[nx-gh]: https://nx.dev/docs/kb/automate-github-releases
