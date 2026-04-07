const fs = require('fs');

const resultPath = 'e2e-result.json';

if (!fs.existsSync(resultPath)) {
  console.log('E2E_JSON_MISSING=1');
  process.exit(0);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
} catch (error) {
  console.log('E2E_JSON_PARSE_ERROR=1');
  console.log(`E2E_JSON_PARSE_ERROR_MSG=${error.message}`);
  process.exit(0);
}

let total = 0;
let passed = 0;
let failed = 0;
let skipped = 0;
let flaky = 0;

function walkSuite(suite) {
  if (!suite) return;

  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      for (const result of test.results || []) {
        total += 1;
        const status = result.status;

        if (status === 'passed') passed += 1;
        else if (status === 'failed' || status === 'timedOut' || status === 'interrupted') failed += 1;
        else if (status === 'skipped') skipped += 1;
        else if (status === 'flaky') flaky += 1;
      }
    }
  }

  for (const child of suite.suites || []) walkSuite(child);
}

for (const suite of data.suites || []) walkSuite(suite);

console.log(`E2E_TOTAL=${total}`);
console.log(`E2E_PASSED=${passed}`);
console.log(`E2E_FAILED=${failed}`);
console.log(`E2E_SKIPPED=${skipped}`);
console.log(`E2E_FLAKY=${flaky}`);
