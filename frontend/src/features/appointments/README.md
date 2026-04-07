# Feature: Appointments

Nucleo de agendamentos (tipos, validacoes, servicos de API, modais, hooks e utilitarios).

Objetivo desta pasta:
- Isolar regras de agendamento por dominio.
- Reduzir acoplamento com a raiz de src.
- Permitir migracao gradual sem quebrar imports antigos.

Compatibilidade:
- Wrappers legados de re-export removidos apos consolidacao dos imports nas features.
- Novos imports devem apontar diretamente para `src/features/appointments/...`.

Estado da migracao:
- Fluxos principais (App, Supervisor e Colaborador) ja consomem utilitarios de agenda direto de src/features/appointments/utils/appointmentCore.ts.
- Wrappers legados de hook/utilitarios de agenda foram removidos apos consolidacao dos imports diretos.
