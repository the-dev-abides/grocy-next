#!/usr/bin/env bash
# This script calls the three health checks of the API on port 3000. It waits
# for the liveness check for up to 60 seconds, because the API listens only
# after the migrations have run. Then it calls the startup check and the
# readiness check one time each. A status other than 200 fails the script.
#
# When `API_PID` holds the process id of the API, the script stops with a
# message as soon as that process is gone. When `API_CONTAINER` holds the name
# of the container that runs the API, the script stops with a message as soon
# as that container is not running. So a process or a container that exits at
# start fails the script at once, and not after the wait. When the liveness
# check does not answer within 60 seconds, the script stops with a message.
set -euo pipefail

base="http://localhost:3000/api/v2/health"

ready=false
for _ in $(seq 1 60); do
  if curl -fs -o /dev/null "$base/live"; then
    ready=true
    break
  fi
  if [[ -n "${API_PID:-}" ]] && ! kill -0 "$API_PID" 2>/dev/null; then
    echo "The API process $API_PID has exited." >&2
    exit 1
  fi
  if [[ -n "${API_CONTAINER:-}" ]] &&
    [[ "$(docker inspect -f '{{.State.Running}}' "$API_CONTAINER" 2>/dev/null)" != true ]]; then
    echo "The API container $API_CONTAINER is not running." >&2
    exit 1
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  echo "The liveness check did not answer within 60 seconds." >&2
  exit 1
fi

for probe in live startup ready; do
  echo "== $probe"
  curl -fsS "$base/$probe"
  echo
done
