# syntax=docker/dockerfile:1

# One image for linux/amd64 and linux/arm64. The build stage installs the
# workspace, builds the web app and the API, and collects the production
# dependencies of the API. The final stage holds Node, the two builds, and
# those dependencies. Both database drivers are in the image. better-sqlite3
# has a prebuilt binary for each architecture, so no stage compiles code.
#
# Build:   docker build -t grocy-next .
# Run:     docker run -p 3000:3000 -v grocy-next-data:/data \
#            -e GROCY_URL=https://grocy.example.com -e GROCY_API_KEY=... grocy-next

FROM node:26-slim AS build

ENV NX_DAEMON=false
ENV CI=true
WORKDIR /app

# pnpm comes from the `packageManager` field of `package.json`. That field is
# the one pin of the pnpm version in the repo.
COPY package.json ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"

# The lockfile and the workspace file are enough to fetch every package. A
# source change does not repeat this step. The store is a cache mount, so a
# rebuild on the same machine downloads nothing.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store

COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --store-dir /pnpm/store

# The API build depends on the web build, so one target builds both.
RUN pnpm nx run-many -t build

# `pnpm deploy` writes the API package with only its production dependencies
# to one folder, with no symbolic link into the workspace.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @grocy-next/api deploy --prod --store-dir /pnpm/store /out

FROM node:26-slim

ENV NODE_ENV=production
WORKDIR /app

# The API bundle finds the web app build at `../../web/dist`, so the two
# builds keep the `apps/api` and `apps/web` layout of the workspace.
COPY --from=build /out/package.json apps/api/package.json
COPY --from=build /out/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist

# The process runs as the `node` user of the base image. `/data` holds the
# SQLite file. That user owns the folder, so a new named volume gets the
# same owner.
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data

EXPOSE 3000

# The readiness check of the API. The base image has no curl, so Node makes
# the request.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://localhost:3000/api/v2/health/ready').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "apps/api/dist/main.mjs"]
