#!/usr/bin/env node
import { chromium } from 'playwright';

const APP_URL = process.env.AUDIT_APP_URL || 'http://127.0.0.1:3000';

const RAW = {
  token: 'Bearer super.secret.token',
  cpf: '123.456.789-10',
  telefone: '(11) 99999-9999',
};

const containsRawSensitive = (value) => {
  const text = JSON.stringify(value);
  return text.includes('super.secret.token')
    || text.includes('123.456.789-10')
    || text.includes('(11) 99999-9999');
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let captured = null;

  page.on('console', async (msg) => {
    if (msg.type() !== 'error') return;
    const args = msg.args();
    if (args.length < 2) return;

    const firstArg = await args[0].jsonValue().catch(() => null);
    if (firstArg !== '[FRONTEND][API_ERROR]') return;

    const secondArg = await args[1].jsonValue().catch(() => null);
    if (secondArg?.endpoint !== '/servicos') return;

    captured = secondArg;
  });

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api', '') || '/';

    if (path === '/login' && req.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'fake.jwt.token',
          usuario: {
            id: 'admin',
            nome: 'Diretoria',
            email: 'admin@serenidade.com',
            papel: 'supervisor',
          },
        }),
      });
      return;
    }

    if (path === '/servicos' && req.method() === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        headers: { 'x-request-id': 'audit-redaction-frontend' },
        body: JSON.stringify({
          message: `falha simulada com ${RAW.token}, cpf ${RAW.cpf}, telefone ${RAW.telefone}`,
          token: RAW.token,
          cpf: RAW.cpf,
          telefone: RAW.telefone,
        }),
      });
      return;
    }

    if (req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Supervisor/i }).click();
  await page.getByRole('button', { name: /^Entrar$/i }).click();

  const timeoutAt = Date.now() + 25000;
  while (!captured && Date.now() < timeoutAt) {
    await page.waitForTimeout(250);
  }

  const result = {
    sawFrontendApiErrorLog: Boolean(captured),
    hasRedactedTokenKey: captured?.responseBody?.token === '[REDACTED]',
    hasRedactedCpfKey: captured?.responseBody?.cpf === '[REDACTED]',
    hasRedactedTelefoneKey: captured?.responseBody?.telefone === '[REDACTED]',
    messageSanitizedBearer: typeof captured?.responseBody?.message === 'string' && captured.responseBody.message.includes('Bearer [REDACTED]'),
    messageSanitizedCpf: typeof captured?.responseBody?.message === 'string' && captured.responseBody.message.includes('***.***.***-**'),
    messageSanitizedPhone: typeof captured?.responseBody?.message === 'string' && captured.responseBody.message.includes('(**) *****-****'),
    leakedRawSensitive: containsRawSensitive(captured),
    sample: captured,
  };

  console.log('FRONTEND_LOG_REDACTION_AUDIT', JSON.stringify(result, null, 2));

  await browser.close();

  if (!result.sawFrontendApiErrorLog) process.exit(1);
  if (!result.hasRedactedTokenKey || !result.hasRedactedCpfKey || !result.hasRedactedTelefoneKey) process.exit(2);
  if (!result.messageSanitizedBearer || !result.messageSanitizedCpf || !result.messageSanitizedPhone) process.exit(3);
  if (result.leakedRawSensitive) process.exit(4);
}

main().catch((error) => {
  console.error('FRONTEND_LOG_REDACTION_AUDIT_ERROR', error?.message || error);
  process.exit(9);
});
