# Feature: Dashboard

Nucleo de dashboard supervisor (indicadores, faturamento e proximos clientes).

Objetivo desta pasta:
- Isolar fluxo de dashboard por dominio.
- Reduzir acoplamento com SupervisorView.
- Permitir migracao gradual com compatibilidade de imports.

Compatibilidade:
- O caminho antigo em src/components/SupervisorDashboardTab.tsx continua funcionando via re-export.
