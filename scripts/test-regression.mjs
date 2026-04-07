#!/usr/bin/env node
/**
 * Regressao local pre-release: lint, unitarios, build, smoke LGPD, E2E.
 * Requer API na 3333 para smoke:lgpd; E2E sobe dev:all via Playwright salvo PLAYWRIGHT_SKIP_WEBSERVER=1.
 */
import { spawnSync } from 'node:child_process';

function run(label, cmd, args) {
  console.log(`\n[test:regression] ${label}\n`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('lint', 'npm', ['run', 'lint']);
run('unit (Vitest)', 'npm', ['run', 'test:unit']);
run('build', 'npm', ['run', 'build']);
run('smoke LGPD', 'npm', ['run', 'smoke:lgpd']);

if (process.env.SKIP_E2E === '1') {
  console.log('\n[test:regression] SKIP_E2E=1 — Playwright ignorado.\n');
  process.exit(0);
}

run('e2e (Playwright)', 'npx', ['playwright', 'test']);
console.log('\n[test:regression] concluido.\n');
