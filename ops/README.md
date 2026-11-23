# Running, updating and deploying

Nothing is built on the server. `ops/deploy.sh` builds here, copies the result to
`hetzner:/srv/fractals/releases/<id>/` and switches the `current` symlink. Every server command goes
through `ops/logged.sh` and is appended to `ops/ssh-log.md` (git ignores it).

## Locally

```sh
# server (Rust stable; Rocket 0.5)
cd server && cargo test            # golden test of the geometry + API tests
cd server && cargo run             # http://127.0.0.1:8000, serves ../web/dist if it exists
# frontend (Node 20+; Vite, pinned in web/package-lock.json)
cd web && npm ci
cd web && npm run dev              # http://localhost:5173, forwards /api to the server on :8000
cd web && npm run build            # into web/dist, which the server serves
cd web && npm run check            # TypeScript
# end to end in a real browser (server must be running; needs Chrome/Chromium, see the file)
cd web && node e2e/smoke.mjs http://127.0.0.1:8000/
```

Server settings (environment variables):

| Variable | Meaning | Default |
|---|---|---|
| `FRACTALS_STATIC_DIR` | directory of built frontend files | `web` in the working directory if it exists, else `../web/dist`, else `web` |
| `ROCKET_ADDRESS`, `ROCKET_PORT` | where to listen (Rocket 0.5 still reads these) | `127.0.0.1`, `8000` |
| `ROCKET_LOG_LEVEL` | `critical` (release default), `normal` or `debug` | `critical` in release builds |

(`ROCKET_ENV` from Rocket 0.4 is now `ROCKET_PROFILE`; nothing here needs it.)

## Updating dependencies

```sh
ops/update.sh
```

Runs `cargo update` and `npm update` (within the ranges in `Cargo.toml` and `web/package.json`),
builds, runs the tests, `cargo audit` and `npm audit`, then shows `git diff --stat` and stops. It
never deploys. Look at the diff, commit, then deploy. Major upgrades (Rocket, Vite, ...) are done by
hand by editing the version ranges.

## Deploying

```sh
ops/deploy.sh              # test, build, copy, switch, restart, health-check, keep 3 releases
ops/deploy.sh --dry-run    # build, test and stage everything, print the server commands, run none
ops/deploy.sh --status     # which release is live, the service state, a health check
ops/deploy.sh --rollback   # switch back to the previous release (restart + health check)
```

A dirty working tree is deployed with a warning, and the release id ends in `-dirty`. The id is
`<YYYYmmdd-HHMMSS>-<shortsha>[-dirty]`, and `REVISION` in the release records the sha, dirty flag, date
and build host.

What it does on the server (`ops/remote.sh`, sent over ssh): `finalize` sets `root:www-data` and
755/644 (the service cannot write to a release); `switch` points `current` at the release with
`ln -sfn` and `mv -T`, runs `systemctl restart rust-fractals`, then checks `GET /` and one real
`POST /api/stl` on `127.0.0.1:3051`. **If either check fails it points `current` back at the previous
release, restarts, and exits non-zero.** `prune` keeps the 3 newest releases (and never the live one).

Environment overrides: `FRACTALS_HOST` (default `hetzner`), and on the server side
`FRACTALS_PORT` (3051), `FRACTALS_UNIT`, `FRACTALS_ROOT`, `FRACTALS_KEEP`.

## One-time server setup (as root on hetzner)

The old service keeps running from `/server/fractals` until you restart it, so these steps are safe to
do in order. The service only works after the first `ops/deploy.sh`.

```sh
# 1. Directories. Releases are root-owned; the service only reads them.
mkdir -p /srv/fractals/releases
chown root:www-data /srv/fractals /srv/fractals/releases
chmod 755 /srv/fractals /srv/fractals/releases

# 2. Tools the deploy needs on the server
command -v rsync curl || apt-get install -y rsync curl

# 3. The new unit. This replaces /etc/systemd/system/rust-fractals.service. Keep any other settings
#    the current unit has. The address and port are set here; if the existing drop-in
#    (rust-fractals.service.d/*.conf) already sets ROCKET_ADDRESS and ROCKET_PORT, delete it
#    (systemctl revert rust-fractals) or leave out the two Environment lines below.
cat > /etc/systemd/system/rust-fractals.service <<'UNIT'
[Unit]
Description=Fractals (Rocket server)
After=network.target

[Service]
User=www-data
WorkingDirectory=/srv/fractals/current
ExecStart=/srv/fractals/current/server
Environment=ROCKET_ADDRESS=127.0.0.1
Environment=ROCKET_PORT=3051
Environment=FRACTALS_STATIC_DIR=/srv/fractals/current/web
Restart=always
RuntimeMaxSec=7d
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload      # do not restart yet: there is no /srv/fractals/current until the first deploy
```

(`FRACTALS_STATIC_DIR` is optional: the default is `web` in the working directory, which is the same
directory. It is there to make the setting visible. `RuntimeMaxSec=7d` with `Restart=always` is how the
old unit restarts weekly; drop both if you no longer want that.)

Caddy needs no change: `fractals.maxcl.co.uk` still proxies to `localhost:3051`.

Then, from this machine:

```sh
ops/deploy.sh --dry-run   # optional: check the build and see the commands
ops/deploy.sh             # first release: creates current, restarts the service, health-checks
ops/deploy.sh --status
```

Once it works, `/server/fractals` (the old checkout, Rust and Node build tools) can be removed.
On the first deploy there is no previous release, so a failed health check leaves the service
down; look at `journalctl -u rust-fractals -n 50`.

## Rolling back

```sh
ops/deploy.sh --rollback   # one step back, to the next older release still on the server
```

Run it again to go back another step (the 3 newest releases are kept). A failed deploy has already
rolled itself back. To pick a specific release by hand:
`ssh hetzner 'ln -sfn releases/<id> /srv/fractals/.c && mv -T /srv/fractals/.c /srv/fractals/current && systemctl restart rust-fractals'`.
