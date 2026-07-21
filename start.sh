#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
test -f .env || { echo 'Missing .env. Copy .env.example and configure it.'; exit 1; }
test -d server/node_modules -a -d client/node_modules || { echo 'Dependencies missing. Run scripts/bootstrap.sh.'; exit 1; }
set -a; source .env; set +a
node server/index.js & server_pid=$!
npm --prefix client start & client_pid=$!
cleanup() { kill "$server_pid" "$client_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$server_pid" "$client_pid"
