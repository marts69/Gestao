import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';

const prisma = new PrismaClient();
const JWT_SECRET = 'minha_chave_secreta_super_segura'; // Em produção, use process.env.JWT_SECRET

export function createRouter(io: Server) {
  const router = Router();

  // Função para avisar todos os dispositivos (TVs, Celulares) que algo mudou
  const notifyClients = () => io.emit('db_updated');

  // Middleware de Autenticação JWT (O "Porteiro" da API)
  const verificarToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      (req as any).user = payload;
      next();
    } catch (error) {
      res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
  };

  // 0. Rota de LOGIN (Pública - Sem bloqueio)
  router.post('/login', async (req, res) => {
    try {
      const { email, senha } = req.body;
      console.log(`\n[LOGIN] Recebendo tentativa de acesso para: ${email}`);

      if (email === 'admin@serenidade.com' && senha === '123456') {
        console.log('[LOGIN] ✅ Supervisor logado com sucesso (Acesso direto).');
        const token = jwt.sign({ id: 'admin', papel: 'supervisor' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({
          token,
          usuario: {
            id: 'admin', nome: 'Diretoria', email: 'admin@serenidade.com',
            papel: 'supervisor', especialidade: 'Gestão'
          }
        });
      }

      const usuario = await prisma.colaborador.findUnique({ where: { email } });
      if (!usuario) {
        console.log('[LOGIN] ❌ Falha: Usuário não encontrado no banco de dados.');
        return res.status(401).json({ erro: 'Usuário não encontrado' });
      }

      const senhaValida = usuario.senha ? await bcrypt.compare(senha, usuario.senha) : senha === '123456';
      if (!senhaValida) {
        console.log('[LOGIN] ❌ Falha: Senha incorreta informada.');
        return res.status(401).json({ erro: 'Senha incorreta' });
      }

      console.log(`[LOGIN] ✅ Sucesso: Colaborador(a) ${usuario.nome} entrou.`);
      const token = jwt.sign({ id: usuario.id, papel: usuario.papel }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token, usuario });
    } catch (error) {
      console.error('[LOGIN] 🚨 Erro interno crítico:', error);
      res.status(500).json({ erro: 'Erro interno no servidor' });
    }
  });

  // 1. Rota para LISTAR todos os colaboradores
  router.get('/colaboradores', verificarToken, async (req, res) => {
    try {
      const colaboradores = await prisma.colaborador.findMany({
        include: { bloqueios: true }
      });
      res.json(colaboradores);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar colaboradores' });
    }
  });

  // 2. Rota para LISTAR todos os agendamentos
  router.get('/agendamentos', verificarToken, async (req, res) => {
    try {
      const agendamentos = await prisma.agendamento.findMany({
        include: { cliente: true, colaborador: true, servicos: true },
        orderBy: { data: 'asc' }
      });
      res.json(agendamentos);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar agendamentos' });
    }
  });

  // 3. Rota para CRIAR um novo colaborador
  router.post('/colaboradores', verificarToken, async (req, res) => {
    try {
      const { nome, email, especialidade, papel, senha, diasTrabalho } = req.body;
      
      // Prevenção contra geração de e-mails homônimos/duplicados no Front-end
      const emailExiste = await prisma.colaborador.findUnique({ where: { email } });
      if (emailExiste) {
        return res.status(400).json({ erro: 'Este e-mail já está em uso por outro colaborador.' });
      }

      const hashSenha = senha ? await bcrypt.hash(senha, 10) : await bcrypt.hash('123456', 10);
      const novoColaborador = await prisma.colaborador.create({
        data: {
          nome,
          email,
          especialidade,
          senha: hashSenha,
          papel: papel || 'collaborator',
          ativo: true,
          diasTrabalho: diasTrabalho || '1,2,3,4,5,6'
        }
      });
      notifyClients();
      res.status(201).json(novoColaborador);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar colaborador' });
    }
  });

  // 4. Rota para CRIAR um novo agendamento
  router.post('/agendamentos', verificarToken, async (req, res) => {
    try {
      const { clientName, collaboratorId, date, serviceNames, contact, cpf, clientId, clientObservation } = req.body;
      
      let cliente = clientId ? await prisma.cliente.findUnique({ where: { id: clientId } }) : null;

      if (!cliente && cpf) {
        cliente = await prisma.cliente.findFirst({ where: { cpf } });
      }

      if (!cliente && contact && contact !== 'Não informado') {
        cliente = await prisma.cliente.findFirst({ where: { telefone: contact } });
      }

      if (!cliente) {
        cliente = await prisma.cliente.findFirst({ where: { nome: clientName } });
      }

      if (!cliente) {
        try {
          cliente = await prisma.cliente.create({
            data: {
              nome: clientName,
              telefone: contact,
              cpf: cpf || null,
              observacao: clientObservation || null
            } as any
          });
        } catch {
          cliente = await prisma.cliente.create({ data: { nome: clientName, telefone: contact } });
        }
      } else {
        const updateData: any = {};
        if (contact && contact !== 'Não informado') updateData.telefone = contact;
        if (cpf) updateData.cpf = cpf;
        if (clientObservation !== undefined) updateData.observacao = clientObservation;

        if (Object.keys(updateData).length > 0) {
          try {
            cliente = await prisma.cliente.update({ where: { id: cliente.id }, data: updateData });
          } catch {
            const { telefone } = updateData;
            if (telefone) {
              cliente = await prisma.cliente.update({ where: { id: cliente.id }, data: { telefone } });
            }
          }
        }
      }

      const servicosConectados = [];
      const nomesDosServicos = Array.isArray(serviceNames) ? serviceNames : [serviceNames];

      for (const nome of nomesDosServicos) {
        if (!nome) continue;
        let servico = await prisma.servico.findFirst({ where: { nome } });
        if (!servico) servico = await prisma.servico.create({ data: { nome, preco: 0 } });
        servicosConectados.push({ id: servico.id });
      }

      const novoAgendamento = await prisma.agendamento.create({
        data: {
          data: new Date(date),
          colaborador: { connect: { id: collaboratorId } },
          cliente: { connect: { id: cliente.id } },
          servicos: { connect: servicosConectados }
        },
        include: { cliente: true, colaborador: true, servicos: true }
      });
      notifyClients();
      res.status(201).json(novoAgendamento);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao salvar agendamento' });
    }
  });

  // 4.5 Rota para ATUALIZAR (Editar) todos os dados de um agendamento
  router.put('/agendamentos/:id', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { clientName, date, serviceNames, colaboradorId, contact, cpf, clientObservation } = req.body;
      const dataUpdate: any = {};

      if (date) dataUpdate.data = new Date(date);
      if (colaboradorId) dataUpdate.colaboradorId = colaboradorId;

      if (clientName) {
        let cliente = (contact && contact !== 'Não informado') 
          ? await prisma.cliente.findFirst({ where: { telefone: contact } }) 
          : null;

        if (!cliente && cpf) {
          cliente = await prisma.cliente.findFirst({ where: { cpf } });
        }
          
        if (!cliente) {
          cliente = await prisma.cliente.findFirst({ where: { nome: clientName } });
        }

        if (!cliente) {
          try {
            cliente = await prisma.cliente.create({ data: { nome: clientName, telefone: contact !== 'Não informado' ? contact : null, cpf: cpf || null, observacao: clientObservation || null } as any });
          } catch {
            cliente = await prisma.cliente.create({ data: { nome: clientName, telefone: contact !== 'Não informado' ? contact : null } });
          }
        } else {
          const updateClientData: any = {};
          if (contact && contact !== 'Não informado' && contact !== cliente.telefone) updateClientData.telefone = contact;
          if (cpf) updateClientData.cpf = cpf;
          if (clientObservation !== undefined) updateClientData.observacao = clientObservation;

          if (Object.keys(updateClientData).length > 0) {
            try {
              cliente = await prisma.cliente.update({ where: { id: cliente.id }, data: updateClientData });
            } catch {
              if (updateClientData.telefone) {
                cliente = await prisma.cliente.update({ where: { id: cliente.id }, data: { telefone: updateClientData.telefone } });
              }
            }
          }
        }
        dataUpdate.clienteId = cliente.id;
      }

      if (serviceNames && serviceNames.length > 0) {
        const servicosConectados = [];
        const nomes = Array.isArray(serviceNames) ? serviceNames : [serviceNames];
        for (const nome of nomes) {
          let servico = await prisma.servico.findFirst({ where: { nome } });
          if (!servico) servico = await prisma.servico.create({ data: { nome, preco: 0 } });
          servicosConectados.push({ id: servico.id });
        }
        dataUpdate.servicos = { set: servicosConectados };
      }

      const agendamentoAtualizado = await prisma.agendamento.update({
        where: { id }, data: dataUpdate, include: { cliente: true, colaborador: true, servicos: true }
      });
      notifyClients();
      res.json(agendamentoAtualizado);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar agendamento' });
    }
  });

  // 5. Rota para ATUALIZAR o status de um agendamento
  router.patch('/agendamentos/:id/status', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const agendamentoAtualizado = await prisma.agendamento.update({ where: { id: id }, data: { status } });
      notifyClients();
      res.json(agendamentoAtualizado);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar status do agendamento' });
    }
  });

  // Compatibilidade com frontend novo
  router.patch('/agendamentos/:id/concluir', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const agendamentoAtualizado = await prisma.agendamento.update({ where: { id }, data: { status: 'completed' } });
      notifyClients();
      res.json(agendamentoAtualizado);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao concluir agendamento' });
    }
  });

  // 5.5 Rota para REALOCAR um agendamento para outro colaborador
  router.patch('/agendamentos/:id/colaborador', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { colaboradorId } = req.body;
      const agendamentoAtualizado = await prisma.agendamento.update({ where: { id: id }, data: { colaboradorId } });
      notifyClients();
      res.json(agendamentoAtualizado);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao realocar agendamento' });
    }
  });

  // Compatibilidade com frontend novo
  router.patch('/agendamentos/:id/reassign', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { newEmployeeId } = req.body;
      const agendamentoAtualizado = await prisma.agendamento.update({ where: { id }, data: { colaboradorId: newEmployeeId } });
      notifyClients();
      res.json(agendamentoAtualizado);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao realocar agendamento' });
    }
  });

  // 6. Rota para DESCONECTAR (remover) serviços de um agendamento
  router.patch('/agendamentos/:id/servicos/remover', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const agendamentoAtualizado = await prisma.agendamento.update({
        where: { id: id }, data: { servicos: { set: [] } }, include: { cliente: true, colaborador: true, servicos: true }
      });
      notifyClients();
      res.json(agendamentoAtualizado);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao remover serviços do agendamento' });
    }
  });

  // 7. Rota para RELATÓRIO de clientes concluídos
  router.get('/agendamentos/relatorio/concluidos', verificarToken, async (req, res) => {
    try {
      const agendamentosConcluidos = await prisma.agendamento.findMany({
        where: { status: 'completed' }, include: { cliente: true, colaborador: true, servicos: true }, orderBy: { data: 'desc' }
      });
      res.json(agendamentosConcluidos);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
  });

  // 8. Rota para EXCLUIR um colaborador
  router.delete('/colaboradores/:id', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { reallocateTo } = req.query;
      
      if (reallocateTo && typeof reallocateTo === 'string') {
        await prisma.agendamento.updateMany({ where: { colaboradorId: id }, data: { colaboradorId: reallocateTo } });
      } else {
        await prisma.agendamento.deleteMany({ where: { colaboradorId: id } });
      }
      await prisma.colaborador.delete({ where: { id } });
      notifyClients();
      res.json({ mensagem: 'Colaborador excluído com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao excluir colaborador' });
    }
  });

  // 9. Rota para ATUALIZAR um colaborador
  router.put('/colaboradores/:id', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, email, especialidade, papel, senha, diasTrabalho } = req.body;
      const dataUpdate: any = { nome, email, especialidade, papel };
      if (diasTrabalho !== undefined) dataUpdate.diasTrabalho = diasTrabalho;
      if (senha) dataUpdate.senha = await bcrypt.hash(senha, 10);
      const colaboradorAtualizado = await prisma.colaborador.update({ where: { id }, data: dataUpdate });
      notifyClients();
      res.json(colaboradorAtualizado);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar colaborador' });
    }
  });

  // 10. Rotas de SERVIÇOS
  router.get('/servicos', verificarToken, async (req, res) => {
    try {
      const servicos = await prisma.servico.findMany({ orderBy: { nome: 'asc' } });
      res.json(servicos);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar serviços' });
    }
  });

  router.post('/servicos', verificarToken, async (req, res) => {
    try {
      const { nome, preco, duracao } = req.body;
      let servico;
      try {
        // Tenta salvar com duração
        servico = await prisma.servico.create({ data: { nome, preco: Number(preco), duracao: Number(duracao || 60) } });
      } catch (err) {
        // Fallback caso a coluna "duracao" não exista no schema Prisma do usuário
        servico = await prisma.servico.create({ data: { nome, preco: Number(preco) } });
      }
      notifyClients();
      res.status(201).json(servico);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar serviço' });
    }
  });

  router.put('/servicos/:id', verificarToken, async (req, res) => {
    try {
      const { nome, preco, duracao } = req.body;
      const serviceId = isNaN(Number(req.params.id)) ? req.params.id : Number(req.params.id);
      
      let servico;
      try {
        servico = await prisma.servico.update({
          where: { id: serviceId as any },
          data: { nome, preco: Number(preco), duracao: Number(duracao || 60) }
        });
      } catch (err) {
        servico = await prisma.servico.update({
          where: { id: serviceId as any },
          data: { nome, preco: Number(preco) }
        });
      }
      notifyClients();
      res.json(servico);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar serviço' });
    }
  });

  router.delete('/servicos/:id', verificarToken, async (req, res) => {
    try {
      const serviceId = isNaN(Number(req.params.id)) ? req.params.id : Number(req.params.id);
      await prisma.servico.delete({ where: { id: serviceId as any } });
      notifyClients();
      res.json({ mensagem: 'Serviço excluído' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao excluir serviço' });
    }
  });

  // 11. Rota para EXCLUIR (cancelar) agendamento
  router.delete('/agendamentos/:id', verificarToken, async (req, res) => {
    try {
      await prisma.agendamento.delete({ where: { id: req.params.id } });
      notifyClients();
      res.json({ mensagem: 'Agendamento cancelado com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao cancelar agendamento' });
    }
  });

  // 12. Rota para LISTAR todos os clientes
  router.get('/clientes', verificarToken, async (req, res) => {
    try {
      const clientes = await prisma.cliente.findMany({ orderBy: { nome: 'asc' } });
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar clientes' });
    }
  });

  // 13. Rota para ATUALIZAR um cliente
  router.put('/clientes/:id', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, telefone, observacao, cpf } = req.body;
      let clienteAtualizado;
      try {
        clienteAtualizado = await prisma.cliente.update({ where: { id }, data: { nome, telefone, observacao, cpf } as any });
      } catch (e) {
        clienteAtualizado = await prisma.cliente.update({ where: { id }, data: { nome, telefone } });
      }
      notifyClients();
      res.json(clienteAtualizado);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar cliente' });
    }
  });

  // 14. Rota para EXCLUIR um cliente
  router.delete('/clientes/:id', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.agendamento.deleteMany({ where: { clienteId: id } });
      await prisma.cliente.delete({ where: { id } });
      notifyClients();
      res.json({ mensagem: 'Cliente excluído com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao excluir cliente' });
    }
  });

  // 15. Rotas de BLOQUEIOS (Faltas e Intervalos)
  router.get('/bloqueios', verificarToken, async (req, res) => {
    try {
      const bloqueios = await prisma.bloqueio.findMany();
      res.json(bloqueios);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar bloqueios' });
    }
  });

  router.post('/bloqueios', verificarToken, async (req, res) => {
    try {
      const { data, horaInicio, horaFim, motivo, colaboradorId } = req.body;
      const novoBloqueio = await prisma.bloqueio.create({
        data: { data, horaInicio, horaFim, motivo, colaboradorId }
      });
      notifyClients();
      res.status(201).json(novoBloqueio);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar bloqueio' });
    }
  });

  router.delete('/bloqueios/:id', verificarToken, async (req, res) => {
    try {
      await prisma.bloqueio.delete({ where: { id: req.params.id } });
      notifyClients();
      res.json({ mensagem: 'Bloqueio removido com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao excluir bloqueio' });
    }
  });

  return router;
}