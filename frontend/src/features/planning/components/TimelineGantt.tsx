import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Employee } from '../../../types';
import { gerarEscala, DiaEscala } from '../../../utils/escalaCalculator';

interface TimelineGanttProps {
  employees: Employee[];
  month: string; // "2026-04"
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  hideMonthBadge?: boolean;
  isEditable?: boolean;
  suggestedKeys?: string[];
  onQuickToggleDay?: (employeeId: string, day: string, current?: DiaEscala) => void;
  onQuickSetDay?: (employeeId: string, day: string, tipo: DiaEscala['tipo'], turno?: string) => void;
  onClick?: (empleoyeeId: string, day: string) => void;
  onShiftDrop?: (fromEmployeeId: string, fromDay: string, toEmployeeId: string, toDay: string) => void;
  onReplicate?: (employeeId: string, fromDay: number, toDay: number, tipo?: DiaEscala['tipo']) => void;
  minStaffRequired?: number;
  overrides?: Array<{
    colaboradorId: string;
    data: string;
    tipo: DiaEscala['tipo'];
    turno?: string;
    descricao?: string;
  }>;
}

export function TimelineGantt({ employees, month, selectedMonth, onMonthChange, hideMonthBadge = false, isEditable = false, suggestedKeys = [], onQuickToggleDay, onQuickSetDay, onClick, onShiftDrop, onReplicate, minStaffRequired, overrides = [] }: TimelineGanttProps) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [quickMenu, setQuickMenu] = useState<{
    employeeId: string;
    day: string;
    x: number;
    y: number;
  } | null>(null);
  const monthInputRef = useRef<HTMLInputElement | null>(null);
  const [year, monthNum] = month.split('-').map(Number);
  const suggestedKeySet = useMemo(() => new Set(suggestedKeys), [suggestedKeys]);

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthLabel = useMemo(() => {
    const label = new Date(year, monthNum - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [year, monthNum]);

  const dayMeta = useMemo(() => {
    const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    return days.map((day) => {
      const date = new Date(year, monthNum - 1, day);
      const weekday = date.getDay();
      return {
        day,
        weekday,
        weekdayLabel: weekdayLabels[weekday],
        isWeekend: weekday === 0 || weekday === 6,
      };
    });
  }, [days, monthNum, year]);

  const overridesMap = useMemo(() => {
    const map = new Map<string, { tipo: DiaEscala['tipo']; turno?: string; descricao?: string }>();
    overrides.forEach((override) => {
      map.set(`${override.colaboradorId}:${override.data}`, {
        tipo: override.tipo,
        turno: override.turno,
        descricao: override.descricao,
      });
    });
    return map;
  }, [overrides]);

  const escalasByEmployee = useMemo(() => {
    const map = new Map<string, Map<number, DiaEscala>>();

    employees.forEach((emp) => {
      const firstDay = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const escala = gerarEscala(
        {
          tipo: emp.tipoEscala || '6x1',
          dataInicio: firstDay,
        },
        daysInMonth,
      );
      const dayMap = new Map<number, DiaEscala>();

      escala.forEach((dia) => {
        const override = overridesMap.get(`${emp.id}:${dia.data}`);
        const hasTurno = Boolean(override?.turno && override.turno.includes('-'));
        const [horaInicio, horaFim] = hasTurno ? (override?.turno || '').split('-') : [undefined, undefined];

        const diaFinal: DiaEscala = override
          ? {
              ...dia,
              tipo: override.tipo,
              turno: override.tipo === 'trabalho' ? (override.turno || dia.turno) : undefined,
              horaInicio: override.tipo === 'trabalho' ? (horaInicio || dia.horaInicio) : undefined,
              horaFim: override.tipo === 'trabalho' ? (horaFim || dia.horaFim) : undefined,
              descricao: override.descricao ?? dia.descricao,
            }
          : dia;

        const [_, __, day] = diaFinal.data.split('-').map(Number);
        dayMap.set(day, diaFinal);
      });

      map.set(emp.id, dayMap);
    });

    return map;
  }, [employees, year, monthNum, overridesMap]);

  // Coverage: count how many employees are working per day
  const coverageByDay = useMemo(() => {
    const counts = new Map<number, number>();
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) counts.set(d, 0);

    escalasByEmployee.forEach((dayMap) => {
      for (const [day, dia] of dayMap.entries()) {
        if (dia.tipo === 'trabalho') counts.set(day, (counts.get(day) || 0) + 1);
      }
    });

    return counts;
  }, [escalasByEmployee, year, monthNum]);

  // Alerta simples de descanso semanal: marca a partir do 7o dia consecutivo de trabalho
  const cltViolationByEmployee = useMemo(() => {
    const map = new Map<string, Set<number>>();

    escalasByEmployee.forEach((dayMap, employeeId) => {
      let consecutiveWorkDays = 0;
      const violations = new Set<number>();

      for (let day = 1; day <= daysInMonth; day += 1) {
        const dia = dayMap.get(day);
        const isWorkingDay = (dia?.tipo || 'trabalho') === 'trabalho';

        if (isWorkingDay) {
          consecutiveWorkDays += 1;
          if (consecutiveWorkDays >= 7) {
            violations.add(day);
          }
        } else {
          consecutiveWorkDays = 0;
        }
      }

      map.set(employeeId, violations);
    });

    return map;
  }, [daysInMonth, escalasByEmployee]);

  const getBackgroundColor = (tipo: DiaEscala['tipo'], isWeekend: boolean) => {
    const weekendClass = isWeekend ? 'ring-1 ring-inset ring-outline-variant/25' : '';
    switch (tipo) {
      case 'trabalho':
        return `bg-surface-container-low/70 hover:bg-surface-container ${weekendClass}`;
      case 'folga':
        return `bg-secondary-container/35 hover:bg-secondary-container/55 ${weekendClass}`;
      case 'fds':
        return `bg-tertiary/20 hover:bg-tertiary/35 ${weekendClass}`;
      default:
        return `bg-surface-container-low/50 ${weekendClass}`;
    }
  };

  const getCellLabel = (dia?: DiaEscala) => {
    if (!dia) return '';
    if (dia.tipo === 'folga') return 'FOLGA';
    if (dia.tipo === 'fds') return 'FDS';
    if (dia.turno) return dia.turno.split('-')[0];
    return 'TRAB';
  };

  const openMonthPicker = () => {
    const input = monthInputRef.current;
    if (!input) return;
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
      return;
    }
    input.click();
  };

  useEffect(() => {
    if (!quickMenu) return;

    const closeMenu = () => setQuickMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [quickMenu]);

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-outline-variant/10 bg-surface-container-low flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-on-surface">Linha do Tempo de Escala</h3>
        {!hideMonthBadge && onMonthChange && selectedMonth ? (
          <div className="relative">
            <button
              type="button"
              onClick={openMonthPicker}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            >
              <span>{monthLabel}</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>
            <input
              ref={monthInputRef}
              type="month"
              value={selectedMonth}
              onChange={(event) => onMonthChange(event.target.value)}
              tabIndex={-1}
              aria-hidden="true"
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
            />
          </div>
        ) : !hideMonthBadge ? (
          <span className="text-xs font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-primary/20 text-primary">
            {monthLabel}
          </span>
        ) : null}
      </div>

      {/* Header com dias */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-fit">
          {/* Cabeçalho da tabela */}
          <div className="flex flex-col sticky left-0 z-10">
            <div className="flex items-center">
              <div className="w-48 bg-surface-container-low border-r border-outline-variant/10 p-3 font-bold text-sm text-on-surface sticky left-0 z-20">
                Colaborador
              </div>

              <div className="flex-1 p-3 bg-surface-container-low border-b border-outline-variant/10 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                Grade da equipe
              </div>
            </div>

            {/* Coverage summary */}
            <div className="flex items-center">
              <div className="w-48 bg-surface-container-low border-r border-outline-variant/10 p-3 font-bold text-[11px] uppercase tracking-[0.15em] text-on-surface-variant sticky left-0 z-20">
                Cobertura diária
              </div>

              <div className="flex gap-0.5 p-2 bg-surface-container-low border-b border-outline-variant/10">
                {dayMeta.map((meta) => {
                  const count = coverageByDay.get(meta.day) || 0;
                  const isLow = typeof minStaffRequired === 'number' && count < minStaffRequired;
                  return (
                    <div
                      key={`summary-${meta.day}`}
                      className={`w-12 h-7 flex items-center justify-center text-[11px] font-bold rounded-lg border ${
                        isLow
                          ? 'bg-error/20 border-error/60 text-error'
                          : 'bg-primary/20 border-primary/40 text-on-surface'
                      } ${meta.isWeekend ? 'ring-1 ring-inset ring-outline-variant/20' : ''}`}
                      title={isLow ? 'Cobertura abaixo do mínimo' : 'Cobertura adequada'}
                    >
                      <div className="flex items-center gap-0.5" aria-label={`Cobertura ${count}/${minStaffRequired || 0}`}>
                        {isLow && <span className="text-[10px] font-black">!</span>}
                        <span>{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dias do mês */}
            <div className="flex items-center">
              <div className="w-48 bg-surface-container-low border-r border-outline-variant/10 p-3 font-bold text-[11px] uppercase tracking-[0.15em] text-on-surface-variant sticky left-0 z-20">
                Dias
              </div>

              <div className="flex gap-0.5 p-2 bg-surface-container-low border-b border-outline-variant/10">
                {dayMeta.map((meta) => (
                  <div
                    key={meta.day}
                    className={`w-12 h-10 flex flex-col items-center justify-center rounded-lg border border-outline-variant/10 ${
                      meta.isWeekend ? 'bg-surface-container text-on-surface' : 'bg-surface-container-lowest text-on-surface-variant'
                    }`}
                  >
                    <span className="text-[11px] font-bold leading-none">{meta.day}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wide leading-none mt-1">{meta.weekdayLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rows de colaboradores */}
          <div>
            {employees.map((emp) => {
              const dataPorDia = escalasByEmployee.get(emp.id) || new Map();
              return (
                <div key={emp.id} className="flex items-center border-b border-outline-variant/10 last:border-b-0 hover:bg-surface-container-low/50 transition-colors">
                  {/* Nome do colaborador */}
                  <div className="w-48 bg-surface-container-low p-3 text-sm font-bold text-on-surface truncate border-r border-outline-variant/10 sticky left-0 z-10">
                    <div className="flex items-center gap-2">
                      <img
                        src={emp.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${emp.name}`}
                        alt={emp.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="truncate">{emp.name}</span>
                    </div>
                  </div>

                  {/* Células de dias */}
                  <div className="flex gap-0.5 p-2">
                    {dayMeta.map((meta) => {
                      const dia = dataPorDia.get(meta.day);
                      const count = coverageByDay.get(meta.day) || 0;
                      const isLow = typeof minStaffRequired === 'number' && count < minStaffRequired;
                      const hasCltAlert = cltViolationByEmployee.get(emp.id)?.has(meta.day) || false;
                      const hasAlert = isLow || hasCltAlert;
                      const cellKey = `${emp.id}:${meta.day}`;
                      const cellDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(meta.day).padStart(2, '0')}`;
                      const isDragTarget = dragOverKey === cellKey;
                      const isSuggested = suggestedKeySet.has(cellKey);
                      const borderClass = hasCltAlert
                        ? 'border-amber-400'
                        : isLow
                          ? 'border-error/60'
                          : 'border-outline-variant/20';
                      return (
                        <div key={meta.day} className="relative group">
                          <button
                            type="button"
                            draggable={isEditable}
                            onDragStart={(e) => {
                              if (!isEditable) return;
                              setDragOverKey(null);
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', JSON.stringify({ empId: emp.id, day: meta.day }));
                            }}
                            onDragEnd={() => {
                              if (!isEditable) return;
                              setDragOverKey(null);
                            }}
                            onDragOver={(e) => {
                              if (!isEditable) return;
                              e.preventDefault();
                              setDragOverKey(cellKey);
                            }}
                            onDragLeave={() => {
                              if (!isEditable) return;
                              setDragOverKey((current) => (current === cellKey ? null : current));
                            }}
                            onDrop={(e) => {
                              if (!isEditable) return;
                              e.preventDefault();
                              setDragOverKey(null);

                              try {
                                const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
                                if (payload && payload.empId) {
                                  const fromEmpId = payload.empId;
                                  const fromDay = `${year}-${String(monthNum).padStart(2, '0')}-${String(payload.day).padStart(2, '0')}`;
                                  const toDay = `${year}-${String(monthNum).padStart(2, '0')}-${String(meta.day).padStart(2, '0')}`;
                                  onShiftDrop?.(fromEmpId, fromDay, emp.id, toDay);
                                }
                              } catch (err) {
                                // ignore invalid drag payload
                              }
                            }}
                            onClick={() => {
                              if (isEditable && onQuickToggleDay) {
                                onQuickToggleDay(emp.id, cellDate, dia);
                                return;
                              }

                              onClick?.(emp.id, cellDate);
                            }}
                            onContextMenu={(event) => {
                              if (!isEditable) return;
                              event.preventDefault();
                              setQuickMenu({
                                employeeId: emp.id,
                                day: cellDate,
                                x: event.clientX,
                                y: event.clientY,
                              });
                            }}
                            className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-all cursor-pointer border ${
                              borderClass
                            } ${isSuggested ? 'border-dashed opacity-90' : ''} hover:border-primary/50 ${isDragTarget ? 'ring-2 ring-primary/80 shadow-md' : ''} ${getBackgroundColor(dia?.tipo || 'trabalho', meta.isWeekend)}`}
                            title={`${emp.name} - ${dia?.data || ''} - ${dia?.descricao || ''}${hasCltAlert ? ' - Alerta CLT: descanso semanal' : ''}${isSuggested ? ' - Sugestão automática' : ''}`}
                          >
                            <span className={`text-[8px] font-black leading-none ${dia?.tipo === 'folga' ? 'text-secondary' : dia?.tipo === 'fds' ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                              {getCellLabel(dia)}
                            </span>
                            {dia?.tipo === 'trabalho' && dia.turno && (
                              <span className="text-[7px] font-semibold text-on-surface-variant truncate w-full text-center mt-0.5 px-0.5">
                                {dia.turno.split('-')[1] || ''}
                              </span>
                            )}
                            {hasAlert && (
                              <span className={`absolute top-0.5 left-0.5 text-[8px] font-black ${hasCltAlert ? 'text-amber-400' : 'text-error'}`}>!</span>
                            )}
                            {isSuggested && (
                              <span className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                          </button>

                          {/* Replicate handle (right-bottom small area) */}
                          {isEditable && (
                            <div
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onReplicate?.(emp.id, meta.day, daysInMonth, dia?.tipo);
                              }}
                              data-replicate-end={meta.day}
                              className="absolute right-0.5 bottom-0.5 w-2.5 h-2.5 rounded-sm bg-outline-variant/40 hover:bg-primary/70 cursor-grab z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="p-4 bg-surface-container-low border-t border-outline-variant/10 flex flex-wrap gap-4 items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-surface-container border border-outline-variant/30"></span>
          <span className="text-[10px] text-on-surface-variant font-bold">Trabalho (padrão)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-secondary-container/45 border border-secondary/50"></span>
          <span className="text-[10px] text-on-surface-variant font-bold">Folga</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-tertiary/25 border border-tertiary/50"></span>
          <span className="text-[10px] text-on-surface-variant font-bold">FDS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-error/25 border border-error/60 flex items-center justify-center text-[9px] font-black text-error">!</span>
          <span className="text-[10px] text-on-surface-variant font-bold">Cobertura baixa / Alerta CLT</span>
        </div>
      </div>

      {isEditable && quickMenu && (
        <div
          className="fixed z-50 rounded-xl border border-outline-variant/25 bg-surface-container-high shadow-xl p-1 flex items-center gap-1"
          style={{ top: quickMenu.y + 8, left: quickMenu.x - 20 }}
        >
          {[
            { label: 'M', tipo: 'trabalho' as const, turno: '06:00-14:00' },
            { label: 'T', tipo: 'trabalho' as const, turno: '14:00-22:00' },
            { label: 'N', tipo: 'trabalho' as const, turno: '22:00-06:00' },
            { label: 'F', tipo: 'folga' as const, turno: undefined },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                onQuickSetDay?.(quickMenu.employeeId, quickMenu.day, option.tipo, option.turno);
                setQuickMenu(null);
              }}
              className="w-8 h-8 rounded-lg border border-outline-variant/20 bg-surface-container-low text-[11px] font-bold text-on-surface-variant hover:text-primary"
              title={
                option.label === 'M'
                  ? 'Manhã'
                  : option.label === 'T'
                    ? 'Tarde'
                    : option.label === 'N'
                      ? 'Noite'
                      : 'Folga'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
