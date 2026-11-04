#!/usr/bin/env bash
# This script calls the three health checks of a running API. It waits for the
# liveness check for up to 60 seconds, because the API listens only after the
# migrations have run. Then it calls the startup check and the readiness
# check one time each. A status other than 200 fails the script.
#
# The first argument is the base address of the API. The default is the
# address of a local start.
set -euo pipefail

base="${1:-http://localhost:3000}/api/v2/health"

for _ in $(seq 1 60); do
  if curl -fs -o /dev/null "$base/live"; then
    break
  fi
  sleep 1
done

for probe in live startup ready; do
  echo "== $probe"
  curl -fsS "$base/$probe"
  echo
done
