# Backend - Gestao

Backend responsavel por autenticacao, regras de negocio, persistencia em PostgreSQL e notificacao em tempo real para o frontend.

## Stack em uso

- Node.js com TypeScript (execucao via tsx)
- Express 4
- Prisma Client + Prisma Migrate
- PostgreSQL
- JWT (autenticacao)
- bcryptjs (hash de senha)
- Socket.IO (evento de sincronizacao db_updated)
- date-fns (regras de data/hora)

## Estrutura atual

```text
backend/
	server.ts                 # Bootstrap do servidor HTTP + Socket.IO
	routes.ts                 # Rotas da API e regras de negocio
	prisma/
		schema.prisma           # Modelagem de dados
		migrations/             # Historico de migracoes
	seed.ts                   # Populacao inicial do banco
	escala_overrides.json     # Fallback local para overrides de escala
```

## Comportamento tecnico principal

- A API e montada em /api via createRouter(io).
- Login gera token JWT e libera acesso autenticado.
- Middleware verifica token e permissao de supervisor em rotas administrativas.
- Operacoes criticas notificam o frontend via evento db_updated.
- Existe redacao de dados sensiveis (CPF, telefone, token) em logs.
- Existe tarefa automatica (setInterval) para limpeza de agendamentos antigos.

## Persistencia de dados (Prisma)

Modelos principais no schema atual:

- Colaborador
- Cliente
- Servico
- Agendamento
- Bloqueio
- SolicitacaoTroca
- EscalaOverride

Observacao sobre overrides de escala:

- Fluxo preferencial: tabela EscalaOverride no PostgreSQL.
- Fluxo fallback: arquivo backend/escala_overrides.json quando a tabela nao esta acessivel.

## Grupos de endpoints

Base URL: /api

Autenticacao:

- POST /login

Colaboradores:

- GET /colaboradores
- POST /colaboradores
- PUT /colaboradores/:id
- DELETE /colaboradores/:id

Agendamentos:

- GET /agendamentos
- POST /agendamentos
- PUT /agendamentos/:id
- DELETE /agendamentos/:id
- PATCH /agendamentos/:id/status
- PATCH /agendamentos/:id/concluir
- PATCH /agendamentos/:id/colaborador
- PATCH /agendamentos/:id/reassign
- PATCH /agendamentos/:id/servicos/remover
- GET /agendamentos/relatorio/concluidos

Servicos:

- GET /servicos
- POST /servicos
- PUT /servicos/:id
- DELETE /servicos/:id

Clientes:

- GET /clientes
- PUT /clientes/:id
- DELETE /clientes/:id

Bloqueios:

- GET /bloqueios
- POST /bloqueios
- DELETE /bloqueios/:id

Escala e planejamento:

- GET /escala/overrides
- POST /escala/override
- POST /escala/swap
- POST /escala/replicate

## Scripts (pasta backend)

- npm run dev
- npm run seed
- npm run prisma:generate
- npm run prisma:migrate

Scripts uteis na raiz para operacao integrada:

- npm run dev:all
- npm run smoke:lgpd
- npm run test:e2e

## Variaveis de ambiente

- DATABASE_URL (obrigatoria)
- JWT_SECRET (obrigatoria em ambiente real)
- PORT (opcional, padrao 3333)

Observacao:
O servidor carrega .env da raiz. Em producao, use segredo real para JWT e nunca hardcoded no codigo.

## O que ainda falta melhorar

Prioridade alta:

- Remover segredo JWT hardcoded de routes.ts e forcar uso de process.env.JWT_SECRET.
- Adicionar validacao de payload (ex.: Zod) para entradas de todas as rotas.
- Modularizar backend/routes.ts por dominio (auth, agendamentos, escala, clientes, servicos).

Prioridade media:

- Padronizar resposta de erro (code, message, requestId) em toda API.
- Adicionar testes automatizados de backend (unitario e integracao) para regras criticas.
- Evoluir politica de seguranca HTTP (helmet, rate limit e CORS restrito por ambiente).

Prioridade baixa:

- Substituir cleanup por scheduler dedicado com telemetria.
- Remover dependencia do fallback em JSON quando migracoes estiverem 100% estabilizadas.
- Melhorar observabilidade com logs estruturados e correlacao por request.