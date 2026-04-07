#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

echo "START $(date +%s)" >> e2e-script.trace

rm -f e2e-result.json e2e-run.log e2e-exit.code e2e-summary.txt e2e-summary.err

npx playwright test --workers=1 --reporter=json > e2e-result.json 2> e2e-run.log
E2E_EXIT=$?

echo "$E2E_EXIT" > e2e-exit.code

node scripts/summarize-e2e.cjs > e2e-summary.txt 2> e2e-summary.err

echo "END $(date +%s) EXIT=$E2E_EXIT" >> e2e-script.trace
