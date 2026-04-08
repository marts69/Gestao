import React, { useMemo, useRef } from 'react';
import { DiaEscala } from '../../../utils/escalaCalculator';

interface CalendarioEscalaProps {
  escalas: DiaEscala[];
  year: number;
  month: number; // 1-12
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  hideMonthBadge?: boolean;
  onDayClick?: (day: number) => void;
  isInteractive?: boolean;
}

const DAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export function CalendarioEscala({ escalas, year, month, selectedMonth, onMonthChange, hideMonthBadge = false, onDayClick, isInteractive = false }: CalendarioEscalaProps) {
  const monthInputRef = useRef<HTMLInputElement | null>(null);

  const monthLabel = useMemo(() => {
    const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [month, year]);

  const { daysInMonth, firstDayOfMonth, mapByDay, today } = useMemo(() => {
    const days = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const map = new Map<number, DiaEscala>();
    const currentDate = new Date();
    const todayDay = currentDate.getFullYear() === year && currentDate.getMonth() + 1 === month 
      ? currentDate.getDate() 
      : -1;

    escalas.forEach((item) => {
      const [itemYear, itemMonth, itemDay] = item.data.split('-').map(Number);
      if (itemYear === year && itemMonth === month) {
        map.set(itemDay, item);
      }
    });

    return {
      daysInMonth: days,
      firstDayOfMonth: firstDay,
      mapByDay: map,
      today: todayDay,
    };
  }, [escalas, year, month]);

  const cltViolationDays = useMemo(() => {
    const violations = new Set<number>();
    let consecutiveWorkDays = 0;

    for (let day = 1; day <= daysInMonth; day += 1) {
      const tipo = mapByDay.get(day)?.tipo || 'trabalho';
      if (tipo === 'trabalho') {
        consecutiveWorkDays += 1;
        if (consecutiveWorkDays >= 7) {
          violations.add(day);
        }
      } else {
        consecutiveWorkDays = 0;
      }
    }

    return violations;
  }, [daysInMonth, mapByDay]);

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

  return (
    <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className="text-lg font-headline text-primary">📅 Calendário de Escalas</h3>
        {!hideMonthBadge && onMonthChange && selectedMonth ? (
          <div className="relative">
            <button
              type="button"
              onClick={openMonthPicker}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
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
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-primary/20 text-primary">
            {monthLabel}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-3">
        {DAY_HEADERS.map((day) => (
          <span key={day} className="text-[10px] font-bold text-primary/70 uppercase tracking-widest py-2">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="h-20 rounded-xl bg-surface-container-low/20 border border-outline-variant/5" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const escala = mapByDay.get(day);
          const weekDay = new Date(year, month - 1, day).getDay();
          const isWeekend = weekDay === 0 || weekDay === 6;
          const isTrabalho = escala?.tipo === 'trabalho';
          const isFolga = escala?.tipo === 'folga';
          const isFds = escala?.tipo === 'fds';
          const hasCltAlert = cltViolationDays.has(day);
          const isFolgaDominicalConfigurada = Boolean(escala?.folgaDominicalConfigurada);
          const isToday = day === today;
          const isPast = day < today;

          let bgClass = 'bg-surface-container-low/50 border-outline-variant/20 text-on-surface-variant';
          if (isFolga || isFds) {
            bgClass = 'bg-surface-variant/20 border-dashed border-2 border-outline-variant/40 text-on-surface-variant';
          } else if (isTrabalho) {
            const t = escala?.turno || '';
            const [start] = t.split('-');
            const startHour = parseInt(start?.split(':')[0] || '8', 10);
            
            if (startHour >= 12 && startHour < 18) {
              bgClass = 'bg-indigo-500/10 border-l-4 border-indigo-500 text-indigo-700 hover:bg-indigo-500/20';
            } else if (startHour >= 18 || startHour < 5) {
              bgClass = 'bg-purple-500/10 border-l-4 border-purple-500 text-purple-700 hover:bg-purple-500/20';
            } else if (startHour >= 5 && startHour < 12) {
              if (t.includes('18:00') || t.includes('19:00') || t.includes('17:00')) {
                bgClass = 'bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-700 hover:bg-emerald-500/20'; // Comercial
              } else {
                bgClass = 'bg-blue-500/10 border-l-4 border-blue-500 text-blue-700 hover:bg-blue-500/20'; // Manhã
              }
            } else {
              bgClass = 'bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-700 hover:bg-emerald-500/20'; // Fallback
            }
          }

          const weekendClass = isWeekend ? 'ring-1 ring-inset ring-outline-variant/25' : '';
          const pastClass = isPast && day !== today ? 'opacity-50' : '';
          const todayClass = isToday ? 'ring-2 ring-primary shadow-lg' : '';
          const interactiveClass = isInteractive ? 'cursor-pointer hover:shadow-md hover:scale-105 transition-all' : '';

          const primaryLabel = isFolga
            ? 'FOLGA'
            : isFds
              ? 'FDS'
              : escala?.turno
                ? escala.turno.split('-')[0]
                : 'TRAB';

          const secondaryLabel = isTrabalho && escala?.turno?.includes('-')
            ? escala.turno.split('-')[1]
            : isFds
              ? 'Fim de semana'
              : '';

          return (
            <div key={day} className="relative group h-20">
              <button
                onClick={() => onDayClick?.(day)}
                disabled={!isInteractive}
                className={`w-full h-full rounded-xl border p-3 text-left flex flex-col justify-between transition-all ${bgClass} ${weekendClass} ${pastClass} ${todayClass} ${interactiveClass} ${hasCltAlert ? 'border-error/60 ring-2 ring-error/50' : ''} disabled:cursor-default`}
              >
              <div className="flex items-start justify-between gap-1 w-full">
                <div className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                  {day}
                </div>
                {hasCltAlert && (
                  <span className="text-[9px] font-black text-error">!</span>
                )}
                {isFolgaDominicalConfigurada && (
                  <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/80 text-on-primary">
                    Dom
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5 w-full">
                <div className={`text-[10px] font-black tracking-wide ${isFolga || isFds ? 'opacity-60' : 'opacity-90'}`}>
                  {primaryLabel}
                </div>

                {secondaryLabel && (
                  <div className="text-[9px] font-semibold opacity-75 truncate w-full">{secondaryLabel}</div>
                )}
              </div>
              </button>

              {/* Tooltip Nativo CSS Flutuante */}
              {escala && (
                 <div className="absolute z-50 bottom-full mb-2 hidden group-hover:flex flex-col w-56 p-3 bg-surface-container-highest shadow-2xl rounded-2xl text-sm border border-outline-variant pointer-events-none left-1/2 -translate-x-1/2">
                    <div className="font-bold text-primary mb-1 border-b border-outline-variant/30 pb-1">
                      {String(day).padStart(2, '0')}/{String(month).padStart(2, '0')}/{year}
                    </div>
                    <div className="text-xs text-on-surface mb-1 mt-1">
                      <span className="font-bold">Status:</span> {isFolga ? 'Folga' : isFds ? 'Fim de Semana' : 'Trabalho'}
                    </div>
                    {isTrabalho && escala.turno && (
                      <div className="text-xs text-on-surface mb-1">
                        <span className="font-bold">Turno:</span> {escala.turno}
                      </div>
                    )}
                    {escala.descricao && (
                      <div className="text-xs text-on-surface-variant italic mt-1">
                        "{escala.descricao}"
                      </div>
                    )}
                    {hasCltAlert && (
                      <div className="text-xs text-error font-bold mt-2 flex items-center gap-1 bg-error/10 p-1.5 rounded-lg border border-error/20">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Falta de Descanso Semanal
                      </div>
                    )}
                    <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 border-8 border-transparent border-t-surface-container-highest"></div>
                 </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda Atualizada */}
      <div className="mt-5 pt-4 border-t border-outline-variant/10 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-blue-500/10 border-l-2 border-blue-500"></span>
          <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Manhã</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-indigo-500/10 border-l-2 border-indigo-500"></span>
          <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Tarde</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-purple-500/10 border-l-2 border-purple-500"></span>
          <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Noite</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-500/10 border-l-2 border-emerald-500"></span>
          <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Outro Turno</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-surface-variant/20 border-dashed border-2 border-outline-variant/40"></span>
          <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Folga/FDS</span>
        </div>
        {isInteractive && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-lg">👆</span>
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Clicável para editar</span>
          </div>
        )}
      </div>
    </div>
  );
}
