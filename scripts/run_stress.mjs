import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const JWT_SECRET = 'minha_chave_secreta_super_segura';

async function main() {
  try {
    // 1. Criando um token válido de supervisor
    const AUTH_TOKEN = jwt.sign({ id: 'admin', papel: 'supervisor' }, JWT_SECRET, { expiresIn: '8h' });

    // 2. Usando um ID real extraído via psql do banco de dados
    const COLABORADOR_ID = "b0dc500d-c899-40d6-a941-4c72c0400023";

    console.log(`[x] Gerado Token Supervisor: ${AUTH_TOKEN.substring(0, 15)}...`);
    console.log(`[x] Selecionado Colaborador ID Real: ${COLABORADOR_ID}`);

    // 3. Pegando uma data futuramente segura (Amanhã, às 10:00)
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const yyyy = amanha.getFullYear();
    const mm = String(amanha.getMonth() + 1).padStart(2, '0');
    const dd = String(amanha.getDate()).padStart(2, '0');
    const DATE = `${yyyy}-${mm}-${dd}`;
    const TIME = "11:00";

    console.log(`[x] Data/Hora do Agendamento a testar: ${DATE} às ${TIME}`);
    console.log("\n>>> Preparando bombardeio (10 requisições disparadas paralelamente)...\n");

    const command = `API_BASE_URL=http://localhost:3333/api AUTH_TOKEN="${AUTH_TOKEN}" COLABORADOR_ID="${COLABORADOR_ID}" DATE="${DATE}" TIME="${TIME}" REQUESTS=10 node /home/matheusmartinsmoreira/Work/Gestão/scripts/stress-agendamento.mjs`;

    execSync(command, { stdio: 'inherit' });

  } catch (err) {
    console.error("Erro na execução do teste:", err.message);
  }
}

main();
