#!/usr/bin/env bash
# Updates the dependencies, rebuilds, tests and audits, then stops for you to look at the result.
# It never deploys, commits or touches the server. Review `git diff`, commit, then run ops/deploy.sh.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

if [ -n "$(git status --porcelain)" ]; then
  echo "WARNING: the working tree has uncommitted changes, so the diff below mixes them with the update." >&2
fi

failed=()
step() { # step "<name>" cmd...: run, remember a failure, carry on
  local name=$1
  shift
  echo
  echo "=== $name"
  "$@" || failed+=("$name")
}

step "cargo update" bash -c 'cd server && cargo update'
step "npm update (within the ranges in package.json)" bash -c 'cd web && npm update'

step "cargo build" bash -c 'cd server && cargo build --release --locked'
step "cargo test" bash -c 'cd server && cargo test --locked'
step "web type check" bash -c 'cd web && npm run check'
step "web build" bash -c 'cd web && npm run build'

if command -v cargo-audit >/dev/null; then
  step "cargo audit" bash -c 'cd server && cargo audit'
else
  echo "cargo-audit is not installed: cargo install cargo-audit --locked" >&2
  failed+=("cargo audit (not installed)")
fi
step "npm audit (runtime dependencies, high and above)" bash -c 'cd web && npm audit --omit=dev --audit-level=high'

echo
echo "=== Newer versions outside the ranges (for information)"
(cd web && npm outdated) || true
echo "(Rust: 'cargo install cargo-outdated' then 'cargo outdated -R' in server/ shows the same.)"

echo
echo "=== git diff --stat"
git diff --stat

echo
if [ ${#failed[@]} -gt 0 ]; then
  echo "NEEDS ATTENTION: ${failed[*]}"
else
  echo "Everything built, passed and audited clean."
fi
echo "Review the changes, commit them, then deploy with ops/deploy.sh. (Nothing was deployed.)"
[ ${#failed[@]} -eq 0 ]
