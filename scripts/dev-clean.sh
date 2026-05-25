#!/usr/bin/env bash
# Frees the portal dev port and starts the app. Default port 3002 so it can
# run alongside crossub_web (web :3000, api :3001).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3002}"

kill_listeners_on_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  [ -z "$pids" ] && return 0
  while read -r pid; do
    [ -z "$pid" ] && continue
    echo "  - killing PID $pid (port $port)" >&2
    kill -9 "$pid" 2>/dev/null || true
  done <<< "$pids"
}

echo "→ Freeing dev port $PORT"
pkill -f "next dev.*$PORT" 2>/dev/null || true
kill_listeners_on_port "$PORT"

for attempt in 1 2 3 4 5; do
  if ! lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    break
  fi
  if [ "$attempt" -eq 5 ]; then
    echo "✗ Port $PORT still busy — refusing to start" >&2
    exit 1
  fi
  sleep 0.4
done

echo "→ Starting portal on port $PORT (API proxy → crossub_web @ :3001)"
exec pnpm -r --parallel run dev
