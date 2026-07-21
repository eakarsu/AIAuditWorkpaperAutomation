#!/usr/bin/env bash
set -euo pipefail
test "${CONFIRM_DEMO_SEED:-}" = "yes" || { echo 'Set CONFIRM_DEMO_SEED=yes to load synthetic demo data.'; exit 2; }
cd "$(dirname "$0")/.."
set -a; source .env; set +a
: "${DATABASE_URL:?DATABASE_URL is required}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/seed/init.sql

