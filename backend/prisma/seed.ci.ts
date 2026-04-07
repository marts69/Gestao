/**
 * Dados minimos para Playwright/CI (colaborador + servico dedicados).
 * Uso: DATABASE_URL=... npx tsx prisma/seed.ci.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  await prisma.colaborador.upsert({
    where: { email: 'helena@serenidade.com' },
    create: {
      nome: 'Helena E2E',
      email: 'helena@serenidade.com',
      senha: hash,
      especialidade: 'Massagem',
      papel: 'collaborator',
      ativo: true,
    },
    update: {
      senha: hash,
      ativo: true,
    },
  });

  await prisma.servico.upsert({
    where: { nome: 'E2E Massagem' },
    create: { nome: 'E2E Massagem', preco: 0, duracao: 60 },
    update: { duracao: 60, preco: 0 },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
