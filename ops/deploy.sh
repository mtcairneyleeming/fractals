#!/usr/bin/env bash
# Builds the server and the frontend on this machine, tests them, copies them to the server as a new
# release, switches /srv/fractals/current to it and restarts rust-fractals. If the health check fails,
# the server switches back by itself. Keeps the 3 newest releases.
# Every server command is logged in ops/ssh-log.md. Nothing is built on the server.
#
#   ops/deploy.sh              deploy the working tree (a dirty tree gets "-dirty" in the release id)
#   ops/deploy.sh --dry-run    build, test and stage everything; print the server commands, run none
#   ops/deploy.sh --rollback   switch back to the previous release
#   ops/deploy.sh --status     what is deployed and whether it is healthy
set -euo pipefail
cd "$(dirname "$0")/.."

host=${FRACTALS_HOST:-hetzner}
dest=/srv/fractals
# Give up on a dead connection after about a minute rather than hanging.
ssh_opts=(-o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)

dry=0
mode=deploy
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry=1 ;;
    --rollback) mode=rollback ;;
    --status) mode=status ;;
    *) echo "usage: ops/deploy.sh [--dry-run] [--rollback | --status]"; exit 2 ;;
  esac
done

# Runs a server command through the log, or just prints it with --dry-run.
run() {
  if [ "$dry" = 1 ]; then
    printf '[dry-run] %s:' "$1"; shift; printf ' %q' "$@"; printf '\n'
  else
    ops/logged.sh "$@"
  fi
}
remote() { # remote "<why>" <command> [args]: run ops/remote.sh on the server
  local why=$1
  shift
  if [ "$dry" = 1 ]; then
    printf '[dry-run] %s: ssh %s bash -s -- %s < ops/remote.sh\n' "$why" "$host" "$*"
  else
    ops/logged.sh "$why" ssh "${ssh_opts[@]}" "$host" bash -s -- "$@" < ops/remote.sh
  fi
}

if [ "$mode" = status ]; then
  remote "Status: what is deployed" status
  exit
fi
if [ "$mode" = rollback ]; then
  remote "Rollback: switch to the previous release" rollback
  exit
fi

# --- Build ---------------------------------------------------------------------------------------
sha=$(git rev-parse HEAD)
short=$(git rev-parse --short HEAD)
dirty=no
suffix=""
if [ -n "$(git status --porcelain)" ]; then
  dirty=yes
  suffix="-dirty"
  echo "WARNING: the working tree has uncommitted changes. Deploying anyway; the release will be marked -dirty." >&2
fi
id="$(date +%Y%m%d-%H%M%S)-$short$suffix"
echo "Release: $id"

(cd server && cargo test --locked)
(cd server && cargo build --release --locked)
(cd web && npm ci && npm run check && npm run build)

# --- Stage the release locally -------------------------------------------------------------------
stage=ops/.stage
rm -rf "$stage"
mkdir -p "$stage/web"
# Debug info is 80 MB; keep the symbol names (for backtraces) and drop the rest.
strip --strip-debug -o "$stage/server" server/target/release/server
cp -r web/dist/. "$stage/web/"
# One real API call for the server's health check: a small prism, in the frontend's wire format.
(cd web && node --input-type=module -e '
  import { encode } from "@msgpack/msgpack"
  import fs from "node:fs"
  const tri = (z) => [[0, 0, z, 10, 0, z], [10, 0, z, 5, 8, z], [5, 8, z, 0, 0, z]]
  fs.writeFileSync(process.argv[1], encode([[tri(0), tri(4)], [0, []]]))
' "../$stage/healthcheck.msgpack")
cat >"$stage/REVISION" <<REV
id: $id
sha: $sha
dirty: $dirty
date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
build_host: $(hostname)
REV
test -s "$stage/healthcheck.msgpack" && test -f "$stage/web/index.html"

# --- Ship it -------------------------------------------------------------------------------------
run "Deploy: create the release directory" ssh "${ssh_opts[@]}" "$host" "mkdir -p $dest/releases/$id"
run "Deploy: copy release $id" \
  rsync -rlpt --delete -e "ssh ${ssh_opts[*]}" "$stage/" "$host:$dest/releases/$id/"
remote "Deploy: set owner and permissions on $id" finalize "$id"
remote "Deploy: switch to $id, restart, health-check (goes back by itself on failure)" switch "$id"
remote "Deploy: remove old releases (keeps 3)" prune
[ "$dry" = 1 ] && echo "Dry run: staged $id in $stage, nothing sent." || echo "Deployed $id"
