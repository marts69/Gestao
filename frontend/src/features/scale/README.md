# Feature: Scale

Nucleo de escala operacional da recepcao (grade diaria, filtros e modais de agenda).

Objetivo desta pasta:
- Isolar fluxo de escala por dominio.
- Reduzir acoplamento com SupervisorView.
- Permitir migracao gradual com compatibilidade de imports.

Compatibilidade:
- O caminho antigo em src/components/SupervisorEscalaTab.tsx continua funcionando via re-export.
