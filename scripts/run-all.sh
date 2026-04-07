#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

echo "[launcher] starting FRONT + API outside VS Code"
echo "[launcher] project: $PROJECT_DIR"

echo "[launcher] logs will be prefixed by [FRONT] and [API]"
exec npm run dev:all
