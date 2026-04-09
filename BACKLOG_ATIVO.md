# Backlog Ativo Consolidado

Atualizado em: 09/04/2026
Objetivo: manter uma fonte única de pendências abertas, em formato pronto para sprint.

## Convenções

- Prioridade: P0 (sprint atual), P1 (próxima sprint), P2 (evolutivo).
- Responsável: papel dono da execução (podendo ter co-responsável).
- Status: todos os itens abaixo estão ativos e em aberto.

## P0 - Sprint Atual (Operacional)

- [ ] BLG-001 - Definir regra final de exibição no agendamento para colaboradores de folga.
  - Responsável: Produto/Supervisão
  - Co-responsável: Frontend
  - Critério de aceite: regra documentada e aplicada na tela de agendamento sem divergência de comportamento.
  - Fonte: RESUMO_CONSOLIDADO.md

- [ ] BLG-002 - Definir e aplicar bloqueio automático/manual para colaboradores em folga na data.
  - Responsável: Backend
  - Co-responsável: Frontend
  - Critério de aceite: criação de agendamento para colaborador em folga bloqueada conforme regra definida; fluxo manual disponível para supervisor quando aplicável.
  - Fonte: RESUMO_CONSOLIDADO.md

- [ ] BLG-003 - Integrar feriados automaticamente na malha de escalas (além do utilitário isolado).
  - Responsável: Backend
  - Co-responsável: Frontend
  - Critério de aceite: dias feriados impactam a malha automaticamente e aparecem de forma consistente na UI.
  - Fontes: RESUMO_CONSOLIDADO.md, ESCALA_FEATURES.md

## P1 - Próxima Sprint (Produto)

- [ ] BLG-004 - Expandir filtros de visualização da escala (semanal, mensal, por colaborador, por turno, por carga horária).
  - Responsável: Frontend
  - Co-responsável: Produto/Supervisão
  - Critério de aceite: filtros disponíveis na UI e combináveis sem regressão no desempenho da timeline/calendário.
  - Fonte: ESCALA_FEATURES.md

- [ ] BLG-005 - Implementar férias automáticas em período permitido.
  - Responsável: Backend
  - Co-responsável: Frontend
  - Critério de aceite: regras de férias aplicadas automaticamente e refletidas na escala sem ajuste manual obrigatório.
  - Fonte: ESCALA_FEATURES.md

- [ ] BLG-006 - Criar relatórios de sobrecarga/gargalos e exportação PDF/CSV.
  - Responsável: Frontend
  - Co-responsável: Backend
  - Critério de aceite: relatórios gerados com filtros mínimos e exportação funcional para PDF e CSV.
  - Fonte: ESCALA_FEATURES.md

- [ ] BLG-007 - Padronizar documentação legada para estrutura atual frontend/backend.
  - Responsável: Documentação
  - Co-responsável: Produto/Supervisão
  - Critério de aceite: documentos principais atualizados sem referências obsoletas de estrutura.
  - Fonte: RESUMO_CONSOLIDADO.md

## P2 - Evolutivo (Roadmap)

- [ ] BLG-008 - Integração com calendário externo (Google Calendar).
  - Responsável: Backend
  - Co-responsável: Frontend
  - Critério de aceite: sincronização básica de eventos de escala com calendário externo.
  - Fonte: ESCALA_FEATURES.md

- [ ] BLG-009 - Notificações por e-mail.
  - Responsável: Backend
  - Co-responsável: DevOps
  - Critério de aceite: envio automático de notificações de eventos críticos da escala.
  - Fonte: ESCALA_FEATURES.md

- [ ] BLG-010 - App mobile para visualização de escala.
  - Responsável: Frontend
  - Co-responsável: Produto/Supervisão
  - Critério de aceite: versão mobile com visualização de escala e autenticação funcional.
  - Fonte: ESCALA_FEATURES.md

- [ ] BLG-011 - Histórico e trilha de auditoria de mudanças de escala.
  - Responsável: Backend
  - Co-responsável: Frontend
  - Critério de aceite: registro de alterações com usuário, data/hora e antes/depois acessível na UI.
  - Fonte: ESCALA_FEATURES.md

- [ ] BLG-012 - Ficha de anamnese digital self-service via QR/TV.
  - Responsável: Frontend
  - Co-responsável: Backend
  - Critério de aceite: fluxo completo de preenchimento e sincronização em tempo real com supervisão.
  - Fonte: REFACTOR.md

- [ ] BLG-013 - Sistema de fidelidade invisível (tiers e gatilhos de atendimento).
  - Responsável: Produto/Supervisão
  - Co-responsável: Backend
  - Critério de aceite: regras de tier calculadas pelo histórico e sinalização operacional na recepção.
  - Fonte: REFACTOR.md

## Itens Encerrados Nesta Consolidação

- Revisão dos checklists antigos com status desatualizado.
- Migração Prisma do módulo de escalas no ambiente alvo marcada como concluída em INTEGRACAO_ESCALAS.md.
- Pendências removidas dos documentos históricos e centralizadas neste arquivo.
