import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import crypto from 'node:crypto';
import fs from 'fs/promises';
import path from 'path';
import { parseISO, isBefore, format, addMinutes, startOfDay, endOfDay, isValid, getHours, getMinutes } from 'date-fns';

const prisma = new PrismaClient();
const JWT_SECRET = 'minha_chave_secreta_super_segura'; // Em produção, use process.env.JWT_SECRET
const JWT_EXPIRES_IN: SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '2h';

export function createRouter(io: Server) {
  const router = Router();

  // Função para avisar todos os dispositivos (TVs, Celulares) que algo mudou
  const notifyClients = () => io.emit('db_updated');

  // Local JSON-backed store para sobrescritas de escala (evita migrations imediatas)
  const OVERRIDES_FILE = path.join(process.cwd(), 'escala_overrides.json');

  const loadOverrides = async (): Promise<any[]> => {
    try {
      const raw = await fs.readFile(OVERRIDES_FILE, 'utf-8');
      return JSON.parse(raw || '[]');
    } catch (e) {
      return [];
    }
  };

  const saveOverrides = async (overrides: any[]) => {
    await fs.writeFile(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
  };

  const normalizeScaleSnapshot = (snapshot: any): { tipo: 'trabalho' | 'folga' | 'fds'; turno: string | null; descricao: string | null } | null => {
    if (!snapshot || typeof snapshot !== 'object') return null;
    if (snapshot.tipo !== 'trabalho' && snapshot.tipo !== 'folga' && snapshot.tipo !== 'fds') return null;
    return {
      tipo: snapshot.tipo,
      turno: typeof snapshot.turno === 'string' ? snapshot.turno : null,
      descricao: typeof snapshot.descricao === 'string' ? snapshot.descricao : null,
    };
  };

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

  const logInfo = (msg: string) => console.log(`[ROBUST API] ${msg}`);

  const verificarSupervisor = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || (user.papel !== 'supervisor' && user.papel !== 'admin')) {
      return res.status(403).json({ erro: 'Acesso negado. Ação restrita a supervisores.' });
    }
    next();
  };

  const usuarioEhSupervisor = (req: Request) => {
    const papel = (req as any).user?.papel;
    return papel === 'supervisor' || papel === 'admin';
  };

  const mascararCpf = (cpf?: string | null) => {
    if (!cpf) return cpf;
    const digitos = String(cpf).replace(/\D/g, '');
    if (digitos.length !== 11) return cpf;
    return `***.${digitos.slice(3, 6)}.***-${digitos.slice(9)}`;
  };

  const mascararTelefone = (telefone?: string | null) => {
    if (!telefone) return telefone;
    const digitos = String(telefone).replace(/\D/g, '');
    if (digitos.length < 8) return '(**) *****-****';

    const ddd = digitos.slice(0, 2) || '**';
    const sufixo = digitos.slice(-2).padStart(2, '*');
    return `(${ddd}) *****-**${sufixo}`;
  };

  const aplicarMascaraCliente = (cliente: any, mascararSensiveis: boolean) => {
    if (!cliente || !mascararSensiveis) return cliente;
    return {
      ...cliente,
      cpf: mascararCpf(cliente.cpf),
      telefone: mascararTelefone(cliente.telefone),
    };
  };

  const aplicarMascaraAgendamento = (agendamento: any, mascararSensiveis: boolean) => {
    if (!agendamento || !mascararSensiveis) return agendamento;
    return {
      ...agendamento,
      cliente: aplicarMascaraCliente(agendamento.cliente, true),
    };
  };

  const getScaleOverrideForDate = async (colaboradorId: string, data: string): Promise<{ tipo?: string | null; descricao?: string | null } | null> => {
    const key = `${colaboradorId}:${data}`;

    try {
      const tableCheck: any = await prisma.$queryRaw`SELECT to_regclass('public."EscalaOverride"')::text as r`;
      if (tableCheck?.[0]?.r) {
        const rows: any = await prisma.$queryRaw`SELECT "tipo", "descricao" FROM "EscalaOverride" WHERE "key" = ${key} LIMIT 1`;
        if (rows?.[0]) return rows[0];
      }
    } catch {
      // fallback below (JSON store)
    }

    const overrides = await loadOverrides();
    const found = overrides.find((entry: any) => entry?.key === key);
    return found ? { tipo: found.tipo, descricao: found.descricao } : null;
  };

  const getScaleUnavailabilityMessage = (override: { tipo?: string | null; descricao?: string | null } | null) => {
    if (!override?.tipo || override.tipo === 'trabalho') return null;

    const statusLabel = override.tipo === 'fds'
      ? 'FDS'
      : /f[eé]rias/i.test(override.descricao || '')
        ? 'Férias'
        : 'Folga';

    return `Profissional indisponível na escala: ${statusLabel}${override.descricao ? ` (${override.descricao})` : ''}.`;
  };

  const httpError = (status: number, erro: string) => Object.assign(new Error(erro), { httpStatus: status, httpMessage: erro });

  const isSerializationConflict = (error: any) => error?.code === 'P2034';

  const runSerializableTransaction = async <T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    attempts = 3,
  ): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        lastError = error;
        if (!isSerializationConflict(error) || attempt === attempts) {
          throw error;
        }
      }
    }

    throw lastError;
  };

  const validarLimitesAgendamento = (dataHora: Date, isCreation = true) => {
    if (!isValid(dataHora)) return 'Data ou hora inválida.';
    const horas = getHours(dataHora);
    const minutos = getMinutes(dataHora);
    if (horas < 8 || horas >= 20) return 'Agendamentos fora do horário de funcionamento (08:00 às 20:00) não são permitidos.';
    if (minutos % 15 !== 0) return 'Os horários devem ser múltiplos de 15 minutos (ex: 10:00, 10:15, 10:30).';
    if (isCreation) {
       const limitePassado = addMinutes(new Date(), -15);
       if (isBefore(dataHora, limitePassado)) return 'Não é possível criar agendamentos no passado.';
    }
    return null;
  };

  const parseAppointmentDateTime = (dateValue: unknown, timeValue?: unknown): Date => {
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue !== 'string') return new Date(NaN);

    const rawDate = dateValue.trim();
    if (!rawDate) return new Date(NaN);

    const normalizedTime = typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue.trim())
      ? `${timeValue.trim()}:00`
      : undefined;

    // Compatibilidade: aceita payload legado com data ISO completa.
    if (rawDate.includes('T')) {
      if (normalizedTime) {
        const onlyDate = rawDate.split('T')[0];
        return parseISO(`${onlyDate}T${normalizedTime}`);
      }
      return parseISO(rawDate);
    }

    return parseISO(`${rawDate}T${normalizedTime || '00:00:00'}`);
  };

  const normalizeText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const normalizeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value
      .map((entry) => typeof entry === 'string' ? entry.trim() : '')
      .filter(Boolean)));
  };

  const normalizeEligibilityMode = (value: unknown): 'livre' | 'cargo' | 'habilidade' => {
    if (value === 'cargo' || value === 'habilidade' || value === 'livre') return value;
    return 'livre';
  };

  const getServiceConnectionCandidates = async (
    db: Pick<PrismaClient, 'servico'> | Prisma.TransactionClient,
    serviceNames: string[] | string,
  ) => {
    const names = Array.from(new Set((Array.isArray(serviceNames) ? serviceNames : [serviceNames])
      .map((rawName) => typeof rawName === 'string' ? rawName.trim() : '')
      .filter(Boolean)));

    const services = [] as any[];
    for (const nome of names) {
      let servico = await db.servico.findFirst({ where: { nome } });
      if (!servico) {
        servico = await db.servico.create({
          data: {
            nome,
            preco: 0,
          },
        });
      }
      services.push(servico);
    }

    return services;
  };

  const getEligibilityErrorForCollaborator = async (
    db: Pick<PrismaClient, 'colaborador'> | Prisma.TransactionClient,
    colaboradorId: string,
    services: Array<{
      nome: string;
      modoElegibilidade?: string | null;
      cargosPermitidos?: string[] | null;
      habilidadesPermitidas?: string[] | null;
    }>,
  ): Promise<string | null> => {
    const colaborador = await db.colaborador.findUnique({
      where: { id: colaboradorId },
      select: {
        nome: true,
        cargo: true,
        especialidade: true,
        habilidades: true,
      },
    });

    if (!colaborador) return 'Profissional não encontrado.';

    const normalizedCargo = normalizeText(colaborador.cargo || colaborador.especialidade || '');
    const collaboratorSkills = new Set((colaborador.habilidades || []).map((skill) => normalizeText(String(skill))));

    for (const service of services) {
      const mode = normalizeEligibilityMode(service.modoElegibilidade);
      if (mode === 'livre') continue;

      if (mode === 'cargo') {
        const allowedCargos = normalizeStringArray(service.cargosPermitidos).map((cargo) => normalizeText(cargo));
        if (allowedCargos.length === 0 || !allowedCargos.includes(normalizedCargo)) {
          return `Profissional não habilitado para o serviço ${service.nome} (restrição por cargo).`;
        }
      }

      if (mode === 'habilidade') {
        const allowedSkills = normalizeStringArray(service.habilidadesPermitidas).map((skill) => normalizeText(skill));
        const hasCompatibleSkill = allowedSkills.some((skill) => collaboratorSkills.has(skill));
        if (allowedSkills.length === 0 || !hasCompatibleSkill) {
          return `Profissional não habilitado para o serviço ${service.nome} (restrição por habilidade).`;
        }
      }
    }

    return null;
  };

  const verificarConflito = async (
    db: Pick<PrismaClient, 'agendamento' | 'bloqueio'> | Prisma.TransactionClient,
    colaboradorId: string,
    dataNovaCapa: Date,
    duracaoTotalArgs: number,
    idAtual?: string,
  ) => {
    const startObj = dataNovaCapa;
    const endObj = addMinutes(dataNovaCapa, duracaoTotalArgs);

    const dayStart = startOfDay(dataNovaCapa);
    const dayEnd = endOfDay(dataNovaCapa);
    
    const agendamentosDia = await db.agendamento.findMany({
      where: {
        colaboradorId,
        data: { gte: dayStart, lte: dayEnd },
        status: { not: 'cancelled' },
        ...(idAtual ? { id: { not: idAtual } } : {})
      },
      include: { servicos: true }
    });

    for (const ag of agendamentosDia) {
       let durationAg = 0;
       if (ag.servicos && ag.servicos.length > 0) {
         durationAg = ag.servicos.reduce((acc, s) => {
           const higienizacao = Number((s as any).tempoHigienizacaoMin || 0);
           return acc + (s.duracao || 60) + higienizacao;
         }, 0);
       } else {
         durationAg = 60;
       }
       const agStart = ag.data;
       const agEnd = addMinutes(agStart, durationAg);

       if (isBefore(startObj, agEnd) && isBefore(agStart, endObj)) return { tipo: 'agendamento', id: ag.id };
    }

    const dateStr = format(dataNovaCapa, 'yyyy-MM-dd');
    const bloqueiosDia = await db.bloqueio.findMany({
      where: { colaboradorId, data: dateStr }
    });

    for (const b of bloqueiosDia) {
      if (idAtual && b.id === idAtual) continue;
      const bStartStr = `${b.data}T${b.horaInicio}:00`;
      const bEndStr = `${b.data}T${b.horaFim}:00`;
      let bStart = parseISO(bStartStr);
      let bEnd = parseISO(bEndStr);
      if (!isValid(bStart)) continue;
      if (isBefore(startObj, bEnd) && isBefore(bStart, endObj)) return { tipo: 'bloqueio', id: b.id };
    }
    return null;
  };

  const verificarCLTInterjornada = async (
    db: Pick<PrismaClient, 'agendamento'> | Prisma.TransactionClient,
    colaboradorId: string,
    dataNovaCapa: Date,
    duracaoNova: number,
    idAtual?: string
  ): Promise<string | null> => {
    const agAnterior = await db.agendamento.findFirst({
      where: {
        colaboradorId,
        data: { lt: dataNovaCapa },
        status: { not: 'cancelled' },
        ...(idAtual ? { id: { not: idAtual } } : {})
      },
      include: { servicos: true },
      orderBy: { data: 'desc' }
    });

    if (agAnterior) {
      const duracaoAnterior = agAnterior.servicos.reduce((acc: number, s: any) => acc + (s.duracao || 60) + (s.tempoHigienizacaoMin || 0), 0) || 60;
      const fimAnterior = addMinutes(agAnterior.data, duracaoAnterior);
      const horasDescanso = (dataNovaCapa.getTime() - fimAnterior.getTime()) / (1000 * 60 * 60);
      const diasDiferentes = fimAnterior.getDate() !== dataNovaCapa.getDate();
      
      if (horasDescanso > 0 && horasDescanso < 11 && (diasDiferentes || horasDescanso >= 4)) {
        return `Violação CLT (Interjornada): O descanso entre o último atendimento (${format(fimAnterior, 'dd/MM HH:mm')}) e este (${format(dataNovaCapa, 'dd/MM HH:mm')}) é de apenas ${horasDescanso.toFixed(1)}h. O mínimo legal é 11h.`;
      }
    }

    const fimNovo = addMinutes(dataNovaCapa, duracaoNova);
    const agPosterior = await db.agendamento.findFirst({
      where: {
        colaboradorId,
        data: { gte: fimNovo },
        status: { not: 'cancelled' },
        ...(idAtual ? { id: { not: idAtual } } : {})
      },
      orderBy: { data: 'asc' }
    });

    if (agPosterior) {
      const horasDescanso = (agPosterior.data.getTime() - fimNovo.getTime()) / (1000 * 60 * 60);
      const diasDiferentes = fimNovo.getDate() !== agPosterior.data.getDate();
      if (horasDescanso > 0 && horasDescanso < 11 && (diasDiferentes || horasDescanso >= 4)) {
        return `Violação CLT (Interjornada): O descanso entre este atendimento e o próximo (${format(agPosterior.data, 'dd/MM HH:mm')}) será de apenas ${horasDescanso.toFixed(1)}h. O mínimo legal é 11h.`;
      }
    }
    return null;
  };

  // 0. Rota de LOGIN (Pública - Sem bloqueio)
  router.post('/login', async (req, res) => {
    try {
      const { email, senha } = req.body;
      console.log(`\n[LOGIN] Recebendo tentativa de acesso para: ${email}`);

      if (email === 'admin@serenidade.com' && senha === '123456') {
        console.log('[LOGIN] ✅ Supervisor logado com sucesso (Acesso direto).');
        const token = jwt.sign({ id: 'admin', papel: 'supervisor' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
  const token = jwt.sign({ id: usuario.id, papel: usuario.papel }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
      const mascararSensiveis = !usuarioEhSupervisor(req);
      const payload = mascararSensiveis
        ? agendamentos.map((agendamento: any) => aplicarMascaraAgendamento(agendamento, true))
        : agendamentos;

      res.json(payload);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar agendamentos' });
    }
  });

  // 3. Rota para CRIAR um novo colaborador
  router.post('/colaboradores', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const {
        nome,
        email,
        especialidade,
        papel,
        senha,
        diasTrabalho,
        cargo,
        tipoEscala,
        folgasDomingoNoMes,
        cargaHorariaSemanal,
        habilidades,
      } = req.body;
      
      // Prevenção contra geração de e-mails homônimos/duplicados no Front-end
      const emailExiste = await prisma.colaborador.findUnique({ where: { email } });
      if (emailExiste) {
        return res.status(400).json({ erro: 'Este e-mail já está em uso por outro colaborador.' });
      }

      const hashSenha = senha ? await bcrypt.hash(senha, 10) : await bcrypt.hash('123456', 10);
      const colaboradorData: any = {
        nome,
        email,
        especialidade,
        cargo: cargo ?? especialidade,
        tipoEscala: tipoEscala || '6x1',
        folgasDomingoNoMes: Number.isFinite(Number(folgasDomingoNoMes)) ? Number(folgasDomingoNoMes) : 2,
        cargaHorariaSemanal: Number.isFinite(Number(cargaHorariaSemanal)) ? Number(cargaHorariaSemanal) : 40,
        habilidades: Array.isArray(habilidades) ? habilidades : [],
        senha: hashSenha,
        papel: papel || 'collaborator',
        ativo: true,
        diasTrabalho: diasTrabalho || '1,2,3,4,5,6',
      };

      const novoColaborador = await prisma.colaborador.create({
        data: colaboradorData,
      });
      notifyClients();
      res.status(201).json(novoColaborador);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar colaborador' });
    }
  });

  const appointmentLocks = new Map<string, Promise<void>>();

  const withAppointmentMutex = async <T>(lockKey: string, operation: () => Promise<T>): Promise<T> => {
    const previousLock = appointmentLocks.get(lockKey) || Promise.resolve();
    let releaseLock!: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const nextLock = previousLock.then(() => currentLock);
    appointmentLocks.set(lockKey, nextLock);

    try {
      await previousLock;
      return await operation();
    } finally {
      releaseLock();
      if (appointmentLocks.get(lockKey) === nextLock) {
        appointmentLocks.delete(lockKey);
      }
    }
  };

  const buildAppointmentLockKey = (colaboradorId: string, startAt: Date) => {
    const dayStart = startOfDay(startAt);
    return `${colaboradorId}:${dayStart.toISOString()}`;
  };

  const getAdvisoryLockParts = (lockKey: string): [number, number] => {
    const digest = crypto.createHash('sha256').update(lockKey).digest();
    return [digest.readInt32BE(0), digest.readInt32BE(4)];
  };

  const acquireAppointmentAdvisoryLock = async (tx: Prisma.TransactionClient, lockKey: string) => {
    const [lockHigh, lockLow] = getAdvisoryLockParts(lockKey);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockHigh}::integer, ${lockLow}::integer)`;
  };

  // 4. Rota para CRIAR um novo agendamento
  router.post('/agendamentos', verificarToken, async (req, res) => {
    const {
      clientName,
      collaboratorId: collaboratorIdRaw,
      assignedEmployeeId,
      date,
      time,
      serviceNames,
      services,
      contact,
      cpf,
      clientId,
      clientObservation,
    } = req.body;

    const collaboratorId = collaboratorIdRaw || assignedEmployeeId;
    const normalizedServiceNames = Array.isArray(serviceNames)
      ? serviceNames
      : Array.isArray(services)
        ? services
        : [];

    try {
      if (!collaboratorId) {
        return res.status(400).json({ erro: 'Profissional do agendamento não informado.' });
      }

      const parsedDate = parseAppointmentDateTime(date, time);
      const erroLimite = validarLimitesAgendamento(parsedDate, true);
      if (erroLimite) return res.status(400).json({ erro: erroLimite });

      const dayStr = format(parsedDate, 'yyyy-MM-dd');
      const dayOverride = await getScaleOverrideForDate(collaboratorId, dayStr);
      const dayUnavailableMessage = getScaleUnavailabilityMessage(dayOverride);
      if (dayUnavailableMessage) {
        return res.status(409).json({ erro: dayUnavailableMessage });
      }

      const lockKey = buildAppointmentLockKey(collaboratorId, parsedDate);
      const novoAgendamento = await withAppointmentMutex(lockKey, async () => runSerializableTransaction(async (tx) => {
        await acquireAppointmentAdvisoryLock(tx, lockKey);

        const servicosSelecionados = await getServiceConnectionCandidates(tx, normalizedServiceNames);
        const duracao = servicosSelecionados.reduce((total, servico) => total + (servico.duracao || 60) + (servico.tempoHigienizacaoMin || 0), 0) || 60;
        const conflito = await verificarConflito(tx, collaboratorId, parsedDate, duracao);
        if (conflito) throw httpError(409, 'Conflito de agenda com outro apontamento.');

        // Validação CLT (Interjornada 11h)
        const erroCLT = await verificarCLTInterjornada(tx, collaboratorId, parsedDate, duracao);
        if (erroCLT) throw httpError(409, erroCLT);

        const eligibilityError = await getEligibilityErrorForCollaborator(tx, collaboratorId, servicosSelecionados);
        if (eligibilityError) throw httpError(409, eligibilityError);

        let cliente = clientId ? await tx.cliente.findUnique({ where: { id: clientId } }) : null;

        if (!cliente && cpf) {
          cliente = await tx.cliente.findFirst({ where: { cpf } });
        }

        if (!cliente && contact && contact !== 'Não informado') {
          cliente = await tx.cliente.findFirst({ where: { telefone: contact } });
        }

        if (!cliente) {
          cliente = await tx.cliente.findFirst({ where: { nome: clientName } });
        }

        if (!cliente) {
          try {
            cliente = await tx.cliente.create({
              data: {
                nome: clientName,
                telefone: contact,
                cpf: cpf || null,
                observacao: clientObservation || null,
              } as any,
            });
          } catch {
            cliente = await tx.cliente.create({ data: { nome: clientName, telefone: contact } });
          }
        } else {
          const updateData: any = {};
          if (contact && contact !== 'Não informado') updateData.telefone = contact;
          if (cpf) updateData.cpf = cpf;
          if (clientObservation !== undefined) updateData.observacao = clientObservation;

          if (Object.keys(updateData).length > 0) {
            try {
              cliente = await tx.cliente.update({ where: { id: cliente.id }, data: updateData });
            } catch {
              const { telefone } = updateData;
              if (telefone) {
                cliente = await tx.cliente.update({ where: { id: cliente.id }, data: { telefone } });
              }
            }
          }
        }

        const servicosConectados = servicosSelecionados.map((servico) => ({ id: servico.id }));

        return tx.agendamento.create({
          data: {
            data: parsedDate,
            colaborador: { connect: { id: collaboratorId } },
            cliente: { connect: { id: cliente.id } },
            servicos: { connect: servicosConectados },
          },
          include: { cliente: true, colaborador: true, servicos: true },
        });
      }));

      notifyClients();
      const mascararSensiveis = !usuarioEhSupervisor(req);
      res.status(201).json(aplicarMascaraAgendamento(novoAgendamento, mascararSensiveis));
    } catch (error) {
      if ((error as any)?.httpStatus) {
        return res.status((error as any).httpStatus).json({ erro: (error as any).httpMessage || 'Erro na requisição.' });
      }
      res.status(500).json({ erro: 'Erro ao salvar agendamento' });
    }
  });

  // 4.5 Rota para ATUALIZAR (Editar) todos os dados de um agendamento
  router.put('/agendamentos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const {
      clientName,
      date,
      time,
      serviceNames,
      services,
      collaboratorId,
      assignedEmployeeId,
      colaboradorId,
      contact,
      cpf,
      clientObservation,
    } = req.body;

    const requestedColaboradorId = colaboradorId || collaboratorId || assignedEmployeeId;
    const normalizedServiceNames = Array.isArray(serviceNames)
      ? serviceNames
      : Array.isArray(services)
        ? services
        : undefined;

    try {
      const agendamentoAntigo = await prisma.agendamento.findUnique({ where: { id }, include: { servicos: true } });
      if (!agendamentoAntigo) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

      const hasDateUpdate = date !== undefined || time !== undefined;
      const finalDate = hasDateUpdate ? parseAppointmentDateTime(date ?? format(agendamentoAntigo.data, 'yyyy-MM-dd'), time) : agendamentoAntigo.data;
      if (hasDateUpdate) {
        const erroLimite = validarLimitesAgendamento(finalDate, false);
        if (erroLimite) return res.status(400).json({ erro: erroLimite });
      }

      const finalColaboradorId = requestedColaboradorId || agendamentoAntigo.colaboradorId;
      const finalDay = format(finalDate, 'yyyy-MM-dd');
      const dayOverride = await getScaleOverrideForDate(finalColaboradorId, finalDay);
      const dayUnavailableMessage = getScaleUnavailabilityMessage(dayOverride);
      if (dayUnavailableMessage) {
        return res.status(409).json({ erro: dayUnavailableMessage });
      }

      const lockKey = buildAppointmentLockKey(finalColaboradorId, finalDate);

      const agendamentoAtualizado = await withAppointmentMutex(lockKey, async () => runSerializableTransaction(async (tx) => {
        await acquireAppointmentAdvisoryLock(tx, lockKey);

        const dataUpdate: any = {};
        const agendamentoAtualTx = await tx.agendamento.findUnique({ where: { id }, include: { servicos: true } });
        if (!agendamentoAtualTx) throw httpError(404, 'Agendamento não encontrado.');

        const nomesServicos = normalizedServiceNames || agendamentoAtualTx.servicos.map((s: any) => s.nome);
        const servicosSelecionados = await getServiceConnectionCandidates(tx, nomesServicos);
        const duracao = servicosSelecionados.reduce((total, servico) => total + (servico.duracao || 60) + (servico.tempoHigienizacaoMin || 0), 0) || 60;
        const conflito = await verificarConflito(tx, finalColaboradorId, finalDate, duracao, id);
        if (conflito) throw httpError(409, 'Conflito de agenda. O horário coincide com outro compromisso.');

        // Validação CLT (Interjornada 11h)
        const erroCLT = await verificarCLTInterjornada(tx, finalColaboradorId, finalDate, duracao, id);
        if (erroCLT) throw httpError(409, erroCLT);

        const eligibilityError = await getEligibilityErrorForCollaborator(tx, finalColaboradorId, servicosSelecionados);
        if (eligibilityError) throw httpError(409, eligibilityError);

        if (hasDateUpdate) dataUpdate.data = finalDate;
        if (requestedColaboradorId) dataUpdate.colaboradorId = requestedColaboradorId;

        if (clientName) {
          let cliente = (contact && contact !== 'Não informado')
            ? await tx.cliente.findFirst({ where: { telefone: contact } })
            : null;

          if (!cliente && cpf) {
            cliente = await tx.cliente.findFirst({ where: { cpf } });
          }

          if (!cliente) {
            cliente = await tx.cliente.findFirst({ where: { nome: clientName } });
          }

          if (!cliente) {
            try {
              cliente = await tx.cliente.create({ data: { nome: clientName, telefone: contact !== 'Não informado' ? contact : null, cpf: cpf || null, observacao: clientObservation || null } as any });
            } catch {
              cliente = await tx.cliente.create({ data: { nome: clientName, telefone: contact !== 'Não informado' ? contact : null } });
            }
          } else {
            const updateClientData: any = {};
            if (contact && contact !== 'Não informado' && contact !== cliente.telefone) updateClientData.telefone = contact;
            if (cpf) updateClientData.cpf = cpf;
            if (clientObservation !== undefined) updateClientData.observacao = clientObservation;

            if (Object.keys(updateClientData).length > 0) {
              try {
                cliente = await tx.cliente.update({ where: { id: cliente.id }, data: updateClientData });
              } catch {
                if (updateClientData.telefone) {
                  cliente = await tx.cliente.update({ where: { id: cliente.id }, data: { telefone: updateClientData.telefone } });
                }
              }
            }
          }
          dataUpdate.clienteId = cliente.id;
        }

        if (normalizedServiceNames && normalizedServiceNames.length > 0) {
          const servicosConectados = servicosSelecionados.map((servico) => ({ id: servico.id }));
          dataUpdate.servicos = { set: servicosConectados };
        }

        return tx.agendamento.update({
          where: { id }, data: dataUpdate, include: { cliente: true, colaborador: true, servicos: true },
        });
      }));

      notifyClients();
      const mascararSensiveis = !usuarioEhSupervisor(req);
      res.json(aplicarMascaraAgendamento(agendamentoAtualizado, mascararSensiveis));
    } catch (error) {
      if ((error as any)?.httpStatus) {
        return res.status((error as any).httpStatus).json({ erro: (error as any).httpMessage || 'Erro na requisição.' });
      }
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
      if (!colaboradorId) {
        return res.status(400).json({ erro: 'Informe o colaborador de destino.' });
      }

      const agendamento = await prisma.agendamento.findUnique({
        where: { id },
        include: { servicos: true },
      });
      if (!agendamento) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      }

      const targetDay = format(agendamento.data, 'yyyy-MM-dd');
      const dayOverride = await getScaleOverrideForDate(colaboradorId, targetDay);
      const dayUnavailableMessage = getScaleUnavailabilityMessage(dayOverride);
      if (dayUnavailableMessage) {
        return res.status(409).json({ erro: dayUnavailableMessage });
      }

      const lockKey = buildAppointmentLockKey(colaboradorId, agendamento.data);
      const agendamentoAtualizado = await withAppointmentMutex(lockKey, async () => runSerializableTransaction(async (tx) => {
        await acquireAppointmentAdvisoryLock(tx, lockKey);

        const agendamentoAtualTx = await tx.agendamento.findUnique({
          where: { id },
          include: { servicos: true },
        });
        if (!agendamentoAtualTx) throw httpError(404, 'Agendamento não encontrado.');

        const txDay = format(agendamentoAtualTx.data, 'yyyy-MM-dd');
        const txDayOverride = await getScaleOverrideForDate(colaboradorId, txDay);
        const txDayUnavailableMessage = getScaleUnavailabilityMessage(txDayOverride);
        if (txDayUnavailableMessage) throw httpError(409, txDayUnavailableMessage);

        const eligibilityError = await getEligibilityErrorForCollaborator(tx, colaboradorId, agendamentoAtualTx.servicos);
        if (eligibilityError) throw httpError(409, eligibilityError);

        const duracao = agendamentoAtualTx.servicos.reduce((acc: number, servico: any) => acc + (servico.duracao || 60) + (servico.tempoHigienizacaoMin || 0), 0) || 60;
        const conflito = await verificarConflito(tx, colaboradorId, agendamentoAtualTx.data, duracao, id);
        if (conflito) throw httpError(409, 'Conflito de agenda. O horário coincide com outro compromisso.');

        // Validação CLT (Interjornada 11h)
        const erroCLT = await verificarCLTInterjornada(tx, colaboradorId, agendamentoAtualTx.data, duracao, id);
        if (erroCLT) throw httpError(409, erroCLT);

        return tx.agendamento.update({
          where: { id },
          data: { colaboradorId },
          include: { cliente: true, colaborador: true, servicos: true },
        });
      }));

      notifyClients();
      res.json(agendamentoAtualizado);
    } catch (error) {
      if ((error as any)?.httpStatus) {
        return res.status((error as any).httpStatus).json({ erro: (error as any).httpMessage || 'Erro na requisição.' });
      }
      res.status(500).json({ erro: 'Erro ao realocar agendamento' });
    }
  });

  // Compatibilidade com frontend novo
  router.patch('/agendamentos/:id/reassign', verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { newEmployeeId } = req.body;
      if (!newEmployeeId) {
        return res.status(400).json({ erro: 'Informe o colaborador de destino.' });
      }

      const agendamento = await prisma.agendamento.findUnique({
        where: { id },
        include: { servicos: true },
      });
      if (!agendamento) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      }

      const targetDay = format(agendamento.data, 'yyyy-MM-dd');
      const dayOverride = await getScaleOverrideForDate(newEmployeeId, targetDay);
      const dayUnavailableMessage = getScaleUnavailabilityMessage(dayOverride);
      if (dayUnavailableMessage) {
        return res.status(409).json({ erro: dayUnavailableMessage });
      }

      const lockKey = buildAppointmentLockKey(newEmployeeId, agendamento.data);
      const agendamentoAtualizado = await withAppointmentMutex(lockKey, async () => runSerializableTransaction(async (tx) => {
        await acquireAppointmentAdvisoryLock(tx, lockKey);

        const agendamentoAtualTx = await tx.agendamento.findUnique({
          where: { id },
          include: { servicos: true },
        });
        if (!agendamentoAtualTx) throw httpError(404, 'Agendamento não encontrado.');

        const txDay = format(agendamentoAtualTx.data, 'yyyy-MM-dd');
        const txDayOverride = await getScaleOverrideForDate(newEmployeeId, txDay);
        const txDayUnavailableMessage = getScaleUnavailabilityMessage(txDayOverride);
        if (txDayUnavailableMessage) throw httpError(409, txDayUnavailableMessage);

        const eligibilityError = await getEligibilityErrorForCollaborator(tx, newEmployeeId, agendamentoAtualTx.servicos);
        if (eligibilityError) throw httpError(409, eligibilityError);

        const duracao = agendamentoAtualTx.servicos.reduce((acc: number, servico: any) => acc + (servico.duracao || 60) + (servico.tempoHigienizacaoMin || 0), 0) || 60;
        const conflito = await verificarConflito(tx, newEmployeeId, agendamentoAtualTx.data, duracao, id);
        if (conflito) throw httpError(409, 'Conflito de agenda. O horário coincide com outro compromisso.');

        // Validação CLT (Interjornada 11h)
        const erroCLT = await verificarCLTInterjornada(tx, newEmployeeId, agendamentoAtualTx.data, duracao, id);
        if (erroCLT) throw httpError(409, erroCLT);

        return tx.agendamento.update({
          where: { id },
          data: { colaboradorId: newEmployeeId },
          include: { cliente: true, colaborador: true, servicos: true },
        });
      }));

      notifyClients();
      res.json(agendamentoAtualizado);
    } catch (error) {
      if ((error as any)?.httpStatus) {
        return res.status((error as any).httpStatus).json({ erro: (error as any).httpMessage || 'Erro na requisição.' });
      }
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
      const mascararSensiveis = !usuarioEhSupervisor(req);
      const payload = mascararSensiveis
        ? agendamentosConcluidos.map((agendamento: any) => aplicarMascaraAgendamento(agendamento, true))
        : agendamentosConcluidos;
      res.json(payload);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
  });

  // 8. Rota para EXCLUIR um colaborador
  router.delete('/colaboradores/:id', verificarToken, verificarSupervisor, async (req, res) => {
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
  router.put('/colaboradores/:id', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nome,
        email,
        especialidade,
        papel,
        senha,
        diasTrabalho,
        cargo,
        tipoEscala,
        folgasDomingoNoMes,
        cargaHorariaSemanal,
        habilidades,
      } = req.body;

      const dataUpdate: any = { nome, email, especialidade, papel };
      if (diasTrabalho !== undefined) dataUpdate.diasTrabalho = diasTrabalho;
      if (senha) dataUpdate.senha = await bcrypt.hash(senha, 10);
      if (cargo !== undefined) dataUpdate.cargo = cargo;
      if (tipoEscala !== undefined) dataUpdate.tipoEscala = tipoEscala;
      if (folgasDomingoNoMes !== undefined) dataUpdate.folgasDomingoNoMes = Number(folgasDomingoNoMes);
      if (cargaHorariaSemanal !== undefined) dataUpdate.cargaHorariaSemanal = Number(cargaHorariaSemanal);
      if (habilidades !== undefined) dataUpdate.habilidades = Array.isArray(habilidades) ? habilidades : [];
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

  const normalizeServicePayload = (payload: any): {
    data?: {
      nome: string;
      preco: number;
      duracao: number;
      icone: string;
      descricao: string;
      modoElegibilidade: 'livre' | 'cargo' | 'habilidade';
      cargosPermitidos: string[];
      habilidadesPermitidas: string[];
      categoria: string;
      tempoHigienizacaoMin: number;
      comissaoPercentual: number | null;
    };
    erro?: string;
  } => {
    const nome = typeof payload?.nome === 'string' ? payload.nome.trim() : '';
    const preco = Number(payload?.preco);
    const duracao = Number(payload?.duracao);
    const icone = typeof payload?.icone === 'string' ? payload.icone.trim() : '';
    const descricao = typeof payload?.descricao === 'string' ? payload.descricao.trim() : '';
    const categoria = typeof payload?.categoria === 'string' ? payload.categoria.trim() : '';
    const tempoHigienizacaoMin = Number(payload?.tempoHigienizacaoMin) || 0;
    const comissaoPercentual = payload?.comissaoPercentual !== undefined && payload?.comissaoPercentual !== null && payload?.comissaoPercentual !== '' ? Number(payload.comissaoPercentual) : null;
    const modoElegibilidade = normalizeEligibilityMode(payload?.modoElegibilidade);
    const cargosPermitidos = modoElegibilidade === 'cargo'
      ? normalizeStringArray(payload?.cargosPermitidos)
      : [];
    const habilidadesPermitidas = modoElegibilidade === 'habilidade'
      ? normalizeStringArray(payload?.habilidadesPermitidas)
      : [];

    if (!nome || nome.length < 3) {
      return { erro: 'O nome do serviço deve ter ao menos 3 caracteres.' };
    }

    if (nome.length > 80) {
      return { erro: 'O nome do serviço deve ter no máximo 80 caracteres.' };
    }

    if (!Number.isFinite(preco) || preco < 0) {
      return { erro: 'Informe um preço válido (maior ou igual a zero).' };
    }

    if (!Number.isInteger(duracao) || duracao < 5 || duracao > 480 || duracao % 5 !== 0) {
      return { erro: 'A duração deve ser um número inteiro entre 5 e 480 minutos (múltiplos de 5).' };
    }

    if (icone && icone.length > 64) {
      return { erro: 'Ícone inválido para o serviço.' };
    }

    if (descricao.length > 500) {
      return { erro: 'A descrição deve ter no máximo 500 caracteres.' };
    }

    if (modoElegibilidade === 'cargo' && cargosPermitidos.length === 0) {
      return { erro: 'Selecione ao menos um cargo para serviços com restrição por cargo.' };
    }

    if (modoElegibilidade === 'habilidade' && habilidadesPermitidas.length === 0) {
      return { erro: 'Selecione ao menos uma habilidade para serviços com restrição por habilidade.' };
    }

    return {
      data: {
        nome,
        preco,
        duracao,
        icone: icone || 'spa',
        descricao,
        modoElegibilidade,
        cargosPermitidos,
        habilidadesPermitidas,
        categoria,
        tempoHigienizacaoMin,
        comissaoPercentual,
      },
    };
  };

  router.post('/servicos', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const normalized = normalizeServicePayload(req.body);
      if (!normalized.data) {
        return res.status(400).json({ erro: normalized.erro || 'Dados de serviço inválidos.' });
      }

      const servicoExistente = await prisma.servico.findFirst({
        where: {
          nome: {
            equals: normalized.data.nome,
            mode: 'insensitive',
          },
        },
      });

      if (servicoExistente) {
        return res.status(409).json({ erro: 'Já existe um serviço com este nome.' });
      }

      const servico = await prisma.servico.create({ data: normalized.data });
      notifyClients();
      res.status(201).json(servico);
    } catch (error) {
      if ((error as any)?.code === 'P2002') {
        return res.status(409).json({ erro: 'Já existe um serviço com este nome.' });
      }
      res.status(500).json({ erro: 'Erro ao criar serviço' });
    }
  });

  router.put('/servicos/:id', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const { id } = req.params;
      const normalized = normalizeServicePayload(req.body);
      if (!normalized.data) {
        return res.status(400).json({ erro: normalized.erro || 'Dados de serviço inválidos.' });
      }

      const servicoAtual = await prisma.servico.findUnique({ where: { id } });
      if (!servicoAtual) {
        return res.status(404).json({ erro: 'Serviço não encontrado.' });
      }

      const servicoComMesmoNome = await prisma.servico.findFirst({
        where: {
          nome: {
            equals: normalized.data.nome,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (servicoComMesmoNome) {
        return res.status(409).json({ erro: 'Já existe um serviço com este nome.' });
      }

      const servico = await prisma.servico.update({
        where: { id },
        data: normalized.data,
      });

      notifyClients();
      res.json(servico);
    } catch (error) {
      if ((error as any)?.code === 'P2002') {
        return res.status(409).json({ erro: 'Já existe um serviço com este nome.' });
      }
      res.status(500).json({ erro: 'Erro ao atualizar serviço' });
    }
  });

  router.delete('/servicos/:id', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const { id } = req.params;
      const servicoAtual = await prisma.servico.findUnique({ where: { id } });
      if (!servicoAtual) {
        return res.status(404).json({ erro: 'Serviço não encontrado.' });
      }

      await prisma.servico.delete({ where: { id } });
      notifyClients();
      res.json({ mensagem: 'Serviço excluído' });
    } catch (error) {
      if ((error as any)?.code === 'P2003') {
        return res.status(409).json({ erro: 'Não é possível excluir um serviço vinculado a agendamentos.' });
      }
      res.status(500).json({ erro: 'Erro ao excluir serviço' });
    }
  });

  // 11. Rota para EXCLUIR (cancelar) agendamento
  router.delete('/agendamentos/:id', verificarToken, verificarSupervisor, async (req, res) => {
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

      if (!usuarioEhSupervisor(req)) {
        const clientesMascarados = clientes.map((cliente: any) => ({
          ...cliente,
          cpf: mascararCpf(cliente.cpf),
          telefone: mascararTelefone(cliente.telefone),
        }));
        return res.json(clientesMascarados);
      }

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

  router.post('/bloqueios', verificarToken, verificarSupervisor, async (req, res) => {
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

  router.delete('/bloqueios/:id', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      await prisma.bloqueio.delete({ where: { id: req.params.id } });
      notifyClients();
      res.json({ mensagem: 'Bloqueio removido com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao excluir bloqueio' });
    }
  });

  // ---- Escala: sobrescritas, trocas e replicação (JSON store leve) ----
  router.get('/escala/overrides', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const month = typeof req.query.month === 'string' ? req.query.month : null;
      const colaboradorId = typeof req.query.colaboradorId === 'string' ? req.query.colaboradorId : null;

      const applyFilters = (rows: any[]) => {
        return rows.filter((row) => {
          if (colaboradorId && row.colaboradorId !== colaboradorId) return false;
          if (month && typeof row.data === 'string' && !row.data.startsWith(`${month}-`)) return false;
          return true;
        });
      };

      try {
        const rows = await runSerializableTransaction(async (tx) => {
          const tableCheck: any = await tx.$queryRaw`SELECT to_regclass('public."EscalaOverride"')::text as r`;
          if (!tableCheck || !tableCheck[0] || !tableCheck[0].r) throw new Error('NO_TABLE');
          const result: any = await tx.$queryRaw`SELECT * FROM "EscalaOverride"`;
          return result || [];
        });

        return res.json(applyFilters(rows));
      } catch (err) {
        if ((err as any).message !== 'NO_TABLE') throw err;
        const overrides = await loadOverrides();
        return res.json(applyFilters(overrides));
      }
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar overrides de escala' });
    }
  });

  router.post('/escala/override', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const { colaboradorId, data, tipo, turno, descricao } = req.body;
      if (!colaboradorId || !data) return res.status(400).json({ erro: 'colaboradorId e data são obrigatórios' });

      const normalizedTipo = tipo === 'trabalho' || tipo === 'folga' || tipo === 'fds' ? tipo : 'trabalho';
      const normalizedTurno = normalizedTipo === 'trabalho' && typeof turno === 'string' ? turno : null;
      const normalizedDescricao = typeof descricao === 'string' ? descricao : null;

      const key = `${colaboradorId}:${data}`;
      const nowDate = new Date();
      const nowIso = nowDate.toISOString();

      try {
        // Tenta persistir em tabela dedicada (EscalaOverride) com transação serializável
        const result = await runSerializableTransaction(async (tx) => {
          await acquireAppointmentAdvisoryLock(tx, `override:${key}`);
          // Verifica se a tabela existe
          const tableCheck: any = await tx.$queryRaw`SELECT to_regclass('public."EscalaOverride"')::text as r`;
          if (!tableCheck || !tableCheck[0] || !tableCheck[0].r) {
            throw new Error('NO_TABLE');
          }

          await tx.$executeRaw`
            INSERT INTO "EscalaOverride" ("key", "colaboradorId", "data", "tipo", "turno", "descricao", "atualizadoEm")
            VALUES (${key}, ${colaboradorId}, ${data}, ${normalizedTipo}, ${normalizedTurno}, ${normalizedDescricao}, ${nowDate})
            ON CONFLICT ("key") DO UPDATE SET "tipo" = EXCLUDED."tipo", "turno" = EXCLUDED."turno", "descricao" = EXCLUDED."descricao", "atualizadoEm" = EXCLUDED."atualizadoEm";
          `;

          const rows: any = await tx.$queryRaw`SELECT * FROM "EscalaOverride" WHERE "key" = ${key}`;
          return rows[0] || null;
        });

        notifyClients();
        return res.json(result);
      } catch (err) {
        logInfo(`[ESCALA] Fallback JSON em /escala/override (${(err as any)?.message || 'erro desconhecido'})`);
        // fallback para JSON store
        const overrides = await loadOverrides();
        const idx = overrides.findIndex((o: any) => o.key === key);
        const entry = { key, colaboradorId, data, tipo: normalizedTipo, turno: normalizedTurno, descricao: normalizedDescricao, atualizadoEm: nowIso };
        if (idx >= 0) overrides[idx] = { ...overrides[idx], ...entry }; else overrides.push(entry);
        await saveOverrides(overrides);
        notifyClients();
        return res.json(entry);
      }
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao salvar override de escala' });
    }
  });

  router.post('/escala/swap', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const { from, to } = req.body; // { from: { colaboradorId, data }, to: { colaboradorId, data } }
      if (!from || !to || !from.colaboradorId || !from.data || !to.colaboradorId || !to.data) {
        return res.status(400).json({ erro: 'Payload inválido. Use { from: { colaboradorId, data }, to: { colaboradorId, data } }' });
      }

      const fromKey = `${from.colaboradorId}:${from.data}`;
      const toKey = `${to.colaboradorId}:${to.data}`;
      const nowDate = new Date();
      const nowIso = nowDate.toISOString();
      const fromSnapshot = normalizeScaleSnapshot(from.snapshot);
      const toSnapshot = normalizeScaleSnapshot(to.snapshot);
      const normalizeTipo = (value: unknown): 'trabalho' | 'folga' | 'fds' => {
        if (value === 'trabalho' || value === 'folga' || value === 'fds') return value;
        return 'trabalho';
      };

      const normalizeTurno = (tipo: 'trabalho' | 'folga' | 'fds', value: unknown): string | null => {
        if (tipo !== 'trabalho') return null;
        return typeof value === 'string' ? value : null;
      };

      try {
        const result = await runSerializableTransaction(async (tx) => {
          // locks for both keys to avoid race
          await acquireAppointmentAdvisoryLock(tx, `override:${fromKey}`);
          await acquireAppointmentAdvisoryLock(tx, `override:${toKey}`);

          const tableCheck: any = await tx.$queryRaw`SELECT to_regclass('public."EscalaOverride"')::text as r`;
          if (!tableCheck || !tableCheck[0] || !tableCheck[0].r) throw new Error('NO_TABLE');

          const fromRows: any = await tx.$queryRaw`SELECT * FROM "EscalaOverride" WHERE "key" = ${fromKey}`;
          const toRows: any = await tx.$queryRaw`SELECT * FROM "EscalaOverride" WHERE "key" = ${toKey}`;
          const fromVal = fromRows[0] || {
            key: fromKey,
            tipo: fromSnapshot?.tipo ?? 'trabalho',
            turno: fromSnapshot?.tipo === 'trabalho' ? (fromSnapshot?.turno ?? null) : null,
            descricao: fromSnapshot?.descricao ?? null,
          };
          const toVal = toRows[0] || {
            key: toKey,
            tipo: toSnapshot?.tipo ?? 'trabalho',
            turno: toSnapshot?.tipo === 'trabalho' ? (toSnapshot?.turno ?? null) : null,
            descricao: toSnapshot?.descricao ?? null,
          };

          const fromTipo = normalizeTipo(fromVal.tipo);
          const toTipo = normalizeTipo(toVal.tipo);
          const newFrom = {
            ...fromVal,
            tipo: toTipo,
            turno: normalizeTurno(toTipo, toVal.turno),
            descricao: typeof toVal.descricao === 'string' ? toVal.descricao : null,
            atualizadoEm: nowIso,
          };
          const newTo = {
            ...toVal,
            tipo: fromTipo,
            turno: normalizeTurno(fromTipo, fromVal.turno),
            descricao: typeof fromVal.descricao === 'string' ? fromVal.descricao : null,
            atualizadoEm: nowIso,
          };

          await tx.$executeRaw`
            INSERT INTO "EscalaOverride" ("key","colaboradorId","data","tipo","turno","descricao","atualizadoEm")
            VALUES (${newFrom.key}, ${from.colaboradorId}, ${from.data}, ${newFrom.tipo ?? null}, ${newFrom.turno ?? null}, ${newFrom.descricao ?? null}, ${nowDate})
            ON CONFLICT ("key") DO UPDATE SET "tipo" = EXCLUDED."tipo", "turno" = EXCLUDED."turno", "descricao" = EXCLUDED."descricao", "atualizadoEm" = EXCLUDED."atualizadoEm";
          `;

          await tx.$executeRaw`
            INSERT INTO "EscalaOverride" ("key","colaboradorId","data","tipo","turno","descricao","atualizadoEm")
            VALUES (${newTo.key}, ${to.colaboradorId}, ${to.data}, ${newTo.tipo ?? null}, ${newTo.turno ?? null}, ${newTo.descricao ?? null}, ${nowDate})
            ON CONFLICT ("key") DO UPDATE SET "tipo" = EXCLUDED."tipo", "turno" = EXCLUDED."turno", "descricao" = EXCLUDED."descricao", "atualizadoEm" = EXCLUDED."atualizadoEm";
          `;

          return { from: newFrom, to: newTo };
        });

        notifyClients();
        return res.json(result);
      } catch (err) {
        logInfo(`[ESCALA] Fallback JSON em /escala/swap (${(err as any)?.message || 'erro desconhecido'})`);
        // fallback JSON swap
        const overrides = await loadOverrides();
        const fromIdx = overrides.findIndex((o: any) => o.key === fromKey);
        const toIdx = overrides.findIndex((o: any) => o.key === toKey);
        const fromVal = fromIdx >= 0
          ? { ...overrides[fromIdx] }
          : {
              key: fromKey,
              colaboradorId: from.colaboradorId,
              data: from.data,
              tipo: fromSnapshot?.tipo ?? 'trabalho',
              turno: fromSnapshot?.tipo === 'trabalho' ? (fromSnapshot?.turno ?? null) : null,
              descricao: fromSnapshot?.descricao ?? null,
            };
        const toVal = toIdx >= 0
          ? { ...overrides[toIdx] }
          : {
              key: toKey,
              colaboradorId: to.colaboradorId,
              data: to.data,
              tipo: toSnapshot?.tipo ?? 'trabalho',
              turno: toSnapshot?.tipo === 'trabalho' ? (toSnapshot?.turno ?? null) : null,
              descricao: toSnapshot?.descricao ?? null,
            };
        const fromTipo = normalizeTipo(fromVal.tipo);
        const toTipo = normalizeTipo(toVal.tipo);
        const newFrom = {
          ...fromVal,
          tipo: toTipo,
          turno: normalizeTurno(toTipo, toVal.turno),
          descricao: typeof toVal.descricao === 'string' ? toVal.descricao : null,
          atualizadoEm: nowIso,
        };
        const newTo = {
          ...toVal,
          tipo: fromTipo,
          turno: normalizeTurno(fromTipo, fromVal.turno),
          descricao: typeof fromVal.descricao === 'string' ? fromVal.descricao : null,
          atualizadoEm: nowIso,
        };
        if (fromIdx >= 0) overrides[fromIdx] = newFrom; else overrides.push(newFrom);
        if (toIdx >= 0) overrides[toIdx] = newTo; else overrides.push(newTo);
        await saveOverrides(overrides);
        notifyClients();
        return res.json({ from: newFrom, to: newTo });
      }
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao executar troca de escala' });
    }
  });

  router.post('/escala/replicate', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const { colaboradorId, data, targetDates, source } = req.body; // targetDates: string[]
      if (!colaboradorId || !data || !Array.isArray(targetDates)) return res.status(400).json({ erro: 'Payload inválido' });

      const sourceKey = `${colaboradorId}:${data}`;
      const nowDate = new Date();
      const nowIso = nowDate.toISOString();
      const sourceSnapshot = normalizeScaleSnapshot(source);

      try {
        const result = await runSerializableTransaction(async (tx) => {
          await acquireAppointmentAdvisoryLock(tx, `override:${sourceKey}`);
          const tableCheck: any = await tx.$queryRaw`SELECT to_regclass('public."EscalaOverride"')::text as r`;
          if (!tableCheck || !tableCheck[0] || !tableCheck[0].r) throw new Error('NO_TABLE');

          const sourceRows: any = await tx.$queryRaw`SELECT * FROM "EscalaOverride" WHERE "key" = ${sourceKey}`;
          const sourceOverride = sourceRows[0] || (sourceSnapshot ? {
            tipo: sourceSnapshot.tipo,
            turno: sourceSnapshot.turno,
            descricao: sourceSnapshot.descricao,
          } : null);
          if (!sourceOverride) throw httpError(404, 'Fonte não encontrada para replicação');

          const created: any[] = [];
          for (const target of targetDates) {
            const key = `${colaboradorId}:${target}`;
            await tx.$executeRaw`
              INSERT INTO "EscalaOverride" ("key","colaboradorId","data","tipo","turno","descricao","atualizadoEm")
              VALUES (${key}, ${colaboradorId}, ${target}, ${sourceOverride.tipo ?? null}, ${sourceOverride.turno ?? null}, ${sourceOverride.descricao ?? null}, ${nowDate})
              ON CONFLICT ("key") DO UPDATE SET "tipo" = EXCLUDED."tipo", "turno" = EXCLUDED."turno", "descricao" = EXCLUDED."descricao", "atualizadoEm" = EXCLUDED."atualizadoEm";
            `;
            created.push({
              key,
              colaboradorId,
              data: target,
              tipo: sourceOverride.tipo,
              turno: sourceOverride.turno,
              descricao: sourceOverride.descricao,
              atualizadoEm: nowIso,
            });
          }

          return created;
        });

        notifyClients();
        return res.json({ replicated: result });
      } catch (err) {
        logInfo(`[ESCALA] Fallback JSON em /escala/replicate (${(err as any)?.message || 'erro desconhecido'})`);
        // fallback JSON replicate
        const overrides = await loadOverrides();
        const sourceOverride = overrides.find((o: any) => o.key === sourceKey) || (sourceSnapshot ? {
          tipo: sourceSnapshot.tipo,
          turno: sourceSnapshot.turno,
          descricao: sourceSnapshot.descricao,
        } : null);
        if (!sourceOverride) return res.status(404).json({ erro: 'Fonte não encontrada para replicação' });
        const created: any[] = [];
        for (const target of targetDates) {
          const key = `${colaboradorId}:${target}`;
          const idx = overrides.findIndex((o: any) => o.key === key);
          const entry = {
            key,
            colaboradorId,
            data: target,
            tipo: sourceOverride.tipo,
            turno: sourceOverride.turno,
            descricao: sourceOverride.descricao,
            atualizadoEm: nowIso,
          };
          if (idx >= 0) overrides[idx] = entry; else overrides.push(entry);
          created.push(entry);
        }
        await saveOverrides(overrides);
        notifyClients();
        return res.json({ replicated: created });
      }
    } catch (error) {
      if ((error as any)?.httpStatus) {
        return res.status((error as any).httpStatus).json({ erro: (error as any).httpMessage || 'Erro na requisição.' });
      }
      res.status(500).json({ erro: 'Erro ao replicar escala' });
    }
  });

  // ---- Trocas de Turno (Portal do Colaborador -> Supervisor) ----
  const SWAPS_FILE = path.join(process.cwd(), 'turno_swaps.json');
  type TurnoSwapEntry = {
    id: string;
    colaboradorId: string;
    dataOriginal: string;
    dataSolicitada: string;
    motivo?: string;
    status: string;
    respostaObservacao?: string;
    criadoEm: string;
    atualizadoEm: string;
  };

  const loadSwaps = async (): Promise<TurnoSwapEntry[]> => {
    try { return JSON.parse(await fs.readFile(SWAPS_FILE, 'utf-8') || '[]'); } catch { return []; }
  };
  const saveSwaps = async (swaps: TurnoSwapEntry[]) => await fs.writeFile(SWAPS_FILE, JSON.stringify(swaps, null, 2), 'utf-8');

  router.get('/trocas-turno', verificarToken, async (req, res) => {
    try {
      const tableCheck: any = await prisma.$queryRaw`SELECT to_regclass('public."TurnoSwapRequest"')::text as r`;
      if (tableCheck?.[0]?.r) {
        const trocas = await prisma.$queryRaw`SELECT * FROM "TurnoSwapRequest"`;
        return res.json(trocas);
      }
      throw new Error('NO_TABLE');
    } catch (e) {
      const swaps = await loadSwaps();
      res.json(swaps);
    }
  });

  router.post('/trocas-turno', verificarToken, async (req, res) => {
    try {
      const { colaboradorId, dataOriginal, dataSolicitada, motivo, status } = req.body;
      const entry = { id: crypto.randomUUID(), colaboradorId, dataOriginal, dataSolicitada, motivo, status: status || 'pendente', criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
      
      try {
        const tableCheck: any = await prisma.$queryRaw`SELECT to_regclass('public."TurnoSwapRequest"')::text as r`;
        if (tableCheck?.[0]?.r) {
          await prisma.$executeRaw`INSERT INTO "TurnoSwapRequest" ("id", "colaboradorId", "dataOriginal", "dataSolicitada", "motivo", "status", "criadoEm", "atualizadoEm") VALUES (${entry.id}, ${entry.colaboradorId}, ${entry.dataOriginal}, ${entry.dataSolicitada}, ${entry.motivo}, ${entry.status}, ${new Date()}, ${new Date()})`;
          notifyClients();
          return res.status(201).json(entry);
        }
        throw new Error('NO_TABLE');
      } catch (e) {
        const swaps = await loadSwaps();
        swaps.push(entry);
        await saveSwaps(swaps);
        notifyClients();
        return res.status(201).json(entry);
      }
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar solicitação de troca.' });
    }
  });

  router.patch('/trocas-turno/:id/status', verificarToken, verificarSupervisor, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, respostaObservacao } = req.body;

      const nowIso = new Date().toISOString();
      let swapAtualizada: TurnoSwapEntry | null = null;

      try {
        const tableCheck: any = await prisma.$queryRaw`SELECT to_regclass('public."TurnoSwapRequest"')::text as r`;
        if (!tableCheck?.[0]?.r) throw new Error('NO_TABLE');

        await prisma.$executeRaw`
          UPDATE "TurnoSwapRequest"
          SET "status" = ${status}, "atualizadoEm" = ${new Date()}
          WHERE "id" = ${id}
        `;

        const rows: any = await prisma.$queryRaw`SELECT * FROM "TurnoSwapRequest" WHERE "id" = ${id} LIMIT 1`;
        if (!rows?.[0]) return res.status(404).json({ erro: 'Solicitação não encontrada.' });

        swapAtualizada = {
          ...rows[0],
          ...(respostaObservacao ? { respostaObservacao } : {}),
        } as TurnoSwapEntry;
      } catch (e) {
        const swaps = await loadSwaps();
        const idx = swaps.findIndex((s) => s.id === id);
        if (idx === -1) return res.status(404).json({ erro: 'Solicitação não encontrada.' });

        swaps[idx] = { ...swaps[idx], status, respostaObservacao, atualizadoEm: nowIso };
        await saveSwaps(swaps);
        swapAtualizada = swaps[idx];
      }

      // LÓGICA MÁGICA: Se o supervisor aprovar, a escala se ajusta sozinha instantaneamente
      if (status === 'aprovada' && swapAtualizada) {
        const { colaboradorId, dataOriginal, dataSolicitada } = swapAtualizada;
        const overrides = await loadOverrides();
        
        // O dia que ele iria trabalhar (original) vira Folga
        const keyOrig = `${colaboradorId}:${dataOriginal}`;
        const idxOrig = overrides.findIndex((o: any) => o.key === keyOrig);
        const entryOrig = { key: keyOrig, colaboradorId, data: dataOriginal, tipo: 'folga', turno: null, descricao: 'Troca de turno aprovada', atualizadoEm: nowIso };
        if (idxOrig >= 0) overrides[idxOrig] = entryOrig; else overrides.push(entryOrig);
        
        // O dia que ele solicitou trabalhar vira dia de Trabalho
        const keyDest = `${colaboradorId}:${dataSolicitada}`;
        const idxDest = overrides.findIndex((o: any) => o.key === keyDest);
        const entryDest = { key: keyDest, colaboradorId, data: dataSolicitada, tipo: 'trabalho', turno: '08:00-18:00', descricao: 'Turno de compensação', atualizadoEm: nowIso };
        if (idxDest >= 0) overrides[idxDest] = entryDest; else overrides.push(entryDest);
        
        await saveOverrides(overrides);
      }

      notifyClients(); // Avisa o WebSocket para todos os navegadores atualizarem a tela
      return res.json(swapAtualizada);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar solicitação de troca.' });
    }
  });

  return router;
}