import React, { createContext, useContext } from 'react';
import { Appointment, Employee, Service } from '../types';
import { getDuration, matchesAppointmentSearch } from './appointmentUtils';

export interface ScheduleGridContext {
  receptionDate: string;
  scheduleSearchTerm: string;
  appointments: Appointment[];
  services: Service[];
  startHour: number;
  endHour: number;
  minuteHeight: number;
  hourHeight: number;
  isTodayView: boolean;
  currentMinute: Date;
  todayStr: string;
}

export interface ScheduleGridActions {
  onGridClick: (e: React.MouseEvent<HTMLDivElement>, empId: string) => void;
  onDeleteBloqueio?: (id: string) => Promise<boolean | void> | void;
  onCompleteAppointment: (id: string) => void;
  onEditAppointmentClick: (appointment: Appointment) => void;
  onDeleteAppointmentClick: (id: string) => void;
  setToastMessage: (msg: string | null) => void;
}

interface EmployeeScheduleColumnProps {
  emp: Employee;
}

interface ScheduleGridProviderProps {
  schedule: ScheduleGridContext;
  actions: ScheduleGridActions;
  children: React.ReactNode;
}

const ScheduleGridContextInternal = createContext<{ schedule: ScheduleGridContext; actions: ScheduleGridActions } | null>(null);

export const ScheduleGridProvider = ({ schedule, actions, children }: ScheduleGridProviderProps) => {
  return (
    <ScheduleGridContextInternal.Provider value={{ schedule, actions }}>
      {children}
    </ScheduleGridContextInternal.Provider>
  );
};

export const EmployeeScheduleColumn = React.memo(({ emp }: EmployeeScheduleColumnProps) => {
  const gridContext = useContext(ScheduleGridContextInternal);
  if (!gridContext) {
    throw new Error('EmployeeScheduleColumn deve ser usado dentro de ScheduleGridProvider.');
  }

  const { schedule, actions } = gridContext;
  const {
    receptionDate,
    scheduleSearchTerm,
    appointments,
    services,
    startHour,
    endHour,
    minuteHeight,
    hourHeight,
    isTodayView,
    currentMinute,
    todayStr,
  } = schedule;
  const {
    onGridClick,
    onDeleteBloqueio,
    onCompleteAppointment,
    onEditAppointmentClick,
    onDeleteAppointmentClick,
    setToastMessage,
  } = actions;

  const empAppointments = appointments
    .filter((a) => a.date === receptionDate && a.assignedEmployeeId === emp.id)
    .filter((a) => matchesAppointmentSearch(a, scheduleSearchTerm));

  const empBlockers = (emp.bloqueios || []).filter((b) => b.data === receptionDate);

  return (
    <div
      onClick={(e) => onGridClick(e, emp.id)}
      className="flex-1 min-w-[220px] border-r border-outline-variant/10 relative cursor-pointer hover:bg-primary/5 transition-colors"
      style={{ height: (endHour - startHour + 1) * hourHeight }}
    >
      {empBlockers.map((bloq) => {
        const [sH, sM] = bloq.horaInicio.split(':').map(Number);
        const [eH, eM] = bloq.horaFim.split(':').map(Number);
        const top = ((sH - startHour) * 60 + sM) * minuteHeight;
        const endTop = ((eH - startHour) * 60 + eM) * minuteHeight;
        const height = Math.max(endTop - top, 20);

        return (
          <div
            key={bloq.id}
            className="absolute left-1 right-1 bg-surface-container-high/60 backdrop-blur-sm rounded-lg border border-outline-variant/30 flex items-center justify-center group overflow-hidden"
            style={{ top, height }}
          >
            <div className="absolute inset-0 opacity-10 repeating-linear-gradient-45 from-transparent to-on-surface-variant"></div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant z-10 truncate px-2">{bloq.motivo}</span>
            {onDeleteBloqueio && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBloqueio(bloq.id);
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-on-surface hover:text-error bg-surface shadow-sm rounded-full z-20 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            )}
          </div>
        );
      })}

      {empAppointments.map((app) => {
        const isCompleted = app.status === 'completed';
        const appDateTime = new Date(`${app.date}T${app.time}:00`);
        const isPastDay = app.date < todayStr;
        const isNoShow = !isCompleted && isPastDay;

        const [appH, appM] = app.time.split(':').map(Number);
        const top = ((appH - startHour) * 60 + appM) * minuteHeight;
        const durationMins = getDuration(app.services, services);
        const height = Math.max(durationMins * minuteHeight, 30);
        const delayMinutes = (!isCompleted && isTodayView && currentMinute > appDateTime)
          ? Math.floor((currentMinute.getTime() - appDateTime.getTime()) / 60000)
          : 0;

        const cardStatusClass = isCompleted
          ? 'bg-surface-container-low/80 border-outline-variant/30 opacity-70'
          : (isNoShow || delayMinutes > 0)
            ? 'bg-error-container/20 border-error/40 shadow-sm'
            : 'bg-surface-container-lowest border-primary/20 shadow-md';
        const sideColorClass = isCompleted ? 'bg-outline-variant/50' : (isNoShow || delayMinutes > 0) ? 'bg-error' : 'bg-primary';

        return (
          <div
            key={app.id}
            className={`absolute left-1 right-1 rounded-xl border ${cardStatusClass} flex flex-col group overflow-hidden transition-all hover:z-20`}
            style={{ top, height }}
          >
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${sideColorClass}`}></div>
            <div className="pl-2 pr-1 py-1 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold leading-none ${isCompleted ? 'text-outline-variant line-through' : (isNoShow || delayMinutes > 0) ? 'text-error' : 'text-primary'}`}>{app.time}</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-lowest/90 rounded-full shadow-sm p-0.5 border border-outline-variant/20 absolute right-1 top-1 z-30">
                  {!isCompleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompleteAppointment(app.id);
                        setToastMessage('Ok!');
                        setTimeout(() => setToastMessage(null), 2000);
                      }}
                      className="text-on-surface-variant hover:text-primary p-1 rounded-full"
                    >
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onEditAppointmentClick(app); }} className="text-on-surface-variant hover:text-primary p-1 rounded-full"><span className="material-symbols-outlined text-[14px]">edit</span></button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteAppointmentClick(app.id); }} className="text-on-surface-variant hover:text-error p-1 rounded-full"><span className="material-symbols-outlined text-[14px]">cancel</span></button>
                </div>
              </div>
              <h5 className="font-bold text-on-surface text-[11px] leading-tight truncate mt-0.5" title={app.clientName}>{app.clientName}</h5>
              {height > 40 && <p className="text-[9px] text-on-surface-variant leading-tight line-clamp-2 mt-0.5" title={app.services.join(', ')}>{app.services.join(', ')}</p>}
              {height > 60 && app.observation && <p className="text-[8px] text-on-surface-variant my-1 italic border-l-2 border-outline-variant/30 pl-1.5 line-clamp-1">{app.observation}</p>}
              {height > 50 && (
                <div className="mt-auto flex gap-1 pt-1 border-t border-outline-variant/10">
                  {delayMinutes > 0 && <span className="bg-error/10 text-error text-[8px] px-1 rounded font-bold">{delayMinutes}m atraso</span>}
                  {isNoShow && <span className="bg-error/10 text-error text-[8px] px-1 rounded font-bold">Falta</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
