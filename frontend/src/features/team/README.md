# Feature: Team

Nucleo de equipe (cadastro de colaboradores, escala base e manutencao operacional).

Objetivo desta pasta:
- Isolar fluxos de equipe por dominio.
- Reduzir acoplamento com SupervisorView.
- Permitir migracao gradual com compatibilidade de imports.

Compatibilidade:
- O caminho antigo em src/components/SupervisorEquipeTab.tsx continua funcionando via re-export.
