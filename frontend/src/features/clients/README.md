# Feature: Clients

Nucleo de clientes (cadastro, historico e anamnese no contexto operacional).

Objetivo desta pasta:
- Isolar fluxos de clientes por dominio.
- Reduzir acoplamento com src/components.
- Permitir migracao incremental com compatibilidade de imports.

Compatibilidade:
- O caminho antigo em src/components/SupervisorClientesTab.tsx continua funcionando via re-export.
