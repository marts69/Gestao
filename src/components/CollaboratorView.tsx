import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Appointment, Employee, SPECIAL_NEEDS_OPTIONS } from '../types';

interface CollaboratorViewProps {
  currentUser: Employee;
  employees: Employee[];
  appointments: Appointment[];
  services: any[];
  clients: any[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => Promise<boolean | void> | void;
  onCompleteAppointment: (id: string) => void;
}

export function CollaboratorView({ currentUser, employees, appointments, services, clients, onAddAppointment, onCompleteAppointment }: CollaboratorViewProps) {
  const [activeTab, setActiveTab] = useState<'agenda' | 'nova-reserva' | 'historico'>('agenda');

  const getLocalDateString = (d: Date = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // CALENDARIO 
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());

  // STATUS
  const [clientName, setClientName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [specialNeeds, setSpecialNeeds] = useState<string[]>([]);
  const [observation, setObservation] = useState('');
  
  // Notification States
  const [bookingSuccess, setBookingSuccess] = useState<{name: string, contact: string, date: string, time: string} | null>(null);
  const [showReminders, setShowReminders] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const myAppointments = appointments
    .filter(a => a.assignedEmployeeId === currentUser.id && a.status === 'scheduled')
    .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  const myHistory = appointments
    .filter(a => a.assignedEmployeeId === currentUser.id && a.status === 'completed')
    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()); // Ordenado do mais recente ao mais antigo

  const selectedDayAppointments = myAppointments.filter(a => a.date === selectedDate);

  const handleServiceToggle = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const totalDuration = selectedServices.reduce((acc, service) => {
    const srv = services.find(s => s.nome === service);
    return acc + (srv?.duracao || 0);
  }, 0);

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  };

  const handleNeedToggle = (need: string) => {
    setSpecialNeeds(prev => 
      prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]
    );
  };

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setClientName(val);
    // Auto-fill do telefone se encontrar o cliente na base
    const foundClient = clients?.find(c => c.nome === val);
    if (foundClient && foundClient.telefone) {
      setContact(foundClient.telefone);
    }
  };

  // Função de máscara de telefone
  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 3) return phoneNumber;
    if (phoneNumberLength < 8) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !date || !time || selectedServices.length === 0) return;

    if (date < getLocalDateString()) {
      setErrorMessage('Não é possível realizar agendamentos para datas no passado.');
      return;
    }

    if (time < '09:00' || time > '21:00') {
      setErrorMessage('Os agendamentos devem ser feitos no horário comercial (09:00 às 21:00).');
      return;
    }

    const newStart = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    const newEnd = newStart + totalDuration;

    // Filtra apenas os profissionais que estão LIVRES na data, hora e duração selecionadas
    const availableEmployees = employees.filter(emp => {
      const hasConflict = appointments.some(a => {
        if (a.date !== date || a.assignedEmployeeId !== emp.id || a.status !== 'scheduled' || !a.time) return false;
        const existStart = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
        const existDuration = a.services.reduce((sum, name) => {
          const srv = services.find(s => s.nome === name);
          return sum + (Number(srv?.duracao) || 60);
        }, 0);
        const existEnd = existStart + existDuration;
        return newStart < existEnd && newEnd > existStart;
      });
      return !hasConflict;
    });

    if (availableEmployees.length === 0) {
      setErrorMessage('Não foi possível adicionar a reserva. Tente outro horário em alguns instantes.');
      return;
    }

    // Find best employee based on specialty and current load among available ones
    const appointmentsOnDate = appointments.filter(a => a.date === date && a.status === 'scheduled');
    let assignedEmployeeId = availableEmployees[0].id; // Default to first available
    
      // Simple mapping of keywords to match specialties
      const serviceKeywords: Record<string, string[]> = {
        'Massagem Relaxante': ['massoterapia', 'massagem', 'terapeuta'],
        'Massagem Terapêutica': ['massoterapia', 'massagem', 'terapeuta', 'fisioterapia'],
        'Limpeza de Pele': ['estética', 'esteticista', 'pele'],
        'Drenagem Linfática': ['massoterapia', 'estética', 'drenagem'],
        'Sessão de Yoga': ['yoga', 'meditação', 'holística'],
        'Aromaterapia': ['yoga', 'meditação', 'holística', 'terapia', 'aroma']
      };

      const employeeScores = availableEmployees.map(emp => {
        const empSpecialty = emp.specialty.toLowerCase();
        let specialtyScore = 0;
        
        selectedServices.forEach(service => {
          const keywords = serviceKeywords[service] || [];
          // If the employee's specialty contains any of the keywords for this service
          if (keywords.some(kw => empSpecialty.includes(kw))) {
            specialtyScore += 10; // High weight for matching specialty
          }
        });

        const loadCount = appointmentsOnDate.filter(a => a.assignedEmployeeId === emp.id).length;
        
        return {
          id: emp.id,
          score: specialtyScore - loadCount // Higher score is better (matches specialty, less busy)
        };
      });

      // Sort by score descending (highest score first)
      employeeScores.sort((a, b) => b.score - a.score);
      assignedEmployeeId = employeeScores[0].id;

    const success = await onAddAppointment({
      clientName,
      contact,
      date,
      time,
      guests,
      services: selectedServices,
      specialNeeds,
      observation,
      assignedEmployeeId
    });

    // Só prossegue se o App.tsx retornar sucesso do backend
    if (success !== false) {
      const bookedInfo = { name: clientName, contact, date, time };
      
      setClientName('');
      setContact('');
      setDate('');
      setTime('');
      setGuests(1);
      setSelectedServices([]);
      setSpecialNeeds([]);
      setObservation('');
      setActiveTab('agenda');
      setSelectedDate(date); 
      
      setBookingSuccess(bookedInfo);
      
      setToastMessage('Agendamento feito com sucesso!');
      setTimeout(() => setToastMessage(null), 3000); // Esconde após 3 segundos
    }
  };

  const handleWhatsApp = (contact: string, name: string, date: string, time: string, isReminder = false) => {
    const safeDate = date || '';
    const text = isReminder 
      ? encodeURIComponent(`Olá ${name}, passando para lembrar do seu agendamento no Serenidade Spa amanhã, dia ${safeDate.split('-').reverse().join('/')} às ${time}. Te esperamos!`)
      : encodeURIComponent(`Olá ${name}, confirmamos seu agendamento no Serenidade Spa para o dia ${safeDate.split('-').reverse().join('/')} às ${time}. Estamos ansiosos para recebê-lo(a)!`);
    window.open(`https://wa.me/${contact.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  // Calendar Logic
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const handlePrevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  const formatDayString = (d: number) => {
    const yyyy = year;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Calculate tomorrow's date for reminders
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = getLocalDateString(tomorrow);
  const tomorrowAppointments = myAppointments.filter(a => a.date === tomorrowString);

  return (
    <div className="w-full max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-headline text-primary mb-2">Olá, <span className="italic">{currentUser.name?.split(' ')[0] || 'Colaborador'}</span>.</h1>
          <p className="text-on-surface-variant font-body">Gerencie sua agenda e novos agendamentos.</p>
        </div>
        
        <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/20 overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'agenda' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Minha Agenda
          </button>
          <button 
            onClick={() => setActiveTab('nova-reserva')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'nova-reserva' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Nova Reserva
          </button>
          <button 
            onClick={() => setActiveTab('historico')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'historico' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Histórico
          </button>
        </div>
      </div>

    <datalist id="client-list">
      {clients?.map(c => <option key={c.id} value={c.nome} />)}
    </datalist>

      {activeTab === 'agenda' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          {/* Calendar View */}
          <div className="lg:col-span-5 bg-surface-container-lowest/60 backdrop-blur-xl p-8 rounded-3xl shadow-lg border border-outline-variant/30 h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-headline text-primary capitalize">{monthNames[month]} {year}</h3>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-outline uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square"></div>;
                }
                
                const dateString = formatDayString(day);
                const isSelected = selectedDate === dateString;
                const dayAppointments = myAppointments.filter(a => a.date === dateString);
                const appointmentCount = dayAppointments.length;
                const hasAppointments = appointmentCount > 0;
                const isToday = dateString === getLocalDateString();

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateString)}
                    className={`relative aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all
                      ${isSelected ? 'bg-primary text-on-primary shadow-md' : 
                        hasAppointments ? 'bg-primary/10 text-primary font-bold hover:bg-primary/20' : 
                        'hover:bg-surface-container text-on-surface'}
                      ${isToday && !isSelected ? 'border border-primary text-primary' : ''}
                    `}
                  >
                    <span className={hasAppointments ? '-mt-1' : ''}>{day}</span>
                    {hasAppointments && (
                      <div className="absolute bottom-2 flex gap-0.5">
                        {Array.from({ length: Math.min(appointmentCount, 3) }).map((_, i) => (
                          <span 
                            key={i} 
                            className={`w-1 h-1 rounded-full ${isSelected ? 'bg-on-primary' : 'bg-primary'}`}
                          ></span>
                        ))}
                        {appointmentCount > 3 && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-on-primary' : 'bg-primary'} opacity-50`}></span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Appointments */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-headline text-primary">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">
                  {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? 'Agendamento' : 'Agendamentos'}
                </span>
              </div>
              
              {tomorrowAppointments.length > 0 && (
                <button 
                  onClick={() => setShowReminders(true)}
                  className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-secondary-container/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                  Lembretes de Amanhã ({tomorrowAppointments.length})
                </button>
              )}
            </div>

            {selectedDayAppointments.length === 0 ? (
              <div className="bg-surface-container-lowest/60 backdrop-blur-xl p-12 rounded-3xl text-center shadow-lg border border-outline-variant/30">
                <span className="material-symbols-outlined text-4xl text-outline-variant mb-4">event_available</span>
                <h3 className="text-lg font-headline text-on-surface">Agenda livre</h3>
                <p className="text-on-surface-variant text-sm mt-2">Nenhum agendamento para este dia.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayAppointments.map(app => (
                  <div key={app.id} className="bg-surface-container-lowest/60 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-outline-variant/30 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-headline text-primary">{app.clientName}</h3>
                        <div className="flex items-center gap-2 text-on-surface-variant text-sm mt-1">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span className="font-bold">{app.time}</span>
                        </div>
                      </div>
                      <div className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {app.guests} {app.guests === 1 ? 'Pessoa' : 'Pessoas'}
                      </div>
                    </div>
                    
                    <div className="space-y-4 flex-grow">
                      <div>
                        <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Serviços</p>
                        <div className="flex flex-wrap gap-2">
                          {app.services.map(s => (
                            <span key={s} className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded text-xs">{s}</span>
                          ))}
                        </div>
                      </div>
                      
                      {(app.specialNeeds.length > 0 || app.observation) && (
                        <div>
                          <p className="text-[10px] font-bold text-error uppercase tracking-widest mb-1">Atenção Especial</p>
                          {app.specialNeeds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {app.specialNeeds.map(n => (
                                <span key={n} className="bg-error-container/20 text-error px-2 py-1 rounded text-xs font-medium">{n}</span>
                              ))}
                            </div>
                          )}
                          {app.observation && (
                            <p className="text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 italic">
                              "{app.observation}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-outline-variant/10 flex flex-wrap gap-2">
                      <button 
                        onClick={() => handleWhatsApp(app.contact, app.clientName, app.date, app.time)}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                        Notificar
                      </button>
                      <button 
                        onClick={() => alert('Adicionado à agenda do dispositivo!')}
                        className="flex-1 flex items-center justify-center gap-2 bg-surface-container text-on-surface-variant hover:bg-surface-container-high py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                        Agenda
                      </button>
                      <button 
                        onClick={() => onCompleteAppointment(app.id)}
                        className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary-dim py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Concluir Atendimento
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'nova-reserva' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest/60 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-xl border border-outline-variant/30"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Client Info */}
              <div className="space-y-6">
                <h3 className="text-sm font-headline italic text-primary border-b border-outline-variant/20 pb-2">Dados do Cliente</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Nome Completo</label>
                  <input required list="client-list" type="text" value={clientName} onChange={handleClientNameChange} className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Digite ou selecione..." autoComplete="off" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">WhatsApp / Contato</label>
                  <input required type="tel" value={contact} onChange={e => setContact(formatPhone(e.target.value))} maxLength={15} className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="(00) 00000-0000" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Data</label>
                    <input required type="date" value={date} min={getLocalDateString()} onChange={e => setDate(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Hora</label>
                    <input required type="time" min="09:00" max="21:00" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Número de Pessoas</label>
                  <input required type="number" min="1" max="10" value={guests} onChange={e => setGuests(parseInt(e.target.value))} className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm transition-all" />
                </div>
              </div>

              {/* Services & Needs */}
              <div className="space-y-6">
                <h3 className="text-sm font-headline italic text-primary border-b border-outline-variant/20 pb-2">Detalhes do Atendimento</h3>
                
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase">Serviços Desejados</label>
                    {totalDuration > 0 && (
                      <span className="text-xs font-bold text-primary bg-primary-container/30 px-2 py-1 rounded-md">
                        Tempo estimado: {formatDuration(totalDuration)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {services.map(srv => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => handleServiceToggle(srv.nome)}
                        className={`px-4 py-2 rounded-xl text-xs transition-all border flex flex-col items-start gap-1 ${selectedServices.includes(srv.nome) ? 'bg-primary-container border-primary-container text-on-primary-container font-bold' : 'bg-transparent border-outline-variant/30 text-on-surface-variant hover:border-primary/50'}`}
                      >
                        <span>{srv.nome}</span>
                        <span className={`text-[10px] ${selectedServices.includes(srv.nome) ? 'text-on-primary-container/80' : 'text-outline'}`}>
                          {formatDuration(srv.duracao || 0)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-error tracking-[0.15em] uppercase mb-3">Necessidades Especiais (Opcional)</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {SPECIAL_NEEDS_OPTIONS.map(need => (
                      <button
                        key={need}
                        type="button"
                        onClick={() => handleNeedToggle(need)}
                        className={`px-4 py-2 rounded-xl text-xs transition-all border ${specialNeeds.includes(need) ? 'bg-error-container/20 border-error text-error font-bold' : 'bg-transparent border-outline-variant/30 text-on-surface-variant hover:border-error/50'}`}
                      >
                        {need}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Observações Adicionais</label>
                    <textarea 
                      value={observation} 
                      onChange={e => setObservation(e.target.value)} 
                      className="w-full bg-surface-container-low border-none rounded-xl p-4 focus:ring-1 focus:ring-primary text-sm transition-all resize-none h-24" 
                      placeholder="Ex: Cliente prefere óleo essencial de lavanda, tem alergia a amêndoas..." 
                    />
                  </div>
                </div>
                
                <div className="pt-6">
                  <p className="text-xs text-on-surface-variant italic mb-4">
                    * O sistema atribuirá automaticamente o profissional com maior disponibilidade para este horário.
                  </p>
                  <button type="submit" className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-sm uppercase tracking-[0.2em] shadow-md hover:bg-primary-dim transition-all active:scale-[0.98]">
                    Confirmar Agendamento
                  </button>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === 'historico' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest/60 backdrop-blur-xl p-8 rounded-3xl shadow-lg border border-outline-variant/30"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-headline text-primary">Histórico de Atendimentos</h3>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">
              {myHistory.length} {myHistory.length === 1 ? 'Concluído' : 'Concluídos'}
            </span>
          </div>

          {myHistory.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-4">history</span>
              <h3 className="text-lg font-headline text-on-surface">Nenhum histórico</h3>
              <p className="text-on-surface-variant text-sm mt-2">Você ainda não concluiu nenhum atendimento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-widest">Data/Hora</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-widest">Cliente</th>
                    <th className="pb-4 text-[10px] font-bold text-outline uppercase tracking-widest">Serviços</th>
                  </tr>
                </thead>
                <tbody>
                  {myHistory.map(app => (
                    <tr key={app.id} className="border-b border-outline-variant/10 hover:bg-surface/50 transition-colors">
                      <td className="py-4 text-sm text-on-surface-variant whitespace-nowrap">
                        {app.date?.split('-').reverse().join('/') || ''} <br/> 
                        <span className="font-bold">{app.time}</span>
                      </td>
                      <td className="py-4 text-sm text-on-surface font-medium">{app.clientName}</td>
                      <td className="py-4 text-xs text-on-surface-variant max-w-[200px] truncate">{app.services.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Booking Success Modal */}
      {bookingSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-md w-full border border-outline-variant/30"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">check_circle</span>
              </div>
              <h2 className="text-2xl font-headline text-primary mb-2">Reserva Confirmada!</h2>
              <p className="text-on-surface-variant text-sm">O agendamento de {bookingSuccess.name} foi salvo com sucesso.</p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  handleWhatsApp(bookingSuccess.contact, bookingSuccess.name, bookingSuccess.date, bookingSuccess.time);
                  setBookingSuccess(null);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#20bd5a] transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
                Enviar Confirmação (WhatsApp)
              </button>
              <button 
                onClick={() => setBookingSuccess(null)}
                className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reminders Modal */}
      {showReminders && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-lg w-full border border-outline-variant/30 max-h-[80vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-headline text-primary">Lembretes de Amanhã</h2>
              <button onClick={() => setShowReminders(false)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-4 flex-grow">
              {tomorrowAppointments.map(app => (
                <div key={app.id} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-on-surface">{app.clientName}</h4>
                    <p className="text-xs text-on-surface-variant mt-1">{app.time} • {app.services.join(', ')}</p>
                  </div>
                  <button 
                    onClick={() => handleWhatsApp(app.contact, app.clientName, app.date, app.time, true)}
                    className="flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    Lembrar
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Erro Elegante */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest/90 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-error/30 text-center"
          >
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-error">error</span>
            </div>
            <h2 className="text-2xl font-headline text-error mb-2">Ops! Falha na Reserva</h2>
            <p className="text-on-surface-variant text-sm mb-6">{errorMessage}</p>
            <button 
              onClick={() => setErrorMessage(null)}
              className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors"
            >
              Entendi
            </button>
          </motion.div>
        </div>
      )}

      {/* Notificação Toast */}
      {toastMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-8 right-8 bg-surface-container-highest/90 backdrop-blur-md text-on-surface border border-outline-variant/30 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 z-[100]"
        >
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <p className="text-sm font-bold">{toastMessage}</p>
        </motion.div>
      )}
    </div>
  );
}
