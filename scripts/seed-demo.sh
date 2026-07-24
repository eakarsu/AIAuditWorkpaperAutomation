#!/usr/bin/env bash
set -euo pipefail
test "${CONFIRM_DEMO_SEED:-}" = "yes" || { echo 'Set CONFIRM_DEMO_SEED=yes to load synthetic demo data.'; exit 2; }
cd "$(dirname "$0")/.."
database_url="$(node --env-file=.env -e 'process.stdout.write(process.env.DATABASE_URL || "")')"
: "${database_url:?DATABASE_URL is required}"
postgres_client="$(command -v psql || true)"
[[ -n "$postgres_client" ]] || { echo 'PostgreSQL psql client is required.' >&2; exit 1; }
"$postgres_client" "$database_url" -v ON_ERROR_STOP=1 -f server/seed/init.sql
CONFIRM_DEMO_SEED=yes node --env-file=.env server/scripts/provision-demo-users.js
