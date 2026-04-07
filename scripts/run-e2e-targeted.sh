#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

echo "START $(date +%s)" >> e2e-target.trace

rm -f e2e-target-result.json e2e-target-run.log e2e-target-exit.code e2e-target-summary.txt e2e-target-summary.err

npx playwright test e2e/booking-login-multi.spec.ts e2e/user-flow-system.spec.ts --workers=1 --reporter=json > e2e-target-result.json 2> e2e-target-run.log
E2E_EXIT=$?

echo "$E2E_EXIT" > e2e-target-exit.code

node -e 'const fs=require("fs");const p="e2e-target-result.json";if(!fs.existsSync(p)){console.log("E2E_JSON_MISSING=1");process.exit(0)};const j=JSON.parse(fs.readFileSync(p,"utf8"));let total=0,passed=0,failed=0,skipped=0,flaky=0;const walk=(s)=>{if(!s)return;(s.specs||[]).forEach(spec=>(spec.tests||[]).forEach(t=>(t.results||[]).forEach(r=>{total++;if(r.status==="passed")passed++;else if(r.status==="failed"||r.status==="timedOut"||r.status==="interrupted")failed++;else if(r.status==="skipped")skipped++;else if(r.status==="flaky")flaky++;})));(s.suites||[]).forEach(walk)};(j.suites||[]).forEach(walk);console.log(`E2E_TOTAL=${total}`);console.log(`E2E_PASSED=${passed}`);console.log(`E2E_FAILED=${failed}`);console.log(`E2E_SKIPPED=${skipped}`);console.log(`E2E_FLAKY=${flaky}`);' > e2e-target-summary.txt 2> e2e-target-summary.err

echo "END $(date +%s) EXIT=$E2E_EXIT" >> e2e-target.trace
