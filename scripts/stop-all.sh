#!/usr/bin/env bash
set -euo pipefail

kill_port() {
  local port="$1"
  local pids

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN || true)"
  elif command -v fuser >/dev/null 2>&1; then
    pids="$(fuser "$port"/tcp 2>/dev/null || true)"
  else
    echo "[stop] neither lsof nor fuser found; cannot inspect port $port"
    return 0
  fi

  if [[ -n "${pids// }" ]]; then
    echo "[stop] killing processes on port $port: $pids"
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 0.5
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
  else
    echo "[stop] no process listening on port $port"
  fi
}

kill_port 3333
kill_port 3000
kill_port 3001
kill_port 3002
kill_port 3003

echo "[stop] done"
