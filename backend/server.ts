import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { createRouter } from './routes';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// Permite acesso de qualquer IP/origem, evitando erros de CORS em redes locais
const io = new Server(server, { cors: { origin: '*' } });

const SENSITIVE_LOG_KEYS = ['token', 'authorization', 'cpf', 'telefone', 'contact'];

const sanitizeSensitiveString = (value: string) => value
  .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
  .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***.***.***-**')
  .replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, '(**) *****-****');

const redactSensitiveData = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (typeof value === 'string') {
    return sanitizeSensitiveString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, seen));
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    if (value instanceof Error) {
      const errObj = value as Error & Record<string, unknown>;
      const next: Record<string, unknown> = {
        name: errObj.name,
        message: sanitizeSensitiveString(errObj.message || ''),
      };

      if (typeof errObj.stack === 'string') {
        next.stack = sanitizeSensitiveString(errObj.stack);
      }

      for (const [key, nested] of Object.entries(errObj)) {
        if (key in next) continue;
        const normalizedKey = key.toLowerCase();
        const shouldRedact = SENSITIVE_LOG_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
        next[key] = shouldRedact ? '[REDACTED]' : redactSensitiveData(nested, seen);
      }

      return next;
    }

    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(obj)) {
      const normalizedKey = key.toLowerCase();
      const shouldRedact = SENSITIVE_LOG_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
      next[key] = shouldRedact ? '[REDACTED]' : redactSensitiveData(nested, seen);
    }

    return next;
  }

  return value;
};

// Middlewares
app.use(cors({ origin: '*' })); // Libera o acesso de qualquer IP
app.use(express.json()); // Ensina a API a ler arquivos JSON

app.use('/api', createRouter(io));

// Middleware Global de Tratamento de Erros
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 [ERRO CRÍTICO NO SERVIDOR]:', redactSensitiveData(err));
  res.status(500).json({ erro: 'Ocorreu um erro interno no servidor.', detalhes: err.message });
});

// Tarefa Automática de Limpeza de Agendamentos (Roda no Backend em lote)
setInterval(async () => {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30); // Calcula 30 dias atrás

    const deletados = await prisma.agendamento.deleteMany({
      where: {
        status: 'scheduled',
        data: { lt: dataLimite } // 'lt' = less than (menor/mais antigo que a data limite)
      }
    });

    if (deletados.count > 0) {
      console.log(`🧹 [CRON] Limpeza executada: ${deletados.count} agendamentos antigos excluídos.`);
      io.emit('db_updated'); // Atualiza a tela dos usuários caso apague algo
    }
  } catch (error) {
    console.error('🚨 Erro ao limpar agendamentos antigos:', error);
  }
}, 1000 * 60 * 60); // Executa a cada 1 Hora

// Ligar o servidor na porta 3333
const PORT = 3333;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escutando em todas as interfaces na porta ${PORT}`);
});