import React from 'react';
import { motion } from 'motion/react';
import { Employee, TurnoSwapStatus } from '../../../types';
import { type DiaEscala } from '../../../utils/escalaCalculator';
import { CalendarioEscala } from './CalendarioEscala';
import { DraggableCalendarioEscala } from './DraggableCalendarioEscala';
import { PlanningDayPopover } from './PlanningDayPopover';
import { TimelineGantt } from './TimelineGantt';

interface SupervisorPlanejamentoTabProps {
  [key: string]: any;
}

export function SupervisorPlanejamentoTab(props: SupervisorPlanejamentoTabProps) {
  const {
    employees,
    filterRole,
    setFilterRole,
    changeScaleMonthBy,
    openPlanningMonthPicker,
    selectedScaleMonthLabel,
    planningMonthInputRef,
    selectedScaleMonth,
    setSelectedScaleMonth,
    planningViewMode,
    setPlanningViewMode,
    employeeSearchTerm,
    setEmployeeSearchTerm,
    filterStatus,
    setFilterStatus,
    handleTogglePlanningEditMode,
    isPlanningEditMode,
    handleOpenScaleGenerator,
    handleSuggestAutomaticScale,
    suggestedPlanningKeys,
    handleConfirmSuggestedScale,
    isSavingPlanning,
    showTopAlerts,
    setShowTopAlerts,
    visibleCltToastAlerts,
    pendingTurnoSwapRequests,
    handleUpdateSwapStatus,
    setDismissedCltAlertIds,
    selectedScaleEmployee,
    selectedScaleCalendar,
    setSelectedPlanningEmployeeId,
    setSelectedPlanningDay,
    setIsPopoverOpen,
    onSwapScaleDays,
    setPlanningOverrides,
    setToastMessage,
    timelineEmployees,
    handleQuickToggleTimelineDay,
    handleQuickSetTimelineDay,
    planningOverridesList,
    buildScaleForEmployee,
    onReplicateScaleDays,
    planningCoverageTarget,
    isPopoverOpen,
    selectedPlanningDay,
    selectedPlanningEmployeeId,
    splitTurno,
    onSaveScaleOverride,
    isScaleGeneratorOpen,
    setIsScaleGeneratorOpen,
    filteredScaleGeneratorEmployees,
    scaleGeneratorSearch,
    setScaleGeneratorSearch,
    scaleGeneratorEmployeeId,
    setScaleGeneratorEmployeeId,
    scaleGeneratorMonth,
    setScaleGeneratorMonth,
    scaleGeneratorType,
    setScaleGeneratorType,
    scaleGeneratorSundayOffs,
    setScaleGeneratorSundayOffs,
    scaleGeneratorCoverageTarget,
    setScaleGeneratorCoverageTarget,
    scaleGeneratorSundayFrequency,
    setScaleGeneratorSundayFrequency,
    handleGenerateScale,
    setSelectedScaleEmployeeId,
  } = props;

  return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-col gap-6 items-start w-full">
          {/* Main Content Area - Calendário/Timeline Dominante */}
          <div className="flex-1 w-full min-w-0">
            {/* Zonas de visualização e ações */}
            <div className={`bg-surface-container p-5 rounded-3xl border border-outline-variant/10 shadow-sm mb-6 transition-all ${isPlanningEditMode ? 'ring-1 ring-primary/45 border-primary/35' : ''}`}>
              {/* Linha 1: filtro, navegação temporal, modo de visualização */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-42.5">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Setor</label>
                    <select
                      value={filterRole}
                      onChange={(event) => setFilterRole(event.target.value)}
                      className="w-full h-11 bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 text-sm text-on-surface"
                    >
                      <option value="all">Todos</option>
                      {Array.from(
                        new Set<string>(
                          (employees as Employee[])
                            .map((employee) => employee.cargo || '')
                            .filter((cargo): cargo is string => Boolean(cargo))
                        )
                      ).map((cargo) => (
                        <option key={cargo} value={cargo}>{cargo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeScaleMonthBy(-1)}
                    className="w-10 h-10 rounded-xl border border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                    title="Mês anterior"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>

                  <button
                    type="button"
                    onClick={openPlanningMonthPicker}
                    className="px-4 h-10 rounded-xl border border-outline-variant/20 bg-surface-container-low text-sm font-bold uppercase tracking-[0.12em] text-on-surface hover:text-primary transition-colors"
                  >
                    {selectedScaleMonthLabel}
                  </button>

                  <button
                    type="button"
                    onClick={() => changeScaleMonthBy(1)}
                    className="w-10 h-10 rounded-xl border border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                    title="Próximo mês"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>

                  <input
                    ref={planningMonthInputRef}
                    type="month"
                    value={selectedScaleMonth}
                    onChange={(event) => setSelectedScaleMonth(event.target.value)}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute w-0 h-0 opacity-0 pointer-events-none"
                  />
                </div>

                <div className="flex items-center justify-start lg:justify-end gap-2">
                  <button
                    onClick={() => setPlanningViewMode('calendario')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      planningViewMode === 'calendario'
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'bg-surface-container-low text-on-surface-variant hover:text-primary border border-outline-variant/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    Calendário
                  </button>

                  <button
                    onClick={() => setPlanningViewMode('timeline')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      planningViewMode === 'timeline'
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'bg-surface-container-low text-on-surface-variant hover:text-primary border border-outline-variant/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">view_timeline</span>
                    Timeline
                  </button>
                </div>
              </div>

              {/* Linha 2: busca e ações */}
              <div className="mt-4 pt-4 border-t border-outline-variant/10 flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
                <div className="w-full lg:max-w-md">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Buscar Funcionário</label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70 absolute left-3 top-1/2 -translate-y-1/2">search</span>
                    <input
                      type="text"
                      value={employeeSearchTerm}
                      onChange={(event) => setEmployeeSearchTerm(event.target.value)}
                      placeholder="Nome, cargo ou especialidade"
                      className="w-full h-11 pl-10 pr-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
                  <select
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value as 'all' | 'folgaHoje')}
                    className="h-11 min-w-42.5 bg-surface-container-low border border-outline-variant/20 rounded-xl px-3 text-sm text-on-surface"
                    title="Filtrar status da equipe"
                  >
                    <option value="all">Status: Todos</option>
                    <option value="folgaHoje">Status: Folga hoje</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleTogglePlanningEditMode}
                    className={`h-11 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                      isPlanningEditMode
                        ? 'bg-primary text-on-primary border-primary/40 shadow-md'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:text-primary'
                    }`}
                  >
                    {isPlanningEditMode ? 'Salvar Alterações' : 'Editar Grade'}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenScaleGenerator}
                    className="h-11 px-5 bg-primary text-on-primary rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary-dim transition-all shadow-sm"
                  >
                    + Nova Escala
                  </button>

                  <button
                    type="button"
                    onClick={handleSuggestAutomaticScale}
                    className="h-11 px-5 rounded-xl bg-secondary-container/35 text-on-surface text-xs font-bold uppercase tracking-wider border border-outline-variant/20 hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    Sugerir Escala Automática
                  </button>

                  {suggestedPlanningKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={handleConfirmSuggestedScale}
                      disabled={isSavingPlanning}
                      className="h-11 px-5 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider hover:bg-primary-dim disabled:opacity-60 transition-colors"
                    >
                      {isSavingPlanning ? 'Confirmando...' : 'Confirmar Escala'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowTopAlerts((prev) => !prev)}
                    className="hidden lg:flex items-center gap-2 h-11 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-surface-container-low text-on-surface-variant hover:text-primary border border-outline-variant/20"
                  >
                    <span className="material-symbols-outlined text-[16px]">{showTopAlerts ? 'notifications_off' : 'notifications'}</span>
                    {showTopAlerts ? 'Ocultar Alertas' : 'Mostrar Alertas'}
                  </button>
                </div>
              </div>
            </div>

            {showTopAlerts && (
              <>
                <div className="xl:hidden mb-4 space-y-2">
                  {visibleCltToastAlerts.slice(0, 1).map((alerta) => (
                    <div key={`mobile-alert-${alerta.id}`} className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2">
                      <p className="text-[11px] font-bold text-amber-500">Alerta CLT: {alerta.nome}</p>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-1">{alerta.resumo[0] || 'Inconformidade detectada'}</p>
                    </div>
                  ))}

                  {pendingTurnoSwapRequests.slice(0, 1).map((request) => (
                    <div key={`mobile-swap-${request.id}`} className="rounded-xl border border-secondary/30 bg-secondary-container/20 px-3 py-2">
                      <p className="text-[11px] font-bold text-on-surface">Solicitação: {request.colaboradorNome || request.colaboradorId}</p>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-1">{request.dataOriginal} → {request.dataSolicitada}</p>
                    </div>
                  ))}
                </div>

                <div className="hidden xl:block pointer-events-none fixed top-28 right-6 z-30 w-80 space-y-2">
                  {visibleCltToastAlerts.slice(0, 3).map((alerta) => (
                    <motion.div
                      key={`toast-alert-${alerta.id}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="pointer-events-auto rounded-xl border border-amber-400/35 bg-amber-500/10 backdrop-blur-sm p-3 shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>
                        <p className="text-xs font-bold text-amber-500">Alerta CLT • {alerta.nome}</p>
                        <button
                          type="button"
                          onClick={() => setDismissedCltAlertIds((prev) => ({ ...prev, [alerta.id]: true }))}
                          className="ml-auto w-6 h-6 rounded-md border border-amber-400/40 text-amber-500/80 hover:text-amber-500 hover:bg-amber-500/10"
                          title="Dispensar alerta"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-2 line-clamp-2">{alerta.resumo[0] || 'Inconformidade detectada'}</p>
                    </motion.div>
                  ))}

                  {pendingTurnoSwapRequests.length > 0 && (
                    <div className="pointer-events-auto max-h-[44vh] overflow-y-auto space-y-2 pr-1">
                      {pendingTurnoSwapRequests.map((request) => (
                        <motion.div
                          key={`toast-swap-${request.id}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="rounded-xl border border-secondary/30 bg-surface-container-high/95 backdrop-blur-sm p-3 shadow-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[18px]">swap_horiz</span>
                            <p className="text-xs font-bold text-on-surface">Troca • {request.colaboradorNome || request.colaboradorId}</p>
                          </div>
                          <p className="text-[11px] text-on-surface-variant mt-2 line-clamp-1">{request.dataOriginal} → {request.dataSolicitada}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateSwapStatus(request.id, 'aprovada')}
                              className="flex-1 h-7 rounded-lg bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider"
                            >
                              Aprovar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSwapStatus(request.id, 'rejeitada')}
                              className="flex-1 h-7 rounded-lg bg-error/20 text-error text-[10px] font-bold uppercase tracking-wider"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Calendário ou Timeline */}
            {selectedScaleEmployee ? (
              <>
                {planningViewMode === 'calendario' && (
                  isPlanningEditMode ? (
                    <DraggableCalendarioEscala
                      escalas={selectedScaleCalendar.dias}
                      year={selectedScaleCalendar.year}
                      month={selectedScaleCalendar.month}
                      hideMonthBadge
                      isDraggable={isPlanningEditMode}
                      onDayDrop={(from, to, tipo) => {
                        if (!selectedScaleEmployee || from === to) return;

                        const fromDate = `${selectedScaleMonth}-${String(from).padStart(2, '0')}`;
                        const toDate = `${selectedScaleMonth}-${String(to).padStart(2, '0')}`;
                        const fromDia = selectedScaleCalendar.dias.find((d) => d.data === fromDate);
                        const toDia = selectedScaleCalendar.dias.find((d) => d.data === toDate);
                        if (!fromDia || !toDia) return;

                        const employeeId = selectedScaleEmployee.id;

                        setPlanningOverrides((prev) => ({
                          ...prev,
                          [`${employeeId}:${fromDate}`]: {
                            colaboradorId: employeeId,
                            data: fromDate,
                            tipo: toDia.tipo,
                            turno: toDia.tipo === 'trabalho' ? toDia.turno : undefined,
                            descricao: toDia.descricao,
                          },
                          [`${employeeId}:${toDate}`]: {
                            colaboradorId: employeeId,
                            data: toDate,
                            tipo: fromDia.tipo,
                            turno: fromDia.tipo === 'trabalho' ? fromDia.turno : undefined,
                            descricao: fromDia.descricao,
                          },
                        }));

                        void (async () => {
                          try {
                            if (onSwapScaleDays) {
                              const success = await onSwapScaleDays({
                                from: {
                                  colaboradorId: employeeId,
                                  data: fromDate,
                                  snapshot: {
                                    tipo: fromDia.tipo,
                                    turno: fromDia.tipo === 'trabalho' ? fromDia.turno : undefined,
                                    descricao: fromDia.descricao,
                                  },
                                },
                                to: {
                                  colaboradorId: employeeId,
                                  data: toDate,
                                  snapshot: {
                                    tipo: toDia.tipo,
                                    turno: toDia.tipo === 'trabalho' ? toDia.turno : undefined,
                                    descricao: toDia.descricao,
                                  },
                                },
                              });
                              if (success === false) {
                                setToastMessage('Troca aplicada localmente. Sincronização pendente.');
                                setTimeout(() => setToastMessage(null), 2800);
                                return;
                              }
                            }

                            setToastMessage(`Dia ${from} trocado com dia ${to}.`);
                            setTimeout(() => setToastMessage(null), 2500);
                          } catch (error) {
                            setToastMessage('Troca aplicada localmente. Falha na sincronização com servidor.');
                            setTimeout(() => setToastMessage(null), 3200);
                          }
                        })();
                      }}
                    />
                  ) : (
                    <CalendarioEscala
                      escalas={selectedScaleCalendar.dias}
                      year={selectedScaleCalendar.year}
                      month={selectedScaleCalendar.month}
                      hideMonthBadge
                      onDayClick={(day) => {
                        const selectedDay = selectedScaleCalendar.dias.find(
                          (d) => parseInt(d.data.split('-')[2]) === day
                        );
                        if (selectedDay) {
                          setSelectedPlanningEmployeeId(selectedScaleEmployee.id);
                          setSelectedPlanningDay(selectedDay);
                          setIsPopoverOpen(true);
                        }
                      }}
                      isInteractive={true}
                    />
                  )
                )}

                {planningViewMode === 'timeline' && (
                  <TimelineGantt
                    employees={timelineEmployees}
                    month={selectedScaleMonth}
                    hideMonthBadge
                    isEditable={isPlanningEditMode}
                    suggestedKeys={suggestedPlanningKeys}
                    overrides={planningOverridesList.filter((override) => override.data.startsWith(`${selectedScaleMonth}-`))}
                    onQuickToggleDay={handleQuickToggleTimelineDay}
                    onQuickSetDay={handleQuickSetTimelineDay}
                    onClick={(empleoyeeId, day) => {
                      const escala = buildScaleForEmployee(empleoyeeId);
                      const selectedDay = escala.find((d) => d.data === day);
                      if (selectedDay) {
                        setSelectedPlanningEmployeeId(empleoyeeId);
                        setSelectedScaleEmployeeId(empleoyeeId);
                        setSelectedPlanningDay(selectedDay);
                        setIsPopoverOpen(true);
                      }
                    }}
                    onShiftDrop={(fromEmp, fromDay, toEmp, toDay) => {
                      if (fromEmp === toEmp && fromDay === toDay) return;

                      const fromDia = buildScaleForEmployee(fromEmp).find((d) => d.data === fromDay);
                      const toDia = buildScaleForEmployee(toEmp).find((d) => d.data === toDay);
                      if (!fromDia || !toDia) return;

                      setPlanningOverrides((prev) => ({
                        ...prev,
                        [`${fromEmp}:${fromDay}`]: {
                          colaboradorId: fromEmp,
                          data: fromDay,
                          tipo: toDia.tipo,
                          turno: toDia.tipo === 'trabalho' ? toDia.turno : undefined,
                          descricao: toDia.descricao,
                        },
                        [`${toEmp}:${toDay}`]: {
                          colaboradorId: toEmp,
                          data: toDay,
                          tipo: fromDia.tipo,
                          turno: fromDia.tipo === 'trabalho' ? fromDia.turno : undefined,
                          descricao: fromDia.descricao,
                        },
                      }));

                      void (async () => {
                        try {
                          if (onSwapScaleDays) {
                            const success = await onSwapScaleDays({
                              from: {
                                colaboradorId: fromEmp,
                                data: fromDay,
                                snapshot: {
                                  tipo: fromDia.tipo,
                                  turno: fromDia.tipo === 'trabalho' ? fromDia.turno : undefined,
                                  descricao: fromDia.descricao,
                                },
                              },
                              to: {
                                colaboradorId: toEmp,
                                data: toDay,
                                snapshot: {
                                  tipo: toDia.tipo,
                                  turno: toDia.tipo === 'trabalho' ? toDia.turno : undefined,
                                  descricao: toDia.descricao,
                                },
                              },
                            });
                            if (success === false) {
                              setToastMessage('Transferência aplicada localmente. Sincronização pendente.');
                              setTimeout(() => setToastMessage(null), 3000);
                              return;
                            }
                          }

                          setToastMessage(`Transferência aplicada: ${fromDay} → ${toDay}`);
                          setTimeout(() => setToastMessage(null), 3000);
                        } catch (error) {
                          setToastMessage('Transferência aplicada localmente. Falha na sincronização com servidor.');
                          setTimeout(() => setToastMessage(null), 3200);
                        }
                      })();
                    }}
                    onReplicate={(empId, fromDay, toDay, tipo) => {
                      const fromDate = `${selectedScaleMonth}-${String(fromDay).padStart(2, '0')}`;
                      const start = Math.min(fromDay, toDay);
                      const end = Math.max(fromDay, toDay);
                      const targetDates = Array.from({ length: end - start + 1 }, (_, idx) => start + idx)
                        .map((dayNum) => `${selectedScaleMonth}-${String(dayNum).padStart(2, '0')}`)
                        .filter((date) => date !== fromDate);

                      if (targetDates.length === 0) return;

                      const sourceDia = buildScaleForEmployee(empId).find((d) => d.data === fromDate);
                      if (!sourceDia) return;

                      setPlanningOverrides((prev) => {
                        const next = { ...prev };
                        targetDates.forEach((targetDate) => {
                          next[`${empId}:${targetDate}`] = {
                            colaboradorId: empId,
                            data: targetDate,
                            tipo: sourceDia.tipo,
                            turno: sourceDia.tipo === 'trabalho' ? sourceDia.turno : undefined,
                            descricao: sourceDia.descricao,
                          };
                        });
                        return next;
                      });

                      void (async () => {
                        try {
                          if (onReplicateScaleDays) {
                            const success = await onReplicateScaleDays({
                              colaboradorId: empId,
                              data: fromDate,
                              targetDates,
                              source: {
                                tipo: sourceDia.tipo,
                                turno: sourceDia.tipo === 'trabalho' ? sourceDia.turno : undefined,
                                descricao: sourceDia.descricao,
                              },
                            });
                            if (success === false) {
                              setToastMessage('Replicação aplicada localmente. Sincronização pendente.');
                              setTimeout(() => setToastMessage(null), 3000);
                              return;
                            }
                          }

                          setToastMessage(`Replicação aplicada em ${targetDates.length} dia(s).`);
                          setTimeout(() => setToastMessage(null), 2500);
                        } catch (error) {
                          setToastMessage('Replicação aplicada localmente. Falha na sincronização com servidor.');
                          setTimeout(() => setToastMessage(null), 3200);
                        }
                      })();
                    }}
                    minStaffRequired={Math.max(1, planningCoverageTarget)}
                  />
                )}
              </>
            ) : (
              <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/10 shadow-sm text-center">
                <p className="text-on-surface-variant text-sm">
                  <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">info</span>
                  Nenhum colaborador disponível para visualizar escala.
                </p>
              </div>
            )}
          </div>

          {/* Popover para edição de dia */}
          <PlanningDayPopover
            isOpen={isPopoverOpen}
            dia={selectedPlanningDay}
            onClose={() => {
              setIsPopoverOpen(false);
              setSelectedPlanningEmployeeId(null);
            }}
            onSave={async (tipo, turno, descricao) => {
              if (!selectedPlanningDay) return;

              const data = selectedPlanningDay.data;
              const employeeId = selectedPlanningEmployeeId || selectedScaleEmployee?.id;
              if (!employeeId) return;

              setPlanningOverrides((prev) => ({
                ...prev,
                [`${employeeId}:${data}`]: {
                  colaboradorId: employeeId,
                  data,
                  tipo,
                  turno: tipo === 'trabalho' ? turno : undefined,
                  descricao,
                },
              }));

              setSelectedPlanningDay((prev) => {
                if (!prev || prev.data !== data) return prev;
                const nextTurno = tipo === 'trabalho' ? turno : undefined;
                const { horaInicio, horaFim } = splitTurno(nextTurno);
                return {
                  ...prev,
                  tipo,
                  turno: nextTurno,
                  horaInicio,
                  horaFim,
                  descricao,
                };
              });

              try {
                if (onSaveScaleOverride) {
                  const success = await onSaveScaleOverride({
                    colaboradorId: employeeId,
                    data,
                    tipo,
                    turno: tipo === 'trabalho' ? turno : undefined,
                    descricao,
                  });
                  if (success === false) {
                    setToastMessage('Dia atualizado localmente. Sincronização pendente.');
                    setTimeout(() => setToastMessage(null), 3000);
                    return;
                  }
                }

                setToastMessage('Dia planejado salvo com sucesso.');
                setTimeout(() => setToastMessage(null), 2500);
              } catch (error) {
                setToastMessage('Dia atualizado localmente. Falha na sincronização com servidor.');
                setTimeout(() => setToastMessage(null), 3200);
              }
            }}
          />

          {isScaleGeneratorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
                onClick={() => setIsScaleGeneratorOpen(false)}
                aria-label="Fechar modal"
              />

              <div className="relative w-full max-w-2xl rounded-3xl border border-outline-variant/20 bg-surface-container shadow-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-xl font-headline text-on-surface">Gerar Nova Escala</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Defina colaborador, mês e jornada para atualizar a grade.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScaleGeneratorOpen(false)}
                    className="w-9 h-9 rounded-xl border border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                    title="Fechar"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Colaborador</label>
                      <input
                        type="text"
                        value={scaleGeneratorSearch}
                        onChange={(event) => setScaleGeneratorSearch(event.target.value)}
                        placeholder="Buscar colaborador"
                        className="w-full h-10 mb-2 px-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface"
                      />
                      <select
                        value={scaleGeneratorEmployeeId}
                        onChange={(event) => setScaleGeneratorEmployeeId(event.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface"
                      >
                        {filteredScaleGeneratorEmployees.length === 0 && (
                          <option value="">Nenhum colaborador encontrado</option>
                        )}
                        {filteredScaleGeneratorEmployees.map((employee) => (
                          <option key={employee.id} value={employee.id}>{employee.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Mês</label>
                      <input
                        type="month"
                        value={scaleGeneratorMonth}
                        onChange={(event) => setScaleGeneratorMonth(event.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Tipo de Escala</label>
                      <select
                        value={scaleGeneratorType || '6x1'}
                        onChange={(event) => setScaleGeneratorType(event.target.value as Employee['tipoEscala'])}
                        className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface"
                      >
                        <option value="6x1">6x1 (6 dias trabalho, 1 folga)</option>
                        <option value="5x1">5x1 (5 dias trabalho, 1 folga)</option>
                        <option value="5x2">5x2 (5 dias trabalho, 2 folgas)</option>
                        <option value="12x36">12x36 (12h trabalho, 36h folga)</option>
                        <option value="rotativo">Rotativo</option>
                        <option value="personalizado">Personalizado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Folgas no Domingo</label>
                      <div className="h-11 rounded-xl bg-surface-container-low border border-outline-variant/20 px-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setScaleGeneratorSundayOffs((current) => Math.max(0, current - 1))}
                          className="w-8 h-8 rounded-lg border border-outline-variant/20 text-on-surface-variant hover:text-primary"
                        >
                          -
                        </button>
                        <span className="text-sm font-bold text-on-surface tabular-nums">{scaleGeneratorSundayOffs}</span>
                        <button
                          type="button"
                          onClick={() => setScaleGeneratorSundayOffs((current) => Math.min(5, current + 1))}
                          className="w-8 h-8 rounded-lg border border-outline-variant/20 text-on-surface-variant hover:text-primary"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Meta de Cobertura</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={scaleGeneratorCoverageTarget}
                        onChange={(event) => setScaleGeneratorCoverageTarget(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
                        className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface"
                        placeholder="Mínimo ativo por dia"
                      />
                      <p className="mt-1 text-[11px] text-on-surface-variant">Mínimo de colaboradores ativos por dia.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Regra de Domingos</label>
                      <select
                        value={scaleGeneratorSundayFrequency}
                        onChange={(event) => setScaleGeneratorSundayFrequency(event.target.value as '1x1' | '2x1')}
                        className="w-full h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface"
                      >
                        <option value="1x1">1 domingo de folga a cada 1 trabalhado (1x1)</option>
                        <option value="2x1">1 domingo de folga a cada 2 trabalhados (2x1)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-outline-variant/10 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsScaleGeneratorOpen(false)}
                    className="h-11 px-5 rounded-xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:text-on-surface"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateScale}
                    disabled={!scaleGeneratorEmployeeId || isSavingPlanning}
                    className="h-11 px-6 rounded-xl bg-primary text-on-primary text-sm font-bold uppercase tracking-wider hover:bg-primary-dim disabled:opacity-60"
                  >
                    {isSavingPlanning ? 'Gerando...' : 'Gerar Escala'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

  );
}
