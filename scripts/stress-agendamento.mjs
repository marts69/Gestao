#!/usr/bin/env node

/**
 * Stress test de concorrencia para validar conflito de agenda (HTTP 409).
 *
 * Uso rapido:
 *   API_BASE_URL=http://localhost:3333/api \
 *   AUTH_TOKEN=<token_jwt> \
 *   COLABORADOR_ID=<uuid> \
 *   CLIENT_NAME="Teste Concorrencia" \
 *   DATE=2026-04-15 \
 *   TIME=10:00 \
 *   node scripts/stress-agendamento.mjs
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3333/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const COLABORADOR_ID = process.env.COLABORADOR_ID || '';
const CLIENT_NAME = process.env.CLIENT_NAME || 'Stress Test';
const CONTACT = process.env.CONTACT || '(11) 99999-0000';
const DATE = process.env.DATE || '';
const TIME = process.env.TIME || '';
const SERVICES = (process.env.SERVICES || 'Massagem Relaxante').split(',').map((item) => item.trim()).filter(Boolean);
const REQUESTS = Number(process.env.REQUESTS || 10);

if (!AUTH_TOKEN || !COLABORADOR_ID || !DATE || !TIME) {
  console.error('Parametros obrigatorios ausentes. Defina AUTH_TOKEN, COLABORADOR_ID, DATE e TIME.');
  process.exit(1);
}

const payload = {
  clientName: CLIENT_NAME,
  contact: CONTACT,
  date: DATE,
  time: TIME,
  assignedEmployeeId: COLABORADOR_ID,
  services: SERVICES,
};

const run = async () => {
  const tasks = Array.from({ length: REQUESTS }).map(async (_, index) => {
    const response = await fetch(`${API_BASE_URL}/agendamentos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    return {
      index: index + 1,
      status: response.status,
      ok: response.ok,
      body,
    };
  });

  const results = await Promise.all(tasks);
  const grouped = results.reduce((acc, item) => {
    const key = String(item.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('Resumo por status:', grouped);
  console.log('Detalhes:');
  for (const item of results) {
    const summary = item.body?.erro || item.body?.message || item.body?.id || '';
    console.log(`#${item.index} -> ${item.status} ${summary}`.trim());
  }

  const created = (grouped['200'] || 0) + (grouped['201'] || 0);
  const conflicts = grouped['409'] || 0;

  if (created === 1 && conflicts === REQUESTS - 1) {
    console.log('SUCESSO: concorrencia protegida (1 criado, demais 409).');
    process.exit(0);
  }

  console.log('ATENCAO: comportamento fora do esperado para teste de concorrencia.');
  process.exit(2);
};

run().catch((error) => {
  console.error('Falha ao executar stress test:', error);
  process.exit(1);
});
