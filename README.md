# 🌿 Sistema de Gestão de Spa e Clínica
<img width="594" height="279" alt="image" src="https://github.com/user-attachments/assets/7b2bbc47-7ee5-4b87-9c73-cd6823de96ef" />

Aplicacao full-stack para gestao de agendamentos, bloqueios, equipe, clientes e servicos.

## Estrutura atual

O projeto esta separado em frontend e backend dedicados.

- Frontend: `frontend/` (React + Vite)
- Backend: `backend/` (Express + Prisma + Socket.IO)
- Banco: `backend/prisma/schema.prisma`
- Orquestracao: raiz com scripts e automacoes em `scripts/`

## Estado da migracao

- Split fisico concluido: frontend e backend separados.
- Scripts da raiz atualizados para delegar para `frontend/` e `backend/`.
- Validacao executada apos split: lint, build, testes unitarios e smoke de inicializacao do backend.

## Como rodar hoje

```bash
npm install
npm run dev
```

Para subir frontend + backend juntos:

```bash
npm run dev:all
```

Para rodar apenas backend:

```bash
npm --prefix backend run dev
```

## Variaveis de ambiente

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_API_URL` opcional
- `VITE_SOCKET_URL` opcional

## Validacao rapida

```bash
npm run lint
npm run build
npm run test:unit
```

## Execucao com 1 clique no VS Code

Foi adicionada uma task para subir frontend + backend juntos e mostrar logs no terminal integrado.

Como usar:

1. Abra Command Palette (`Ctrl+Shift+P`)
2. Execute `Tasks: Run Task`
3. Selecione `Gestao: Iniciar Front + API`

Logs aparecem no mesmo painel com prefixos:

- `[FRONT]` para frontend (Vite)
- `[API]` para backend (Express/Socket.IO)

Tambem e possivel iniciar via terminal com:

```bash
npm run dev:all
```

## Execucao

Foram adicionados atalhos para Linux no diretorio raiz do projeto:

- `Gestao-Start.desktop`: abre menu de controle (Iniciar, Parar, Status)
- `Gestao-Stop.desktop`: encerra processos das portas da aplicacao

Arquivos de suporte:

- `scripts/run-all.sh`
- `scripts/stop-all.sh`
- `scripts/gestao-control.sh`

Como usar:

1. No gerenciador de arquivos, abra a pasta do projeto
2. Clique duas vezes em `Gestao-Start.desktop`
3. No menu, escolha Iniciar, Parar ou Status

Uso via terminal (fora do VS Code):

```bash
cd /home/matheusmartinsmoreira/Work/Gestão
./scripts/gestao-control.sh menu
```

Comandos diretos:

```bash
./scripts/gestao-control.sh start
./scripts/gestao-control.sh stop
./scripts/gestao-control.sh status
```

Importante: arquivo `.desktop` nao deve ser executado com `bash Gestao-Start.desktop`.
Ele deve ser aberto pelo gerenciador de arquivos (clique duplo) ou pelo menu de aplicativos.

Se o sistema pedir confianca do atalho `.desktop`, marque como "Permitir execucao" ou "Confiar e iniciar".

## Fluxos criticos para teste manual

- Criar agendamento clicando na grade
- Editar agendamento normal
- Editar agendamento concluido (servicos)
- Criar bloqueio com realocacao
- Abrir e filtrar Proximos Agendamentos
- Testar agenda da recepcao em desktop e mobile

## Estado do projeto

- Split frontend/backend concluido.
- Refatoracao por features em andamento com entregas principais aplicadas.
- Pendencias de consolidacao:
   - reduzir `any` residual em `SupervisorView`
   - finalizar adocao de hooks/contexto compartilhado em todos os fluxos do Supervisor

## Documentacao relacionada

- `REFACTOR.md` - plano e status de refatoracao
- `REFACTOR_CODE.md` - referencias de implementacao
- `IMPLEMENTATION_CHECKLIST.md` - checklist de entrega
- `ESCALA_FEATURES.md` - escopo funcional de escalas
