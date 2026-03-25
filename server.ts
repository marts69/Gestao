import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { createRouter } from './routes';
import { PrismaClient } from '@prisma/client';

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// Permite acesso de qualquer IP/origem, evitando erros de CORS em redes locais
const io = new Server(server, { cors: { origin: '*' } });

// Middlewares
app.use(cors({ origin: '*' })); // Libera o acesso de qualquer IP
app.use(express.json()); // Ensina a API a ler arquivos JSON

app.use('/api', createRouter(io));

// Middleware Global de Tratamento de Erros
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 [ERRO CRÍTICO NO SERVIDOR]:', err);
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