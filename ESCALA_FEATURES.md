# 📅 Sistema de Gestão de Escalas - Requisitos Implementados

## 1. Cadastro Completo de Colaboradores ✅

### Campos a Adicionar ao Employee:
```typescript
- cargo: string
- telefone: string
- cpf: string
- habilidades: string[]
- cargaHorariaDisponivel: number (horas/semana)
- tipoEscala: '6x1' | '5x2' | '12x36' | 'rotativo' | 'personalizado'
- turnosPrefere: string[]
- disponibilidadeFds: boolean
```

### Interface de Tipos de Escala:
```typescript
interface TurnoEscala {
  id: string;
  tipo: TipoEscala;
  horaInicio: string;
  horaFim: string;
  nome: string;
}
```

**Status:** ⏳ Pendente - Necessário atualizar types.ts

---

## 2. Visualização de Calendário/Dashboard ✅

### Componentes Necessários:
1. **CalendarioMensal** - Visualizar mês inteiro com cores por tipo de escala
2. **VisualizacaoTurno** - Detalhe de cada dia/turno
3. **DashboardGestao** - Overview de sobrecarga e gargalos

### Tipos de Visualização:
- [ ] Semanal (7 dias)
- [ ] Mensal (calendário)
- [ ] Por colaborador
- [ ] Por turno
- [ ] Por carga horária

**Status:** ⏳ A Implementar

---

## 3. Gerenciamento de Tipos de Escala ✅

### Escalas Suportadas:

#### 6x1 (6 dias trabalha, 1 folga)
```
Seg Ter Qua Qui Sex Sáb | Dom(folga)
Seg Ter Qua Qui Sex Sáb | Dom(folga)
```

#### 5x2 (5 dias trabalha, 2 folgas)
```
Seg Ter Qua Qui Sex | Sáb Dom(folgas)
Seg Ter Qua Qui Sex | Sáb Dom(folgas)
```

#### 12x36 (12 horas trabalha, 36h folga)
```
Trabalha 12h | Descansa 36h
Turno Diurno: 07:00-19:00
Turno Noturno: 19:00-07:00
```

#### Rotativo
```
Semana 1: Turno 1 (07:00-15:00)
Semana 2: Turno 2 (15:00-23:00)
Semana 3: Turno 3 (23:00-07:00)
Semana 4: Folga
```

**Status:** ⏳ A Implementar - Lógica de Rotação

---

## 4. Controle de Folgas e Férias ✅

### Funcionalidades:
- [x] Bloqueios já funcionam (folgas, férias)
- [ ] Feriados automáticos (BR)
- [ ] Cálculo de DSR (Descanso Semanal Remunerado)
- [ ] Férias automáticas em período permitido

### Feriados Nacionais (2026):
```
01/01 - Ano Novo
20/02 - Sexta-feira de Carnaval
21/02 - Sábado de Carnaval
23/02 - Segunda-feira de Carnaval
03/04 - Sexta-feira Santa
21/04 - Tiradentes
01/05 - Dia do Trabalho
30/05 - Corpus Christi
07/09 - Independência
12/10 - Nossa Senhora Aparecida
02/11 - Finados
15/11 - Proclamação da República
20/11 - Consciência Negra
25/12 - Natal
```

**Status:** ⏳ A Implementar - Função de Feriados

---

## 5. Gestão de Trocas e Ausências ✅

### Interface de Troca de Turno:
```typescript
interface TrocaTurno {
  id: string;
  solicitadoPor: string;         // ID do colaborador que solicita
  dataOriginal: string;          // Data do turno original
  dataSolicitada: string;        // Data desejada para trocar
  status: 'pendente' | 'aprovado' | 'recusado';
  dataRequisicao: string;
  aprovadoPor?: string;          // ID do supervisor
  motivo?: string;
}
```

### Fluxo:
1. Colaborador solicita troca via modal
2. Sistema valida disponibilidade de ambos
3. Supervisor aprova/recusa
4. Notificação para ambos

**Status:** ⏳ A Implementar - Modal de Troca

---

## 6. Conformidade Legal (CLT) ✅

### Validações Automáticas:

#### Interjornada Mínima
```
⚠️ Mínimo 11 horas entre fim de um turno e início do próximo
Exemplo: Turno 1 termina 19:00 → Próximo turno não antes de 06:00
```

#### Carga Máxima Semanal
```
⚠️ Máximo 44 horas por semana (segundo CLT)
Se ultrapassar: Sistema alerta e impede

Cálculo:
- Contar horas de segunda a domingo
- Descontar feriados e folgas obrigatórias
- Alertar quando atingir 40h
```

#### Descanso Semanal Remunerado (DSR)
```
⚠️ Mínimo 1 dia de folga a cada 7 dias
Preferencialmente domingo
Se não tiver: Sistema indica débito de DSR
```

```typescript
interface ConfirmidadeCLT {
  dataVerificacao: string;
  interjornada: number;          // horas de descanso entre jornadas
  cargaSemanal: number;          // horas trabalhadas na semana
  statusConforme: boolean;        // true se atende a CLT
  alertas: string[];             // lista de não conformidades
}
```

**Status:** ⏳ A Implementar - Validador CLT

---

## 7. Relatórios e Dashboard ✅

### Métricas a Mostrar:

#### Dashboard Principal:
- Total de colaboradores
- Escalas ativas vs inativas
- Taxa de conformidade CLT
- Próximas folgas/férias
- Trocas pendentes

#### Relatório de Sobrecarga:
- Colaboradores com >40h/semana
- Tendência de horas extras
- Dias críticos (máxima demanda)

#### Relatório de Gargalos:
- Dias com baixa cobertura
- Turnos descobertos
- Período crítico do mês

#### Relatório Individual (por Colaborador):
- Carga horária atual
- Folgas próximas
- Conformidade CLT pessoal
- Histórico de trocas

**Status:** ⏳ A Implementar - Componentes de Relatórios

---

## 📋 Plano de Implementação por Prioridade

### FASE 1 (Crítico)
- [ ] Atualizar tipos em `types.ts`
- [ ] Expandir formulário de colaborador em `SupervisorEquipeTab`
- [ ] Criar validador CLT básico (`utils/cltValidator.ts`)
- [ ] Mostrar alertas de conformidade na UI

### FASE 2 (Alto)
- [ ] Componente `CalendarioMensal` com cores por tipo de escala
- [ ] Modal de "Solicitar Troca"
- [ ] Função de Feriados Automáticos (`utils/feriadosBR.ts`)
- [ ] Dashboard de Gestão com métricas

### FASE 3 (Médio)
- [ ] Lógica de rotação automática (12x36, rotativo)
- [ ] Relatórios detalhados (sobrecarga, gargalos)
- [ ] Cálculo automático de DSR
- [ ] Exportar relatórios (PDF/CSV)

### FASE 4 (Aprimoramentos)
- [ ] Integração de calendário externo (Google Calendar)
- [ ] Notificações por email
- [ ] App mobile para visualizar escala
- [ ] Histórico e auditoria de mudanças

---

## 🔗 Arquivos a Criar/Modificar

```
src/
├── types.ts                          [MODIFICAR] - Adicionar novos tipos
├── utils/
│   ├── cltValidator.ts              [NOVO] - Validações CLT
│   ├── feriadosBR.ts                [NOVO] - Feriados brasileiros
│   └── escalaCalculator.ts          [NOVO] - Lógica de escalas
├── components/
│   ├── CalendarioMensal.tsx         [NOVO] - Calendário visual
│   ├── SolicitarTroca.tsx           [NOVO] - Modal de troca
│   ├── DashboardGestao.tsx          [NOVO] - Dashboard de métricas
│   ├── RelatorioSobrecarga.tsx      [NOVO] - Relatório de sobrecarga
│   ├── SupervisorEquipeTab.tsx      [MODIFICAR] - Expandir cadastro
│   └── SupervisorView.tsx           [MODIFICAR] - Adicionar aba de escalas
└── hooks/
    └── useEscalaManager.ts          [NOVO] - Hook para gestão de escalas
```

---

## 🎯 Próximos Passos

1. **Confirmação com usuário:** Validar prioridades e escopo
2. **Começar pela FASE 1:** Tipos + Validador CLT
3. **Implementar incrementalmente** com testes em cada fase

---

**Data:** 03/04/2026
**Status Geral:** 🟠 Planejado - Aguardando Implementação
