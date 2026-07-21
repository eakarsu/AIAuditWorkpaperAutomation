#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
test -f .env || { cp .env.example .env; echo 'Created .env; replace secrets before continuing.'; exit 1; }
npm --prefix server ci
npm --prefix client ci

