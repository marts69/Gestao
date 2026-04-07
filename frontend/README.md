# Frontend - Gestao

Frontend da plataforma de gestao de spa/clinica.
Esta camada concentra a interface React, estado de UI, consumo da API e sincronizacao em tempo real com WebSocket.

## Stack em uso

- React 19 + React DOM 19
- TypeScript 5
- Vite 6 (build e dev server)
- TanStack React Query (cache, fetch e invalidacao)
- Socket.IO Client (sincronizacao em tempo real)
- motion/react (animacoes)
- date-fns (manipulacao de data/hora)
- Sentry (instrumentacao opcional no bootstrap)

Observacao:
As dependencias estao centralizadas no package da raiz e os scripts do frontend usam binarios em node_modules compartilhado.

## Estrutura atual

```text
frontend/
	src/
		App.tsx                # Orquestracao principal da aplicacao
		AuthContext.tsx        # Login, token e sessao local
		api.ts                 # Hooks React Query e client HTTP
		config/api.ts          # Resolucao de URL da API/Socket por ambiente
		components/            # Componentes de tela e composicao
		features/              # Organizacao por dominio
			appointments/
			clients/
			dashboard/
			planning/
			scale/
			services/
			team/
		hooks/
		utils/
```

## Dominios funcionais cobertos

- Autenticacao e sessao com token
- Agenda de atendimento
	- criar, editar, concluir, excluir e realocar agendamentos
- Gestao de equipe
	- cadastro/edicao/remocao de colaboradores
- Gestao de servicos
	- regras de elegibilidade por cargo e habilidade
- Gestao de clientes
	- consulta, edicao e remocao
- Bloqueios de agenda
- Escala e planejamento
	- overrides por dia
	- troca de dias
	- replicacao de escala
	- visoes calendario/timeline
- Painel TV e telas por perfil

## Fluxo tecnico principal

1. Login em /api/login via AuthContext.
2. Token persistido em localStorage para manter sessao.
3. Hooks de frontend/src/api.ts fazem queries e mutations com React Query.
4. Evento db_updated via Socket.IO invalida caches ativos (appointments, employees, services, clients, scale-overrides, turno-swaps).
5. UI renderiza por papel (supervisor, collaborator, tv) com modulos lazy para reduzir custo inicial.

## Scripts (pasta frontend)

- npm run dev
- npm run build
- npm run preview
- npm run lint
- npm run test:unit
- npm run test:watch

Scripts uteis na raiz que impactam o frontend:

- npm run dev:all
- npm run test:e2e
- npm run smoke:lgpd
- npm run test:regression

## Variaveis de ambiente

- VITE_API_URL (opcional)
	- fallback: http://<host>:3333/api
- VITE_SOCKET_URL (opcional)
	- fallback: http://<host>:3333

## Qualidade e validacao

- Typecheck via npm run lint (atualmente executa tsc --noEmit)
- Testes unitarios com Vitest
- E2E com Playwright no nivel raiz
- Smoke de redacao de dados sensiveis em runtime

## O que ainda falta melhorar

Prioridade alta:

- Quebrar frontend/src/App.tsx em modulos menores para reduzir acoplamento e facilitar manutencao.
- Externalizar DSN do Sentry para variavel de ambiente em vez de placeholder no codigo.
- Reforcar seguranca de sessao (avaliar estrategia de token fora de localStorage e expiracao/refresh mais robusta).

Prioridade media:

- Adicionar lint de estilo e regras de qualidade (ESLint) alem de typecheck.
- Aumentar cobertura de testes unitarios para componentes criticos de agenda, planejamento e servicos.
- Consolidar mapeamentos legados de payload em frontend/src/api.ts a medida que o contrato backend estabiliza.

Prioridade baixa:

- Documentar design tokens e padroes visuais compartilhados.
- Evoluir monitoracao de erros no frontend com contexto de usuario e trilha de navegacao.