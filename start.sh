#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"
[[ -f .env ]] || { echo 'Missing .env; copy .env.example and configure it.' >&2; exit 1; }
[[ -d server/node_modules && -d client/node_modules ]] || { echo 'Dependencies are missing; run scripts/bootstrap.sh explicitly.' >&2; exit 1; }
backend_port="$(sed -n 's/^BACKEND_PORT=//p' .env | tail -n 1 | tr -d '\r')"
frontend_port="$(sed -n 's/^FRONTEND_PORT=//p' .env | tail -n 1 | tr -d '\r')"
[[ "$backend_port" =~ ^[0-9]+$ ]] || { echo 'BACKEND_PORT is required.' >&2; exit 1; }
[[ "$frontend_port" =~ ^[0-9]+$ ]] || { echo 'FRONTEND_PORT is required.' >&2; exit 1; }
[[ "$backend_port" != "$frontend_port" ]] || { echo 'BACKEND_PORT and FRONTEND_PORT must differ.' >&2; exit 1; }
for runtime_port in "$backend_port" "$frontend_port"; do
  if lsof -nP -iTCP:"$runtime_port" -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $runtime_port is already in use; no process was changed." >&2; exit 1; fi
done
export RUNTIME_PROJECT_NAME='AI Audit Workpaper Automation'
export RUNTIME_AI_ENDPOINT='/api/ai/audit-workpaper-review'
export RUNTIME_AI_FEATURE='audit-workpaper-evidence-review'
export RUNTIME_AI_SYSTEM_PROMPT='Review audit workpaper evidence for completeness, traceability, sampling support, control conclusions, and required reviewer signoff.'
(BACKEND_PORT="$backend_port" PORT="$backend_port" node --env-file=.env server/index.js) & backend_pid=$!
(cd client && BACKEND_PORT="$backend_port" node --env-file=../.env node_modules/vite/bin/vite.js --host 127.0.0.1 --port "$frontend_port" --strictPort) & frontend_pid=$!
cleanup() { trap - INT TERM EXIT; kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; wait "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT
trap 'exit 130' INT TERM
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do sleep 1; done
echo 'A child service exited unexpectedly.' >&2
exit 1
