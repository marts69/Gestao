# Feature: Services

Nucleo de servicos (catalogo, configuracao de elegibilidade e manutencao operacional).

Objetivo desta pasta:
- Isolar fluxos de servicos por dominio.
- Reduzir acoplamento com SupervisorView.
- Permitir migracao gradual com compatibilidade de imports.

Compatibilidade:
- O caminho antigo em src/components/SupervisorServicosTab.tsx continua funcionando via re-export.
