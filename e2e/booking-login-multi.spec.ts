import { test, expect } from '@playwright/test';

async function loginViaAcessoRapido(
  page: import('@playwright/test').Page,
  perfil: 'Colaborador' | 'Supervisor',
) {
  await page.goto('/');
  await expect(page.getByText(/Acesso Rapido|Acesso Rápido/i)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(perfil, 'i') }).click();
  await page.getByRole('button', { name: /Entrar/i }).click();
  await expect(page.getByText('Carregando dados do sistema...')).toBeHidden({ timeout: 90_000 });
}

test.describe('UI — login e multi-contexto', () => {
  test('acesso rapido Colaborador abre portal apos carregar dados', async ({ page }) => {
    await loginViaAcessoRapido(page, 'Colaborador');
    await expect(page.getByRole('heading', { name: /Portal do Colaborador/i })).toBeVisible();
  });

  test('duas janelas independentes: ambas logam como colaborador sem erro', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    try {
      await Promise.all([
        (async () => {
          await loginViaAcessoRapido(p1, 'Colaborador');
          await expect(p1.getByRole('heading', { name: /Portal do Colaborador/i })).toBeVisible();
        })(),
        (async () => {
          await loginViaAcessoRapido(p2, 'Colaborador');
          await expect(p2.getByRole('heading', { name: /Portal do Colaborador/i })).toBeVisible();
        })(),
      ]);
    } finally {
      await Promise.all([ctx1.close(), ctx2.close()]);
    }
  });

  test('supervisor ve seletor de portal na barra', async ({ page }) => {
    await loginViaAcessoRapido(page, 'Supervisor');
    await expect(page.getByRole('heading', { name: /Portal da Supervis[aã]o/i })).toBeVisible();
  });
});
