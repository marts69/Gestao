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

          const bgClass = isTrabalho
            ? 'bg-surface-container-low/75 border-outline-variant/35'
            : isFolga
              ? 'bg-secondary-container/35 border-secondary/45'
              : isFds
                ? 'bg-tertiary/25 border-tertiary/45'
                : 'bg-surface-container-low/50 border-outline-variant/20';

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
            <button
              key={day}
              onClick={() => onDayClick?.(day)}
              disabled={!isInteractive}
              className={`h-20 rounded-xl border p-3 text-left flex flex-col justify-between transition-all ${bgClass} ${weekendClass} ${pastClass} ${todayClass} ${interactiveClass} ${hasCltAlert ? 'border-error/60' : ''} disabled:cursor-default`}
              title={`${escala?.descricao || 'Sem escala definida'}${hasCltAlert ? ' - Alerta CLT: descanso semanal' : ''}`}
            >
              <div className="flex items-start justify-between gap-1">
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

              <div className="flex flex-col gap-0.5">
                <div className={`text-[10px] font-black tracking-wide ${isFolga ? 'text-secondary' : isFds ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                  {primaryLabel}
                </div>

                {secondaryLabel && (
                  <div className="text-[9px] font-semibold text-on-surface-variant truncate">{secondaryLabel}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-5 pt-4 border-t border-outline-variant/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-surface-container border border-outline-variant/30"></span>
          <span className="text-[9px] text-on-surface-variant font-bold">Trabalho</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-secondary-container/45 border border-secondary/50"></span>
          <span className="text-[9px] text-on-surface-variant font-bold">Folga</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-tertiary/25 border border-tertiary/50"></span>
          <span className="text-[9px] text-on-surface-variant font-bold">FDS</span>
        </div>
        {isInteractive && (
          <div className="flex items-center gap-2">
            <span className="text-lg">👆</span>
            <span className="text-[9px] text-on-surface-variant font-bold">Clicável</span>
          </div>
        )}
      </div>
    </div>
  );
}
