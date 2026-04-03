# 🔄 Plano de Refatoração - Gestão

**Data**: 2 Abril 2026 | **Status**: Em andamento | **Esforço**: 21 horas (3 dias)

---

## 📊 Situação Atual

```
Duplicação:      34% (450+ linhas)
Type-Safety:     85% → será 99% após refactor
Manutenibilidade: 60% → será 95%
```

---

## 🔴 12 Problemas Identificados

| # | Problema | Linhas | Prioridade | Status |
|---|----------|--------|-----------|--------|
| 1 | Constantes Calendário Duplicadas (START_HOUR, etc) | 5 locais | 🔴 CRÍTICO | RESOLVIDO |
| 2 | Estados de Modal Repetidos (showModal, etc) | 240+ | 🔴 CRÍTICO | RESOLVIDO |
| 3 | Props Drilling Excessivo + `any` types | 18+ props | 🔴 CRÍTICO | RESOLVIDO |
| 4 | Parsing de Anamnese Duplicado | 2 locais | 🟡 IMPORTANTE | RESOLVIDO |
| 5 | API_URL Espalhada | 3 locais | 🟡 IMPORTANTE | RESOLVIDO |
| 6 | Formatadores (phone, CPF, duration) | 2+ locais | 🟡 IMPORTANTE | RESOLVIDO |
| 7 | Gerenciamento de Filtros Inconsistente | Diversos | 🔵 MENOR | RESOLVIDO |
| 8-12 | Cores inline, CRUD duplicado, etc | Diversos | 🔵 MENOR | EM ANDAMENTO |

### Atualizacao 02/04/2026
- API_URL centralizada em `src/config/api.ts`
- Constantes da agenda centralizadas em `src/config/scheduleConfig.ts`
- Parsing de anamnese centralizado em `src/utils/anamneseUtils.ts`
- Formatadores centralizados em `src/utils/formatters.ts` (`formatPhone`, `formatCpf`, `formatDuration`)
- Estado de modais de agenda centralizado em `src/hooks/useScheduleModals.ts`
- Props da coluna de agenda agrupadas em contexto/acoes tipadas (menos drilling)
- Tipagem `any` removida do `src/` e substituida por tipos explicitos
- Busca de agenda padronizada em `src/components/appointmentUtils.ts` (`matchesAppointmentSearch`) para Supervisor/Escala/Colaborador
- Coluna de agenda duplicada extraida para `src/components/ScheduleGridColumn.tsx` e reutilizada em SupervisorView/SupervisorEscalaTab
- Hook reutilizavel de busca criado em `src/hooks/useSearch.ts` e aplicado em Clientes/Servicos/Equipe
- Filtro de servicos corrigido para usar lista filtrada de fato na renderizacao
- Context da grade da agenda aplicado para reduzir props drilling em SupervisorView/SupervisorEscalaTab
- ConfirmDialog generico criado em `src/components/ConfirmDialog.tsx` e aplicado em fluxos de exclusao/cancelamento
- Form Drafts implementado com `src/hooks/useFormDraft.ts` no BookingModal (persistencia em localStorage)
- Placeholders removidos de `SupervisorServicosTab.tsx` e `SupervisorEquipeTab.tsx` com implementacao funcional

---

## ✅ FASE 1: CRÍTICA (~8 horas)

### 1️⃣ Constantes de Calendário (1h)
- **Cria**: `src/config/scheduleConfig.ts`
- **Afeta**: CollaboratorView, SupervisorView, EscalaTab
- **Impacto**: Alto - Uma mudança = 1 lugar
- **Copy-Paste**: Veja `REFACTOR_CODE.md`

### 2️⃣ API_URL Centralizada (1h)
- **Cria**: `src/config/api.ts`
- **Afeta**: App.tsx, AuthContext.tsx, api.ts
- **Impacto**: Alto - Desenvolvimento vs Produção
- **Copy-Paste**: Veja `REFACTOR_CODE.md`

### 3️⃣ Parsing de Anamnese (1.5h)
- **Cria**: `src/utils/anamneseUtils.ts`
- **Afeta**: BookingModal, SupervisorClientesTab
- **Impacto**: Alto - Evita bugs de sincronização
- **Copy-Paste**: Veja `REFACTOR_CODE.md`

### 4️⃣ Testes & Validação (1.5h)
```bash
npm run lint
npm run build
# Testar manualmente: Agenda, Clientes, Booking
```

**Total FASE 1**: ~5 horas código + 1.5 horas testes = **~6.5 horas reais**

---

## 📌 FASE 2: IMPORTANTE (~8 horas)

### 4️⃣ Hook useScheduleModals (2h)
- Reduz 80+ linhas por componente
- Afeta: 3 componentes (SupervisorView, etc)

### 5️⃣ Props Drilling + Context (2h)
- Melhor passagem de dados entre camadas
- Remove 15+ props desnecessários

### 6️⃣ Consolidar Formatadores (2h)
- **Cria**: `src/utils/formatters.ts`
- Centraliza: phone, CPF, duration, currency

### 7️⃣ Testes Integrados (2h)

**Total FASE 2**: ~8 horas

---

## 💫 FASE 3: OTIMIZAÇÃO (~5 horas, Opcional)

- ScheduleGridColumn reutilizável
- useSearch Hook customizado
- ConfirmDialog genérico
- Form Drafts com localStorage

---

## 📈 Impacto Após Refatoração

```
MÉTRICA                      ANTES    DEPOIS   GANHO
──────────────────────────────────────────────────
Linhas de Código             3,200    2,800    -12.5%
Linhas Duplicadas              450      0      -100%
Props Drilling (máx)           18+     3-5      -70%
Type-Safety                    85%     99%      +14%
Tempo de Manutenção           ⭐⭐⭐  ⭐⭐⭐⭐⭐  +60%
```

---

## 🎯 Checklist de Implementação

### FASE 1
- [x] Criar `src/config/scheduleConfig.ts`
- [x] Criar `src/config/api.ts`
- [x] Criar `src/utils/anamneseUtils.ts`
- [x] Atualizar CollaboratorView.tsx
- [x] Atualizar SupervisorView.tsx
- [x] Atualizar EscalaTab.tsx
- [x] Atualizar BookingModal.tsx
- [x] Atualizar SupervisorClientesTab.tsx
- [x] Atualizar App.tsx (API_URL)
- [x] Atualizar AuthContext.tsx (API_URL)
- [x] Atualizar api.ts (API_URL)
- [ ] Rodar `npm run lint`
- [ ] Rodar `npm run build`
- [ ] Testes manuais: Todos os fluxos

### FASE 2 (Quando FASE 1 estiver pronta)
- [x] Criar `src/hooks/useScheduleModals.ts`
- [x] Criar Context para props drilling
- [x] Criar `src/utils/formatters.ts`
- [x] Atualizar componentes
- [ ] Testes integrados

### FASE 3 (Opcional)
- [x] ScheduleGridColumn
- [x] useSearch Hook
- [x] ConfirmDialog
- [x] Form Drafts

---

## 💡 Dicas de Implementação

✅ **Faça assim**:
1. Crie arquivo novo
2. Implemente função/config
3. Atualize 1 componente
4. Teste (npm run build)
5. Atualize próximo componente

❌ **Não faça assim**:
- Não altere tudo de uma vez
- Não remova código antigo antes de testar novo
- Não misture mudanças de múltiplos arquivos

---

## 🚀 Próximos Passos

1. **Agora**: Leia `REFACTOR_CODE.md` (tem código pronto)
2. **Próximo**: Implemente FASE 1 seguindo o checklist
3. **Depois**: Faça FASE 2 quando FASE 1 estiver 100% ok
4. **Opcional**: FASE 3 se houver tempo

---

## 📞 Dúvidas?

Revise `REFACTOR_CODE.md` que tem:
- Código pronto para copiar-colar
- Linhas exatas para remover
- Exemplos de uso em cada componente

**Boa sorte! 🎉**
