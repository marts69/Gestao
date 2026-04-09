# Release Notes Consolidadas

## Versao 1.0.5-alpha
- Commit: a definir
- Escopo: estabilizacao de compilacao, alinhamento de tipagem e bump de versao.

### Adicionado
1. Nenhum incremento funcional novo nesta versao.

### Corrigido
1. Estrutura JSX corrigida em SupervisorServicosTab para remover bloco indevido e restaurar renderizacao esperada.
   - Arquivo: frontend/src/features/services/components/SupervisorServicosTab.tsx
2. Renderizacao condicional corrigida em SupervisorEquipeTab (ramo ternario).
   - Arquivo: frontend/src/features/team/components/SupervisorEquipeTab.tsx
3. Tipagem de calculo de duracao de conflito corrigida para acesso seguro de `tempoHigienizacaoMin`.
   - Arquivo: backend/routes.ts
4. Prop nao suportada removida da chamada de SupervisorEscalaTab em SupervisorView.
   - Arquivo: frontend/src/components/SupervisorView.tsx
5. Bump coordenado de versao para 1.0.5-alpha em root, frontend e backend.
   - Arquivos: package.json, frontend/package.json, backend/package.json

### Validacao Tecnica Executada
1. `npm run lint`
2. `npm --prefix frontend run build`

### Impacto Tecnico
1. Sem alteracao de contrato de API.
2. Sem alteracao de schema Prisma.
3. Sem alteracao de fluxo funcional planejado.
4. Mudanca focada em estabilidade de build e rastreabilidade da release.
