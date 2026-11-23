#!/usr/bin/env bash
# Runs ON THE SERVER, sent over ssh by deploy.sh:
#   ssh hetzner bash -s -- <command> [args] < ops/remote.sh
# Commands: finalize <id> | switch <id> | rollback | prune | status
# Layout: /srv/fractals/releases/<id>/{server,web/,REVISION,healthcheck.msgpack}, and /srv/fractals/current
# as a symlink to one of them. The systemd unit rust-fractals runs /srv/fractals/current/server.
set -uo pipefail

root=${FRACTALS_ROOT:-/srv/fractals}
unit=${FRACTALS_UNIT:-rust-fractals}
port=${FRACTALS_PORT:-3051}
keep=${FRACTALS_KEEP:-3}
cd "$root" || exit 1

current_id() { basename "$(readlink -f current 2>/dev/null || true)"; }

# Release ids sort by time (they start with a timestamp). Oldest first.
all_releases() { find releases -mindepth 1 -maxdepth 1 -printf '%f\n' 2>/dev/null | sort; }

# Waits for the page, then makes one real API call. 0 = healthy.
health() {
  local dir body url code size tries=0
  dir=$(readlink -f current)
  body="$dir/healthcheck.msgpack"
  url="http://127.0.0.1:$port"
  until curl -fsS --max-time 5 -o /dev/null "$url/"; do
    tries=$((tries + 1))
    if [ "$tries" -ge 20 ]; then echo "health: GET / failed after $tries tries"; return 1; fi
    sleep 1
  done
  echo "health: GET / ok"
  if [ ! -f "$body" ]; then echo "health: $body is missing"; return 1; fi
  read -r code size < <(curl -sS --max-time 60 -o /dev/null -w '%{http_code} %{size_download}\n' \
    -X POST -H 'Content-Type: application/msgpack' --data-binary "@$body" \
    "$url/api/stl?thicken=false&curve=false&extrude=false&init_steps=12&step_scale=1.0")
  if [ "$code" != 200 ] || [ "${size:-0}" -lt 84 ]; then
    echo "health: POST /api/stl gave HTTP $code, $size bytes"
    return 1
  fi
  echo "health: POST /api/stl ok ($size bytes)"
}

# Atomically points current at releases/<id>.
point_at() {
  ln -sfn "releases/$1" .current.tmp && mv -T .current.tmp current
}

restart() {
  systemctl restart "$unit" && sleep 1
}

# switch <id>: point current at it, restart, check; if the check fails go back to where we were.
do_switch() {
  local id=$1 prev
  [ -d "releases/$id" ] || { echo "no such release: $id"; return 2; }
  prev=$(current_id)
  echo "switching: ${prev:-none} -> $id"
  point_at "$id" && restart && health && { echo "switched to $id"; return 0; }
  echo "FAILED: $id is unhealthy"
  if [ -n "$prev" ] && [ "$prev" != "$id" ] && [ -d "releases/$prev" ]; then
    echo "rolling back to $prev"
    point_at "$prev" && restart
    if health; then echo "rolled back to $prev, which is healthy"; else echo "ALSO UNHEALTHY after rolling back to $prev"; fi
  else
    echo "no previous release to go back to"
  fi
  journalctl -u "$unit" -n 15 --no-pager 2>/dev/null || true
  return 1
}

case "${1:-}" in
  finalize)
    id=${2:?release id}
    dir="releases/$id"
    [ -d "$dir" ] || { echo "no such release: $id"; exit 2; }
    # Owned by root, readable by the service, not writable by it.
    chown -R root:www-data "$dir"
    find "$dir" -type d -exec chmod 755 {} +
    find "$dir" -type f -exec chmod 644 {} +
    chmod 755 "$dir/server"
    ls -la "$dir"
    ;;
  switch)
    do_switch "${2:?release id}"
    ;;
  rollback)
    cur=$(current_id)
    prev=$(all_releases | awk -v cur="$cur" '$0 == cur { print last; exit } { last = $0 }')
    [ -n "$prev" ] || { echo "no release older than ${cur:-none} to roll back to"; exit 1; }
    do_switch "$prev"
    ;;
  prune)
    cur=$(current_id)
    # Keep the newest $keep, and never the one in use.
    all_releases | head -n -"$keep" | while read -r old; do
      [ "$old" = "$cur" ] && continue
      echo "removing old release $old"
      rm -rf -- "releases/$old"
    done
    all_releases
    ;;
  status)
    echo "current -> $(readlink current 2>/dev/null || echo 'MISSING')"
    cat "current/REVISION" 2>/dev/null
    echo
    echo "releases (oldest first):"
    all_releases | sed 's/^/  /'
    echo
    echo "service: $(systemctl is-active "$unit")"
    systemctl show "$unit" -p ExecStart -p WorkingDirectory -p ActiveEnterTimestamp --no-pager | sed 's/^/  /'
    health
    ;;
  *)
    echo "usage: remote.sh finalize <id> | switch <id> | rollback | prune | status"
    exit 2
    ;;
esac
