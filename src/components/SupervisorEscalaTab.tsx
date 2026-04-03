import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Appointment, Employee, Client, Service, Bloqueio } from '../types';
import { getBrazilCurrentMinuteOfDay, getBrazilCurrentTimeString, getLocalTodayString } from './appointmentUtils';
import { SCHEDULE_CONFIG } from '../config/scheduleConfig';
import { BookingModal } from '../BookingModal';
import { BlockModal } from '../BlockModal';
import { EditAppointmentModal } from '../EditAppointmentModal';
import { DeleteAppointmentModal } from '../DeleteAppointmentModal';
import { useScheduleModals } from '../hooks/useScheduleModals';
import { EmployeeScheduleColumn, ScheduleGridProvider, type ScheduleGridActions, type ScheduleGridContext } from './ScheduleGridColumn';

const { START_HOUR, END_HOUR, HOUR_HEIGHT, MINUTE_HEIGHT, CURRENT_TIME_LINE } = SCHEDULE_CONFIG;

interface SupervisorEscalaTabProps {
  employees: Employee[];
  appointments: Appointment[];
  services: Service[];
  clients: Client[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => Promise<boolean | void> | void;
  isAddingAppointment?: boolean;
  onDeleteAppointment: (id: string) => Promise<boolean | void> | void;
  onEditAppointment: (id: string, appointment: Partial<Appointment>) => Promise<boolean | void> | void;
  onCompleteAppointment: (id: string) => void;
  onEditClient?: (id: string, clientData: Partial<Client>) => Promise<boolean | void> | void;
  onAddBloqueio?: (b: Omit<Bloqueio, 'id'>) => Promise<boolean | void>;
  onDeleteBloqueio?: (id: string) => Promise<boolean | void>;
  setToastMessage: (msg: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
}

export function SupervisorEscalaTab({ employees, appointments, services, clients, onAddAppointment, isAddingAppointment, onDeleteAppointment, onEditAppointment, onCompleteAppointment, onEditClient, onAddBloqueio, onDeleteBloqueio, setToastMessage, setErrorMessage }: SupervisorEscalaTabProps) {
  const [receptionDate, setReceptionDate] = useState(getLocalTodayString());
  const [scheduleSearchTerm, setScheduleSearchTerm] = useState('');
  const {
    state: {
      showNewBookingModal,
      showNewBlockModal,
      editingAppointment,
      appointmentToDelete,
      initialBookTime,
      initialBookEmp,
    },
    openBookingModal,
    closeBookingModal,
    openBlockModal,
    closeBlockModal,
    openEditAppointmentModal,
    closeEditAppointmentModal,
    openDeleteAppointmentModal,
    closeDeleteAppointmentModal,
  } = useScheduleModals();

  const todayStr = getLocalTodayString();
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  
  const [currentMinute, setCurrentMinute] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentMinute(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Lógica do Calendário à esquerda
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  const handlePrevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));
  const formatDayString = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Lógica de Scroll e Interações Visuais
  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (bodyScrollRef.current) bodyScrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const scrollToCurrentTime = () => {
    if (bodyScrollRef.current) {
      const currentMinuteTop = (getBrazilCurrentMinuteOfDay() - START_HOUR * 60) * (HOUR_HEIGHT / 60);
      bodyScrollRef.current.scrollTo({ top: Math.max(0, currentMinuteTop - 100), behavior: 'smooth' });
    }
  };

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>, empId: string) => {
    if (e.target !== e.currentTarget) return;
    const y = e.nativeEvent.offsetY;
    const totalMinutes = y / MINUTE_HEIGHT;
    const hours = Math.floor(totalMinutes / 60) + START_HOUR;
    const minutes = Math.floor(totalMinutes % 60);
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    let finalHours = hours; let finalMins = roundedMinutes;
    if (finalMins === 60) { finalHours += 1; finalMins = 0; }
    const formattedTime = `${finalHours.toString().padStart(2, '0')}:${finalMins.toString().padStart(2, '0')}`;

    const selectedEmployee = employees.find((emp) => emp.id === empId);
    const clickedMinutes = finalHours * 60 + finalMins;
    const blockingReason = (selectedEmployee?.bloqueios || []).find((bloq) => {
      if (bloq.data !== receptionDate) return false;
      const [startH, startM] = bloq.horaInicio.split(':').map(Number);
      const [endH, endM] = bloq.horaFim.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      return clickedMinutes >= start && clickedMinutes < end;
    });

    if (blockingReason) {
      setErrorMessage(`Horário bloqueado para ${selectedEmployee?.name || 'este profissional'}: ${blockingReason.motivo}.`);
      return;
    }

    if (receptionDate === todayStr) {
      const currentTime = getBrazilCurrentTimeString();
      if (formattedTime < currentTime) {
        setErrorMessage('Não é possível agendar horários anteriores à linha vermelha.');
        return;
      }
    }
    openBookingModal(formattedTime, empId);
  }, [employees, receptionDate, setErrorMessage, todayStr]);

  const timelineHours = Array.from({length: END_HOUR - START_HOUR + 1}, (_, i) => START_HOUR + i);
  
  const currentViewDateObj = new Date(`${receptionDate}T12:00:00Z`);
  const activeEmployees = employees.filter(emp => emp.id !== 'admin');

  const isTodayView = receptionDate === todayStr;
  const currentMinuteTop = isTodayView ? (getBrazilCurrentMinuteOfDay() - START_HOUR * 60) * MINUTE_HEIGHT : -100;

  const scheduleGridContext: ScheduleGridContext = {
    receptionDate,
    scheduleSearchTerm,
    appointments,
    services,
    startHour: START_HOUR,
    endHour: END_HOUR,
    minuteHeight: MINUTE_HEIGHT,
    hourHeight: HOUR_HEIGHT,
    isTodayView,
    currentMinute,
    todayStr,
  };

  const scheduleGridActions: ScheduleGridActions = {
    onGridClick: handleGridClick,
    onDeleteBloqueio,
    onCompleteAppointment,
    onEditAppointmentClick: openEditAppointmentModal,
    onDeleteAppointmentClick: openDeleteAppointmentModal,
    setToastMessage,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row gap-6">
      
      {/* Calendário Lateral (Esquerda) */}
      <div className="w-full lg:w-80 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm h-fit shrink-0">
        <div className="flex justify-between items-center mb-6">
           <button onClick={handlePrevMonth} className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
           <h3 className="text-sm font-bold text-primary uppercase tracking-widest">{monthNames[month]} {year}</h3>
           <button onClick={handleNextMonth} className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
           {dayNames.map(day => <span key={day} className="text-[10px] font-bold text-outline uppercase">{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
           {calendarDays.map((d, i) => {
             if (!d) return <div key={`empty-${i}`} className="h-8"></div>;
             const dStr = formatDayString(d);
             const isSelected = receptionDate === dStr;
             const isToday = dStr === todayStr;
             return (
               <button 
                 key={`day-${d}`} onClick={() => setReceptionDate(dStr)}
                 className={`h-8 w-8 mx-auto rounded-full text-xs font-medium flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-on-primary shadow-md' : isToday ? 'border border-primary text-primary' : 'text-on-surface hover:bg-surface-container'}`}
               >{d}</button>
             );
           })}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={() => openBookingModal('', '')} className="w-full bg-primary text-on-primary py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm hover:bg-primary-dim flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span> Nova Reserva
          </button>
          <button onClick={() => openBlockModal('', '')} className="w-full bg-error text-onError py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm hover:bg-error/90 text-white flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">block</span> Novo Bloqueio
          </button>
        </div>
      </div>

      {/* Painel Central (Grade Visual) */}
      <div className="flex-1 bg-surface-container-lowest p-6 lg:p-8 rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
          <div>
            <h3 className="text-2xl font-headline text-primary">Agenda da Recepção</h3>
            <p className="text-sm text-on-surface-variant">Controle do dia {receptionDate.split('-').reverse().join('/')}</p>
          </div>
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
            <input type="text" placeholder="Buscar Cliente ou Serviço..." value={scheduleSearchTerm} onChange={e => setScheduleSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 text-sm rounded-xl focus:ring-1 focus:ring-primary text-on-surface" />
          </div>
        </div>

        <div className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden flex flex-col relative shadow-sm h-full group">
          <button onClick={() => scrollHorizontally('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-surface shadow-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container border border-outline-variant/20 text-on-surface"><span className="material-symbols-outlined">chevron_left</span></button>
          <button onClick={() => scrollHorizontally('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-surface shadow-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-container border border-outline-variant/20 text-on-surface"><span className="material-symbols-outlined">chevron_right</span></button>
          <button onClick={scrollToCurrentTime} className="absolute bottom-4 right-4 z-30 bg-primary-container text-on-primary-container px-4 py-2 rounded-full shadow-md font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-all opacity-0 group-hover:opacity-100"><span className="material-symbols-outlined text-[16px]">my_location</span> Agora</button>

          {/* Cabeçalho Fixo */}
          <div className="flex border-b border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur z-20">
            <div className="w-14 shrink-0 border-r border-outline-variant/10"></div>
            <div className="flex flex-1 overflow-x-hidden" ref={headerScrollRef}>
              {activeEmployees.map(emp => (
                <div key={emp.id} className="flex-1 min-w-[220px] p-2 text-center border-r border-outline-variant/10">
                  <img src={emp.avatar} alt={emp.name} className="w-9 h-9 mx-auto rounded-full border-2 border-surface-container shadow-sm object-cover" />
                  <h4 className="font-bold text-on-surface text-xs mt-1 truncate">{emp.name.split(' ')[0]}</h4>
                  <p className="text-[9px] text-on-surface-variant uppercase tracking-widest truncate">{emp.specialty}</p>
                        {(() => {
                          const dayBlock = (emp.bloqueios || []).find((bloq) => bloq.data === receptionDate);
                          if (!dayBlock) return null;
                          const isFullDay = dayBlock.horaInicio <= `${String(START_HOUR).padStart(2, '0')}:00` && dayBlock.horaFim >= `${String(END_HOUR).padStart(2, '0')}:00`;
                          return (
                            <div className="mt-1 flex flex-col items-center gap-0.5">
                              <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20">
                                {isFullDay ? 'Folga' : 'Bloqueio'}
                              </span>
                              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest truncate max-w-full">{dayBlock.motivo}</p>
                            </div>
                          );
                        })()}
                </div>
              ))}
            </div>
          </div>

          {/* Área Deslizante da Timeline */}
          <div className="flex flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar" ref={bodyScrollRef} onScroll={(e) => { if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft; }}>
            <div className="w-14 shrink-0 bg-surface-container-lowest/95 backdrop-blur border-r border-outline-variant/20 sticky left-0 z-20 flex flex-col">
              {timelineHours.map(hour => (
                <div key={hour} className="relative w-full" style={{ height: HOUR_HEIGHT }}>
                  <span className="absolute top-1 right-2 text-[10px] font-bold text-on-surface-variant bg-surface-container-lowest px-1 leading-none">{hour.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col pointer-events-none z-0 min-w-max">
              {timelineHours.map(hour => (
                <div key={hour} className="w-full border-b border-outline-variant/10" style={{ height: HOUR_HEIGHT }}></div>
              ))}
            </div>

            {isTodayView && currentMinuteTop >= 0 && currentMinuteTop <= ((END_HOUR - START_HOUR) * HOUR_HEIGHT) && (
              <div className={CURRENT_TIME_LINE.CONTAINER_CLASS} style={{ top: currentMinuteTop }}>
                <div className={CURRENT_TIME_LINE.DOT_CLASS}></div>
                <div className={CURRENT_TIME_LINE.BAR_CLASS}></div>
              </div>
            )}
            <ScheduleGridProvider schedule={scheduleGridContext} actions={scheduleGridActions}>
              <div
                className="relative flex flex-1 z-10 min-w-max"
              >
                {activeEmployees.map(emp => (
                  <EmployeeScheduleColumn key={emp.id} emp={emp} />
                ))}
              </div>
            </ScheduleGridProvider>
          </div>
        </div>
      </div>

      {/* Injeção dos Modais Refatorados */}
      {showNewBookingModal && (
        <BookingModal
          receptionDate={receptionDate} initialTime={initialBookTime} initialEmpId={initialBookEmp} clients={clients} services={services} employees={employees} appointments={appointments} isAddingAppointment={isAddingAppointment}
          onClose={closeBookingModal} onAddAppointment={onAddAppointment} onEditClient={onEditClient} setErrorMessage={setErrorMessage} setToastMessage={setToastMessage}
        />
      )}
      {showNewBlockModal && (
        <BlockModal
          receptionDate={receptionDate} initialTime={initialBookTime} initialEmpId={initialBookEmp} employees={employees} appointments={appointments}
          onClose={closeBlockModal} onAddBloqueio={onAddBloqueio} setErrorMessage={setErrorMessage} setToastMessage={setToastMessage}
        />
      )}
      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment} employees={employees} services={services} appointments={appointments}
          onClose={closeEditAppointmentModal} onEditAppointment={onEditAppointment} setErrorMessage={setErrorMessage} setToastMessage={setToastMessage}
        />
      )}
      {appointmentToDelete && (
        <DeleteAppointmentModal
          appointmentId={appointmentToDelete} onClose={closeDeleteAppointmentModal} onDeleteAppointment={onDeleteAppointment} setToastMessage={setToastMessage}
        />
      )}
    </motion.div>
  );
}