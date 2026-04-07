# Arquitetura de Features

A pasta src/features organiza o sistema por dominio de negocio.

Principio:
- Cada feature concentra seus componentes, tipos, servicos e regras.
- Importacoes antigas podem continuar via arquivos de compatibilidade (re-export) enquanto a migracao acontece.

Estrutura recomendada:
- src/features/<dominio>/components
- src/features/<dominio>/hooks
- src/features/<dominio>/services
- src/features/<dominio>/types
- src/features/<dominio>/utils
- src/features/<dominio>/index.ts

Status atual:
- appointments: ativo com services/types/utils/components/hooks e utilitarios aplicados nos fluxos principais de agenda.
- clients: iniciado com componentes (SupervisorClientesTab) e compatibilidade por re-export no caminho legado.
- services: iniciado com componentes (SupervisorServicosTab) e uso ativo na aba de servicos do SupervisorView.
- team: iniciado com componentes (SupervisorEquipeTab) e uso ativo na aba de equipe do SupervisorView.
- dashboard: iniciado com componentes (SupervisorDashboardTab) e uso ativo na aba de dashboard do SupervisorView.
- scale: iniciado com componentes (SupervisorEscalaTab) e uso ativo na aba de escala do SupervisorView.
- planning: iniciado com SupervisorPlanejamentoTab e componentes auxiliares (calendario/timeline/popover/dashboard), com uso ativo na aba de planejamento do SupervisorView.

Proxima etapa sugerida:
- consolidar hooks e regras de dominio (utils/services) dentro das features ja migradas e reduzir gradualmente os wrappers legados em src/components.
