#!/usr/bin/env bash
# Runs a command that talks to the server (ssh, scp, rsync) and appends the command, the reason
# and its output to ssh-log.md next to this script.
# Usage: ops/logged.sh "<why>" ssh hetzner '<remote command>'
set -uo pipefail

log="$(dirname "$0")/ssh-log.md"
why=$1
shift

{
  printf '\n### %s: %s\n\n```sh\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$why"
  printf '%q ' "$@"
  printf '\n```\n\n```text\n'
} >>"$log"

"$@" 2>&1 | tee -a "$log"
status=${PIPESTATUS[0]}

printf '```\n\nExit status: %s\n' "$status" >>"$log"
exit "$status"
