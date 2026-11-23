#!/usr/bin/env bash
# This script used to build on the server (git pull, cargo build, yarn, parcel). It no longer works,
# and the server no longer builds anything. Use ops/ instead:
#   ops/update.sh   update dependencies, build, test, audit (never deploys)
#   ops/deploy.sh   build here, copy to the server, switch and restart (--rollback, --status)
# See ops/README.md.
echo "update.sh is obsolete: see ops/README.md (ops/update.sh, ops/deploy.sh)" >&2
exit 1
