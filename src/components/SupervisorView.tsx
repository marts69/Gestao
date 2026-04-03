import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Appointment, Employee } from '../types';
import { getDuration, getLocalTodayString } from './appointmentUtils';
import { SupervisorEquipeTab } from './SupervisorEquipeTab';
import { UpcomingAppointmentsModal } from './UpcomingAppointmentsModal';
import { BlockModal } from '../BlockModal';
import { BookingModal } from '../BookingModal';
import { EditAppointmentModal } from '../EditAppointmentModal';
import { SCHEDULE_CONFIG } from '../config/scheduleConfig';


const EmployeeScheduleColumn = React.memo(({
  emp,
  receptionDate,
  scheduleSearchTerm,
  appointments,
  services,
  START_HOUR,
  END_HOUR,
  MINUTE_HEIGHT,
  HOUR_HEIGHT,
  isTodayView,
  currentMinute,
  todayStr,
  onGridClick,
  onDeleteBloqueio,
  onCompleteAppointment,
  onEditAppointmentClick,
  onDeleteAppointmentClick,
  setToastMessage
}: any) => {
  // Calculamos os filtros internamente no filho para evitar quebrar a memoização com referências novas de array do pai
  const empAppointments = appointments
    .filter((a: any) => a.date === receptionDate && a.assignedEmployeeId === emp.id)
    .filter((a: any) => scheduleSearchTerm === '' || a.clientName.toLowerCase().includes(scheduleSearchTerm.toLowerCase()) || a.services.some((s: string) => s.toLowerCase().includes(scheduleSearchTerm.toLowerCase())));
  
  const empBlockers = (emp.bloqueios || []).filter((b: any) => b.data === receptionDate);

  return (
    <div onClick={(e) => onGridClick(e, emp.id)} className="flex-1 min-w-[180px] md:min-w-[220px] border-r border-outline-variant/10 relative cursor-pointer hover:bg-primary/5 transition-colors" style={{ height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT }}>
      {/* Rendereização dos Bloqueios */}
      {empBlockers.map((bloq: any) => {
        const [sH, sM] = bloq.horaInicio.split(':').map(Number);
        const [eH, eM] = bloq.horaFim.split(':').map(Number);
        const top = ((sH - START_HOUR) * 60 + sM) * MINUTE_HEIGHT;
        const endTop = ((eH - START_HOUR) * 60 + eM) * MINUTE_HEIGHT;
        const height = Math.max(endTop - top, 20);

        return (
          <div key={bloq.id} className="absolute left-1 right-1 bg-surface-container-high/60 backdrop-blur-sm rounded-lg border border-outline-variant/30 flex items-center justify-center group overflow-hidden" style={{ top, height }}>
            <div className="absolute inset-0 opacity-10 repeating-linear-gradient-45 from-transparent to-on-surface-variant"></div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant z-10 truncate px-2">{bloq.motivo}</span>
            {onDeleteBloqueio && (
              <button onClick={(e) => { e.stopPropagation(); onDeleteBloqueio(bloq.id); }} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-on-surface hover:text-error bg-surface shadow-sm rounded-full z-20 transition-all">
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            )}
          </div>
        );
      })}

      {/* Renderização dos Agendamentos */}
      {empAppointments.map((app: any) => {
        const isCompleted = app.status === 'completed';
        const appDateTime = new Date(`${app.date}T${app.time}:00`);
        const isPastDay = app.date < todayStr;
        const isNoShow = !isCompleted && isPastDay;
        
        const [appH, appM] = app.time.split(':').map(Number);
        const top = ((appH - START_HOUR) * 60 + appM) * MINUTE_HEIGHT;
        
        const durationMins = getDuration(app.services, services);
        const height = Math.max(durationMins * MINUTE_HEIGHT, 30);

        const delayMinutes = (!isCompleted && isTodayView && currentMinute > appDateTime) 
          ? Math.floor((currentMinute.getTime() - appDateTime.getTime()) / 60000) 
          : 0;

        const cardStatusClass = isCompleted 
          ? "bg-surface-container-low/80 border-outline-variant/30 opacity-70" 
          : (isNoShow || delayMinutes > 0) 
            ? "bg-error-container/20 border-error/40 shadow-sm" 
            : "bg-surface-container-lowest border-primary/20 shadow-md";
        const sideColorClass = isCompleted ? "bg-outline-variant/50" : (isNoShow || delayMinutes > 0) ? "bg-error" : "bg-primary";

        return (
          <div key={app.id} className={`absolute left-1 right-1 rounded-xl border ${cardStatusClass} flex flex-col group overflow-hidden transition-all hover:z-20`} style={{ top, height }}>
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${sideColorClass}`}></div>
            <div className="pl-2 pr-1 py-1 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold leading-none ${isCompleted ? 'text-outline-variant line-through' : (isNoShow || delayMinutes > 0) ? 'text-error' : 'text-primary'}`}>{app.time}</span>
                
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-lowest/90 rounded-full shadow-sm p-0.5 border border-outline-variant/20 absolute right-1 top-1 z-30">
                  {!isCompleted && (
                    <button onClick={(e) => { e.stopPropagation(); onCompleteAppointment(app.id); setToastMessage('Ok!'); setTimeout(() => setToastMessage(null), 2000); }} className="text-on-surface-variant hover:text-primary p-1 rounded-full"><span className="material-symbols-outlined text-[14px]">check_circle</span></button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onEditAppointmentClick(app); }} className="text-on-surface-variant hover:text-primary p-1 rounded-full"><span className="material-symbols-outlined text-[14px]">edit</span></button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteAppointmentClick(app.id); }} className="text-on-surface-variant hover:text-error p-1 rounded-full"><span className="material-symbols-outlined text-[14px]">cancel</span></button>
                </div>
              </div>
              
              <h5 className="font-bold text-on-surface text-[11px] leading-tight truncate mt-0.5" title={app.clientName}>{app.clientName}</h5>
              
              {height > 40 && (
                <p className="text-[9px] text-on-surface-variant leading-tight line-clamp-2 mt-0.5" title={app.services.join(', ')}>{app.services.join(', ')}</p>
              )}

              {height > 60 && app.observation && (
                <p className="text-[8px] text-on-surface-variant my-1 italic border-l-2 border-outline-variant/30 pl-1.5 line-clamp-1">{app.observation}</p>
              )}

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

interface SupervisorViewProps {
  employees: Employee[];
  appointments: Appointment[];
  services: any[];
  clients: any[];
  onReassign: (appointmentId: string, newEmployeeId: string) => void;
  onAddEmployee: (employee: Omit<Employee, 'id' | 'rating' | 'completedServices'>) => Promise<boolean | string | void> | void;
  onDeleteEmployee: (id: string, reallocateToId?: string) => void;
  onEditEmployee: (id: string, employee: Partial<Employee>) => Promise<boolean | string | void> | void;
  onAddService: (service: any) => Promise<boolean>;
  onEditService: (id: string, service: any) => Promise<boolean>;
  onDeleteService: (id: string) => void;
  onAddAppointment: (appointment: any) => Promise<boolean | void> | void;
  isAddingAppointment?: boolean;
  onDeleteAppointment: (id: string) => Promise<boolean | void> | void;
  onEditAppointment: (id: string, appointment: any) => Promise<boolean | void> | void;
  onCompleteAppointment: (id: string) => void;
  onEditClient?: (id: string, clientData: any) => Promise<boolean | void> | void;
  onDeleteClient?: (id: string) => Promise<boolean | void> | void;
  onAddBloqueio?: (b: any) => Promise<boolean>;
  onDeleteBloqueio?: (id: string) => Promise<boolean>;
}

export function SupervisorView({ employees, appointments, services, clients, onReassign, onAddEmployee, onDeleteEmployee, onEditEmployee, onAddService, onEditService, onDeleteService, onAddAppointment, isAddingAppointment, onDeleteAppointment, onEditAppointment, onCompleteAppointment, onEditClient, onAddBloqueio, onDeleteBloqueio }: SupervisorViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'escala' | 'equipe' | 'servicos'>('dashboard');
  const [showUpcomingAppointments, setShowUpcomingAppointments] = useState(false);
  
  // Recepção/Escala State
  const [receptionDate, setReceptionDate] = useState(getLocalTodayString());
  const [scheduleSearchTerm, setScheduleSearchTerm] = useState('');
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showNewBlockModal, setShowNewBlockModal] = useState(false);
  const [bookTime, setBookTime] = useState('');
  const [bookEmp, setBookEmp] = useState('');

  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  const scrollToCurrentTime = () => {
    if (bodyScrollRef.current) {
      const now = new Date();
      const currentMinuteTop = ((now.getHours() - SCHEDULE_CONFIG.START_HOUR) * 60 + now.getMinutes()) * SCHEDULE_CONFIG.MINUTE_HEIGHT;
      bodyScrollRef.current.scrollTo({ top: Math.max(0, currentMinuteTop - 100), behavior: 'smooth' });
    }
  };

  // useEffect removido para evitar pular automaticamente ao abrir a tela

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>, empId: string) => {
    if (e.target !== e.currentTarget) return; // ignore clicks on events
    const columnRect = e.currentTarget.getBoundingClientRect();
    const scrollTop = bodyScrollRef.current?.scrollTop || 0;
    const clickY = e.clientY - columnRect.top + scrollTop;
    const totalMinutes = clickY / SCHEDULE_CONFIG.MINUTE_HEIGHT;
    const hours = Math.floor(totalMinutes / 60) + SCHEDULE_CONFIG.START_HOUR;
    const minutes = Math.floor(totalMinutes % 60);
    const roundedMinutes = Math.round(minutes / 15) * 15;
    let finalHours = hours;
    let finalMins = roundedMinutes;
    if (finalMins === 60) { finalHours += 1; finalMins = 0; }
    if (finalHours < SCHEDULE_CONFIG.START_HOUR) {
      finalHours = SCHEDULE_CONFIG.START_HOUR;
      finalMins = 0;
    }
    if (finalHours > SCHEDULE_CONFIG.END_HOUR || (finalHours === SCHEDULE_CONFIG.END_HOUR && finalMins > 0)) {
      finalHours = SCHEDULE_CONFIG.END_HOUR;
      finalMins = 0;
    }
    const formattedTime = `${finalHours.toString().padStart(2, '0')}:${finalMins.toString().padStart(2, '0')}`;
    setBookTime(formattedTime);
    setBookEmp(empId);
    setShowNewBookingModal(true);
  }, []);

  const handleEditAppointmentClick = useCallback((app: Appointment) => {
    setEditingAppointmentId(app.id);
  }, []);

  const handleDeleteAppointmentClick = useCallback((id: string) => {
    setAppointmentToDelete(id);
  }, []);

  // New Employee Form
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpSpecialty, setNewEmpSpecialty] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'supervisor' | 'collaborator'>('collaborator');
  const [newEmpDiasTrabalho, setNewEmpDiasTrabalho] = useState<string[]>(['1','2','3','4','5','6']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para exibir as credenciais de acesso após a criação do usuário
  const [createdEmployeeInfo, setCreatedEmployeeInfo] = useState<{name: string, email: string, role: string} | null>(null);

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  // Estado para controlar o Modal de Exclusão
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [reallocateToId, setReallocateToId] = useState<string>('');
  // Estado para controlar o Modal de Detalhes do Colaborador
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  // Estado para controlar o Modal de Exclusão de Agendamento
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  // Estado para controlar o Modal de Exclusão de Serviço
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  
  // Estado para controlar a edição de Agendamento
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);

  // Estado para controlar o filtro do histórico no modal
  const [historyFilter, setHistoryFilter] = useState<'all' | '7days' | 'month'>('all');
  
  // Estado para o filtro de Faturamento
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'month'>('all');
  
  // New Service Form
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const SERVICE_ICONS = ['self_improvement', 'waves', 'face', 'water_drop', 'spa'];
  const [newServiceIcon, setNewServiceIcon] = useState(SERVICE_ICONS[0]);
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');

  // Estado para controlar o Toast de sucesso
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado da Paginação de Colaboradores
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const EMPLOYEES_PER_PAGE = 6; // Quantidade de cartões por página

  // Calendar Logic for Escala
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

  // NOVO: Controle de Atrasos e Auto-Exclusão
  const [currentMinute, setCurrentMinute] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentMinute(new Date()), 60000); // Atualiza a cada 1 min
    return () => clearInterval(interval);
  }, []);

  // Função para formatar minutos em texto legível (ex: 1h 30m)
  const formatDuration = (minutes: number) => {
    if (!minutes) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpSpecialty) return;
    
    setIsSubmitting(true);
    let success;

    if (editingEmployeeId) {
      success = await onEditEmployee(editingEmployeeId, {
        name: newEmpName,
        email: newEmpEmail,
        specialty: newEmpSpecialty,
        role: newEmpRole,
        diasTrabalho: newEmpDiasTrabalho.join(',')
      });

      if (typeof success === 'string') {
        setErrorMessage(success);
        success = false;
      } else if (success !== false) {
        setToastMessage('Colaborador atualizado com sucesso!');
      }
    } else {
      // Gera o e-mail automaticamente: remove acentos, espaços duplos e joga para minúsculo
      const generatedEmail = newEmpName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.') + '@serenidade.com';
      
      success = await onAddEmployee({
        name: newEmpName,
        email: generatedEmail,
        role: newEmpRole,
        specialty: newEmpSpecialty,
        diasTrabalho: newEmpDiasTrabalho.join(','),
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${newEmpName}`
      });
      
      if (typeof success === 'string') {
        setErrorMessage(success);
        success = false; // Força a não resetar o formulário
      } else if (success !== false) {
        setToastMessage('Colaborador adicionado com sucesso!');
        setCreatedEmployeeInfo({ name: newEmpName, email: generatedEmail, role: newEmpRole });
      }
    }
    
    setIsSubmitting(false);
    
    // Limpa o formulário apenas se a requisição for bem sucedida
    if (success !== false) {
      cancelEdit();
      setTimeout(() => setToastMessage(null), 3000); // Esconde após 3 segundos
    }
  };

  const cancelEdit = () => {
    setEditingEmployeeId(null);
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpSpecialty('');
    setNewEmpRole('collaborator');
    setNewEmpDiasTrabalho(['1','2','3','4','5','6']);
  };

  // Calculate max services for progress bar scaling
  const maxServices = Math.max(...employees.map(e => e.completedServices), 1);

  // Lógica de filtro para o histórico do colaborador no Modal
  const filteredHistory = viewingEmployee ? appointments.filter(a => {
    if (a.assignedEmployeeId !== viewingEmployee.id) return false;
    if (historyFilter === 'all') return true;
    
    const appDate = new Date(`${a.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (historyFilter === '7days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return appDate >= sevenDaysAgo && appDate <= today;
    }
    
    if (historyFilter === 'month') {
      return appDate.getMonth() === today.getMonth() && appDate.getFullYear() === today.getFullYear();
    }
    
    return true;
  }).sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()) : [];

  // Função de criar serviço
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let success;
    if (editingServiceId) {
      success = await onEditService(editingServiceId, { nome: newServiceName, preco: newServicePrice, duracao: newServiceDuration, icone: newServiceIcon, descricao: newServiceDescription });
      if (success) setToastMessage('Serviço atualizado com sucesso!');
    } else {
      success = await onAddService({ nome: newServiceName, preco: newServicePrice, duracao: newServiceDuration, icone: newServiceIcon, descricao: newServiceDescription });
      if (success) setToastMessage('Serviço adicionado ao menu!');
    }
    
    if (success) {
      cancelServiceEdit();
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const cancelServiceEdit = () => {
    setEditingServiceId(null);
    setNewServiceName(''); setNewServicePrice(''); setNewServiceDuration('60'); setNewServiceIcon(SERVICE_ICONS[0]); setNewServiceDescription('');
  };

  const editingApp = appointments.find((a) => a.id === editingAppointmentId) || null;

  const todayStr = getLocalTodayString();
  const upcomingClients = appointments
    .filter(a => a.date === todayStr && a.status === 'scheduled')
    .sort((a, b) => a.time.localeCompare(b.time));

  // Refatoração c/ useMemo: Otimiza e cruza as Lógicas Pesadas
  const { topEmployee, monthlyNoShows, totalRevenue, last7DaysData } = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const todayStrLocal = getLocalTodayString();
    
    // Estatísticas do Mês
    let top: any = null;
    const monthlyCompleted = appointments.filter(a => {
      if (a.status !== 'completed') return false;
      const d = new Date(`${a.date}T12:00:00`);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    employees.forEach(emp => {
      const count = monthlyCompleted.filter(a => a.assignedEmployeeId === emp.id).length;
      if (count > 0 && (!top || count > top.monthlyCount)) top = { ...emp, monthlyCount: count };
    });

    const noShows = appointments.filter(a => a.status === 'scheduled' && a.date < todayStrLocal && new Date(`${a.date}T12:00:00`).getMonth() === currentMonth).length;

    // Faturamento Total Filtrado
    const revenue = appointments.filter(a => a.status === 'completed' && (revenueFilter === 'all' || new Date(`${a.date}T12:00:00`).getMonth() === currentMonth)).reduce((acc, app) => acc + app.services.reduce((s, sName) => s + (Number(services.find(srv => srv.nome === sName)?.preco) || 0), 0), 0);

    // Dados do Gráfico de Faturamento Diário (Últimos 7 dias)
    const chartDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayRevenue = appointments.filter(a => a.date === dateStr && a.status === 'completed').reduce((acc, app) => acc + app.services.reduce((s, sName) => s + (Number(services.find(srv => srv.nome === sName)?.preco) || 0), 0), 0);
      chartDays.push({ dateStr, label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), revenue: dayRevenue });
    }
    const maxRev = Math.max(...chartDays.map(d => d.revenue), 1);

    return { topEmployee: top, monthlyNoShows: noShows, totalRevenue: revenue, last7DaysData: { days: chartDays, maxRev } };
  }, [appointments, services, employees, revenueFilter]);

  const { viewingEmployeeRevenue, viewingEmployeeNoShows } = useMemo(() => {
    if (!viewingEmployee) return { viewingEmployeeRevenue: 0, viewingEmployeeNoShows: 0 };
    const revenue = appointments.filter(a => a.assignedEmployeeId === viewingEmployee.id && a.status === 'completed').reduce((acc, app) => acc + app.services.reduce((s, sName) => s + (Number(services.find(srv => srv.nome === sName)?.preco) || 0), 0), 0);
    const noShows = appointments.filter(a => a.assignedEmployeeId === viewingEmployee.id && a.status === 'scheduled' && a.date < todayStr).length;
    return { viewingEmployeeRevenue: revenue, viewingEmployeeNoShows: noShows };
  }, [viewingEmployee, appointments, services]);

  return (
    <div className="w-full max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-headline text-primary mb-2">Visão da <span className="italic">Supervisão</span>.</h1>
          <p className="text-on-surface-variant font-body">Acompanhe métricas, gerencie escalas e a equipe.</p>
        </div>
        
        <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/20 overflow-x-auto max-w-full w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('escala')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'escala' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Gestão de Escala
          </button>
          <button 
            onClick={() => setActiveTab('equipe')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'equipe' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Equipe
          </button>
          <button 
            onClick={() => setActiveTab('servicos')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'servicos' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Serviços
          </button>
          <button 
            onClick={() => setShowUpcomingAppointments(true)}
            className="px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all bg-secondary-container text-on-secondary-container hover:bg-secondary/20 shadow-sm flex items-center gap-2 ml-2"
          >
            <span className="material-symbols-outlined text-[16px]">event_note</span>
            Próximos
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Total de Atendimentos</p>
              <p className="text-4xl font-headline text-primary">{appointments.filter(a => a.status === 'completed').length}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-center overflow-hidden">
              <div className="flex justify-between items-center mb-2 gap-2">
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Faturamento</p>
                <select 
                  value={revenueFilter}
                  onChange={(e) => setRevenueFilter(e.target.value as 'all' | 'month')}
                  className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-[9px] uppercase tracking-widest font-bold rounded px-1.5 py-0.5 border-none outline-none cursor-pointer shrink-0"
                >
                  <option value="all">Total</option>
                  <option value="month">Este Mês</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-1 w-full">
                <p className="text-3xl font-headline text-primary font-bold truncate flex-1" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </p>
              <span className="material-symbols-outlined text-primary text-2xl shrink-0 opacity-80 hidden sm:block">payments</span>
            </div>
          </div>
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Agendamentos Pendentes</p>
              <p className="text-4xl font-headline text-primary">{appointments.filter(a => a.status === 'scheduled').length}</p>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Média da Equipe</p>
              <div className="flex items-center gap-2">
                <p className="text-4xl font-headline text-primary">
                  {employees.length > 0 ? (employees.reduce((acc, emp) => acc + emp.rating, 0) / employees.length).toFixed(1) : '0.0'}
                </p>
                <span className="material-symbols-outlined text-primary star-active text-2xl">star</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Destaque do Mês</p>
              {topEmployee ? (
                <div className="flex items-center gap-3 mt-1">
                  <img src={topEmployee.avatar} alt={topEmployee.name} className="w-10 h-10 rounded-full object-cover border border-primary/20" />
                  <div>
                  <p className="text-sm font-bold text-primary leading-tight">{topEmployee.name?.split(' ')[0] || 'Desconhecido'}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">{topEmployee.monthlyCount} concluídos</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant italic mt-1">Sem dados no mês</p>
              )}
            </div>
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Faltas no Mês</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-4xl font-headline text-error">{monthlyNoShows}</p>
                <span className="material-symbols-outlined text-error text-2xl">event_busy</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
             <div className="lg:col-span-2 flex flex-col gap-8">
               {/* Gráfico de Faturamento Widget */}
               <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
                  <div className="flex justify-between items-end mb-6 border-b border-outline-variant/20 pb-4">
                    <h3 className="text-lg font-headline text-primary">Faturamento Diário</h3>
                    <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Últimos 7 dias</span>
                  </div>
                  <div className="flex items-end justify-between h-48 gap-2">
                    {last7DaysData.days.map((day) => (
                      <div key={day.dateStr} className="flex flex-col items-center flex-1 group">
                        <div className="w-full flex justify-center items-end h-36 bg-surface-container-low/50 rounded-t-lg relative">
                          <div 
                            className="w-full bg-primary/80 hover:bg-primary transition-all rounded-t-lg relative"
                            style={{ height: `${(day.revenue / last7DaysData.maxRev) * 100}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-md">
                              R$ {day.revenue.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant uppercase mt-2 font-medium">{day.label}</span>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Produtividade Widget */}
               <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm h-fit">
                  <h3 className="text-lg font-headline text-primary mb-8 border-b border-outline-variant/20 pb-4">Produtividade da Equipe</h3>
                <div className="space-y-8">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex flex-col xl:flex-row xl:items-center gap-4">
                      <div className="flex items-center gap-4 w-full xl:w-1/2">
                        <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover border border-outline-variant/30" />
                        <div>
                          <p className="text-sm font-bold text-on-surface">{emp.name}</p>
                        </div>
                      </div>
                      <div className="flex-grow w-full">
                        <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                          <span>{emp.completedServices} serviços</span>
                        </div>
                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${(emp.completedServices / maxServices) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
               </div>
             </div>

             {/* Próximos Clientes Widget */}
             <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm h-fit">
                <div className="flex justify-between items-end mb-6 border-b border-outline-variant/20 pb-4">
                  <h3 className="text-lg font-headline text-primary">Próximos Clientes</h3>
                  <span className="text-[10px] font-bold text-primary bg-primary-container px-2 py-1 rounded-md uppercase tracking-widest">Hoje</span>
                </div>
                <div className="space-y-4">
                  {upcomingClients.length === 0 ? (
                    <p className="text-sm text-on-surface-variant text-center py-6">Nenhum cliente agendado para hoje.</p>
                  ) : upcomingClients.map(app => (
                    <div key={app.id} className="flex justify-between items-center p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                      <div>
                        <h4 className="font-bold text-on-surface">{app.clientName}</h4>
                        <p className="text-xs text-on-surface-variant mt-1">{app.services.join(', ')}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-headline text-primary font-bold">{app.time}</span>
                        <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">{employees.find(e => e.id === app.assignedEmployeeId)?.name?.split(' ')[0] || 'Não atribuído'}</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'escala' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row gap-6">
          {/* Esquerda: Mini Calendário (Google Calendar Style) */}
          <div className="w-full lg:w-80 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm h-fit shrink-0">
            <div className="flex justify-between items-center mb-6">
               <button onClick={handlePrevMonth} className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
               <h3 className="text-sm font-bold text-primary uppercase tracking-widest">{monthNames[month]} {year}</h3>
               <button onClick={handleNextMonth} className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
               {dayNames.map(day => (
                 <span key={day} className="text-[10px] font-bold text-outline uppercase">{day}</span>
               ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
               {calendarDays.map((d, i) => {
                 if (!d) return <div key={`empty-${i}`} className="h-8"></div>;
                 const dStr = formatDayString(d);
                 const isSelected = receptionDate === dStr;
                 const isToday = dStr === todayStr;
                 return (
                   <button 
                     key={`day-${d}`} 
                     onClick={() => setReceptionDate(dStr)}
                     className={`h-8 w-8 mx-auto rounded-full text-xs font-medium flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-on-primary shadow-md' : isToday ? 'border border-primary text-primary' : 'text-on-surface hover:bg-surface-container'}`}
                   >
                     {d}
                   </button>
                 );
               })}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button 
                onClick={() => setShowNewBookingModal(true)}
                className="w-full bg-primary text-on-primary py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm hover:bg-primary-dim flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nova Reserva
              </button>
              <button 
                onClick={() => setShowNewBlockModal(true)}
                className="w-full bg-error text-onError py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm hover:bg-error/90 text-white flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">block</span>
                Novo Bloqueio
              </button>
            </div>
          </div>

          {/* Direita: Escala Vertical dos Profissionais */}
          <div className="flex-1 bg-surface-container-lowest p-4 md:p-6 lg:p-8 rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col">
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

            {(() => {
              const START_HOUR = SCHEDULE_CONFIG.START_HOUR;
              const END_HOUR = SCHEDULE_CONFIG.END_HOUR;
              const HOUR_HEIGHT = SCHEDULE_CONFIG.HOUR_HEIGHT;
              const MINUTE_HEIGHT = SCHEDULE_CONFIG.MINUTE_HEIGHT;
              const CURRENT_TIME_LINE = SCHEDULE_CONFIG.CURRENT_TIME_LINE;
              const timelineHours = Array.from({length: END_HOUR - START_HOUR + 1}, (_, i) => START_HOUR + i);
              
              const currentViewDateObj = new Date(`${receptionDate}T12:00:00`);
              const dayOfWeek = currentViewDateObj.getDay();
              
              // Oculta admin (se vier) e filtra quem não trabalha no dia
              const activeEmployees = employees.filter(emp => {
                if (emp.id === 'admin') return false;
                if (!emp.diasTrabalho) return true;
                return emp.diasTrabalho.split(',').includes(String(dayOfWeek));
              });

              const isTodayView = receptionDate === todayStr;
              const currentMinuteTop = isTodayView ? ((currentMinute.getHours() - START_HOUR) * 60 + currentMinute.getMinutes()) * MINUTE_HEIGHT : -100;

              return (
                <div className="flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl overflow-hidden flex flex-col relative shadow-sm h-full group">
                  <button onClick={() => scrollHorizontally('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-surface shadow-md rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-surface-container border border-outline-variant/20 text-on-surface"><span className="material-symbols-outlined">chevron_left</span></button>
                  <button onClick={() => scrollHorizontally('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-surface shadow-md rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-surface-container border border-outline-variant/20 text-on-surface"><span className="material-symbols-outlined">chevron_right</span></button>
                  <button onClick={scrollToCurrentTime} className="absolute bottom-4 right-4 z-30 bg-primary-container text-on-primary-container px-4 py-2 rounded-full shadow-md font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"><span className="material-symbols-outlined text-[16px]">my_location</span> Agora</button>

                  {/* Cabeçalho Fixo (Info dos Profissionais) */}
                  <div className="flex border-b border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur z-20">
                    <div className="w-12 md:w-14 shrink-0 border-r border-outline-variant/10"></div>
                    <div className="flex flex-1 overflow-x-hidden" ref={headerScrollRef}>
                      {activeEmployees.map(emp => (
                        <div key={emp.id} className="flex-1 min-w-[180px] md:min-w-[220px] p-2 text-center border-r border-outline-variant/10">
                          <img src={emp.avatar} alt={emp.name} className="w-9 h-9 mx-auto rounded-full border-2 border-surface-container shadow-sm object-cover" />
                          <h4 className="font-bold text-on-surface text-xs mt-1 truncate">{emp.name.split(' ')[0]}</h4>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-widest truncate">{emp.specialty}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Área Deslizante da Timeline */}
                  <div 
                    className="flex flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar" 
                    ref={bodyScrollRef}
                    onScroll={(e) => {
                      if (headerScrollRef.current) {
                        headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                      }
                    }}
                  >
                    {/* Coluna Fixa das Horas (Sticky lateral) */}
                    <div className="w-12 md:w-14 shrink-0 bg-surface-container-lowest/95 backdrop-blur border-r border-outline-variant/20 sticky left-0 z-20 flex flex-col">
                      {timelineHours.map(hour => (
                        <div key={hour} className="relative w-full" style={{ height: HOUR_HEIGHT }}>
                          <span className="absolute top-1 right-2 text-[10px] font-bold text-on-surface-variant bg-surface-container-lowest px-1 leading-none">
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Malha de Fundo (Linhas horizontais) */}
                    <div className="absolute inset-0 flex flex-col pointer-events-none z-0 min-w-max">
                      {timelineHours.map(hour => (
                        <div key={hour} className="w-full border-b border-outline-variant/10" style={{ height: HOUR_HEIGHT }}></div>
                      ))}
                    </div>

                    {/* Linha Vermelha de Tempo Real */}
                    {isTodayView && currentMinuteTop >= 0 && currentMinuteTop <= ((END_HOUR - START_HOUR) * HOUR_HEIGHT) && (
                      <div className={CURRENT_TIME_LINE.CONTAINER_CLASS} style={{ top: currentMinuteTop }}>
                        <div className={CURRENT_TIME_LINE.DOT_CLASS}></div>
                        <div className={CURRENT_TIME_LINE.BAR_CLASS}></div>
                      </div>
                    )}

                    {/* Colunas Relativas Clicáveis dos Profissionais */}
                    <div className="relative flex flex-1 z-10 min-w-max">
                      {activeEmployees.map(emp => (
                        <EmployeeScheduleColumn
                          key={emp.id}
                          emp={emp}
                          receptionDate={receptionDate}
                          scheduleSearchTerm={scheduleSearchTerm}
                          appointments={appointments}
                          services={services}
                          START_HOUR={START_HOUR}
                          END_HOUR={END_HOUR}
                          MINUTE_HEIGHT={MINUTE_HEIGHT}
                          HOUR_HEIGHT={HOUR_HEIGHT}
                          isTodayView={isTodayView}
                          currentMinute={currentMinute}
                          todayStr={todayStr}
                          onGridClick={handleGridClick}
                          onDeleteBloqueio={onDeleteBloqueio}
                          onCompleteAppointment={onCompleteAppointment}
                          onEditAppointmentClick={handleEditAppointmentClick}
                          onDeleteAppointmentClick={handleDeleteAppointmentClick}
                          setToastMessage={setToastMessage}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      {activeTab === 'equipe' && (
        <SupervisorEquipeTab
          employees={employees}
          onAddEmployee={onAddEmployee}
          onDeleteEmployee={onDeleteEmployee}
          onEditEmployee={onEditEmployee}
          setToastMessage={setToastMessage}
          setErrorMessage={setErrorMessage}
        />
      )}

      {/* NOVA ABA: MENU DE SERVIÇOS (Inspirada no HTML enviado) */}
      {activeTab === 'servicos' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-7 space-y-6">
            <div className="flex justify-between items-end mb-4 border-b border-outline-variant/20 pb-4">
              <div>
                <h3 className="text-2xl font-headline text-primary">Menu de Serviços</h3>
                <p className="text-sm text-on-surface-variant">Gerencie tratamentos, durações e valores.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {services.map((srv, i) => {
                return (
                  <div key={srv.id} className="bg-surface-container-lowest p-5 rounded-3xl flex flex-col gap-4 transition-all hover:bg-surface-container-low group relative overflow-hidden border border-outline-variant/10 shadow-sm">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/80"></div>
                    <div className="flex items-center gap-4 pl-2 min-w-0">
                      <div className="w-12 h-12 bg-primary-container/20 rounded-full flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined">{srv.icone || 'spa'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-headline text-lg text-on-surface truncate">{srv.nome}</h4>
                        <div className="flex flex-wrap gap-4 mt-1 text-sm text-on-surface-variant">
                          <span className="flex items-center gap-1 shrink-0"><span className="material-symbols-outlined text-[14px]">schedule</span> {formatDuration(Number(srv.duracao || 60))}</span>
                          <span className="flex items-center gap-1 shrink-0"><span className="material-symbols-outlined text-[14px]">payments</span> R$ {Number(srv.preco).toFixed(2)}</span>
                        </div>
                        {srv.descricao && (
                          <p className="text-xs text-on-surface-variant mt-2 line-clamp-2 italic">
                            {srv.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end border-t border-outline-variant/10 pt-3 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        setEditingServiceId(srv.id);
                        setNewServiceName(srv.nome);
                        setNewServicePrice(String(srv.preco));
                        setNewServiceDuration(String(srv.duracao || 60));
                        setNewServiceIcon(srv.icone || SERVICE_ICONS[0]);
                        setNewServiceDescription(srv.descricao || '');
                      }} className="p-2 text-on-surface-variant hover:bg-primary-container/20 hover:text-primary rounded-full transition-colors"><span className="material-symbols-outlined text-[22px]">edit</span></button>
                      <button onClick={() => setServiceToDelete(srv.id)} className="p-2 text-on-surface-variant hover:bg-error-container/20 hover:text-error rounded-full transition-colors"><span className="material-symbols-outlined text-[22px]">delete</span></button>
                    </div>
                  </div>
                );
              })}
          {services.filter(s => s.nome.toLowerCase().includes(serviceSearchTerm.toLowerCase())).length === 0 && <p className="text-center py-8 text-on-surface-variant">Nenhum serviço encontrado.</p>}
            </div>
          </div>

          <div className="xl:col-span-5 bg-surface-container-low p-8 rounded-3xl border border-outline-variant/20 h-fit sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-headline text-primary flex items-center gap-2"><span className="material-symbols-outlined">{editingServiceId ? 'edit' : 'add_circle'}</span> {editingServiceId ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h3>
              {editingServiceId && <button onClick={cancelServiceEdit} className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Cancelar</button>}
            </div>
            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Ícone de Identificação</label>
                <div className="flex gap-2 mb-4">
                  {SERVICE_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setNewServiceIcon(icon)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${newServiceIcon === icon ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20 hover:border-primary/50'}`}>
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Nome do Tratamento</label>
                <input required type="text" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Ex: Massagem com Pedras" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Preço (R$)</label>
                  <input required type="number" step="0.01" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Ex: 150.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Duração (Min)</label>
                  <input required type="number" value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Ex: 60" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Detalhes / Produtos Utilizados (Opcional)</label>
                <textarea value={newServiceDescription} onChange={e => setNewServiceDescription(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all resize-none min-h-[80px]" placeholder="Ex: Utiliza óleos essenciais relaxantes, pedras aquecidas e toalhas quentes..." />
              </div>
              <button type="submit" className="w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all active:scale-[0.98]">{editingServiceId ? 'Salvar Alterações' : 'Salvar Serviço'}</button>
            </form>
          </div>
        </motion.div>
      )}

        {/* Modal de Nova Reserva Rápida (Recepção) */}
        {showNewBookingModal && (
          <BookingModal
            receptionDate={receptionDate}
            initialTime={bookTime || '09:00'}
            initialEmpId={bookEmp || ''}
            clients={clients}
            services={services}
            employees={employees}
            appointments={appointments}
            isAddingAppointment={isAddingAppointment}
            onClose={() => setShowNewBookingModal(false)}
            onAddAppointment={onAddAppointment}
            onEditClient={onEditClient}
            setErrorMessage={setErrorMessage}
            setToastMessage={setToastMessage}
          />
        )}

        {/* Modal de Próximos Agendamentos */}
      <UpcomingAppointmentsModal
        open={showUpcomingAppointments}
        appointments={appointments}
        employees={employees}
        services={services}
        onClose={() => setShowUpcomingAppointments(false)}
      />

      {/* Modal Independente de Bloqueio - Using BlockModal Component */}
        {showNewBlockModal && (
          <BlockModal
            receptionDate={receptionDate}
            initialTime={bookTime || '09:00'}
            initialEmpId={bookEmp || ''}
            employees={employees}
            appointments={appointments}
            onClose={() => setShowNewBlockModal(false)}
            onAddBloqueio={onAddBloqueio}
            onReassignAppointment={onReassign}
            setErrorMessage={setErrorMessage}
            setToastMessage={setToastMessage}
          />
        )}

        {/* Modal de Edição de Agendamento */}
        {editingApp && (
          <EditAppointmentModal
            appointment={editingApp}
            employees={employees}
            services={services}
            appointments={appointments}
            onClose={() => setEditingAppointmentId(null)}
            onEditAppointment={onEditAppointment}
            setErrorMessage={setErrorMessage}
            setToastMessage={setToastMessage}
          />
        )}

        {/* Modal de Confirmação de Exclusão */}
        {employeeToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-md w-full border border-outline-variant/20"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-error">warning</span>
                </div>
                <h2 className="text-2xl font-headline text-error mb-2">Excluir Profissional?</h2>
                <p className="text-on-surface-variant text-sm mb-4">
                  O que deseja fazer com os agendamentos pendentes vinculados a este profissional?
                </p>
                <select 
                  value={reallocateToId} 
                  onChange={(e) => setReallocateToId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
                >
                  <option value="">Excluir todos os agendamentos dele</option>
                  {employees.filter(e => e.id !== employeeToDelete).map(e => (
                    <option key={e.id} value={e.id}>Realocar para: {e.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => { setEmployeeToDelete(null); setReallocateToId(''); }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onDeleteEmployee(employeeToDelete, reallocateToId || undefined);
                    setEmployeeToDelete(null);
                    setReallocateToId('');
                    setToastMessage('Ação concluída com sucesso.');
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-error text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-error/90 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Confirmação de Cancelamento de Agendamento */}
        {appointmentToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-md w-full border border-outline-variant/20"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-error">event_busy</span>
                </div>
                <h2 className="text-2xl font-headline text-error mb-2">Cancelar Agendamento?</h2>
                <p className="text-on-surface-variant text-sm">
                  Tem certeza que deseja cancelar este agendamento? Esta ação removerá a reserva da escala e não pode ser desfeita.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setAppointmentToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Voltar
                </button>
                <button 
                  onClick={async () => {
                    const success = await onDeleteAppointment(appointmentToDelete);
                    if (success !== false) {
                      setToastMessage('Agendamento cancelado com sucesso!');
                      setTimeout(() => setToastMessage(null), 3000);
                    }
                    setAppointmentToDelete(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-error text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-error/90 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Serviço */}
        {serviceToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-md w-full border border-outline-variant/20"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-error">warning</span>
                </div>
                <h2 className="text-2xl font-headline text-error mb-2">Excluir Serviço?</h2>
                <p className="text-on-surface-variant text-sm">
                  Tem certeza que deseja excluir este serviço do menu? Ele não estará mais disponível para novos agendamentos. Esta ação não pode ser desfeita.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setServiceToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-on-surface-variant hover:bg-surface-container transition-colors">
                  Cancelar
                </button>
                <button onClick={() => {
                    onDeleteService(serviceToDelete);
                    setServiceToDelete(null);
                    setToastMessage('Serviço excluído com sucesso!');
                    setTimeout(() => setToastMessage(null), 3000);
                  }} className="flex-1 flex items-center justify-center gap-2 bg-error text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-error/90 transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Detalhes e Histórico do Colaborador */}
        {viewingEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-3xl w-full border border-outline-variant/20 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-start mb-8 border-b border-outline-variant/20 pb-6">
                <div className="flex items-center gap-4">
                  <img src={viewingEmployee.avatar} alt={viewingEmployee.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
                  <div>
                    <h2 className="text-xl font-headline text-primary mb-1">{viewingEmployee.name}</h2>
                    <p className="text-xs text-on-surface-variant">{viewingEmployee.specialty} • {viewingEmployee.email}</p>
                  </div>
                </div>
                <button onClick={() => setViewingEmployee(null)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                   <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Serviços Concluídos</p>
                   <p className="text-2xl font-headline text-primary">{viewingEmployee.completedServices}</p>
                 </div>
                 <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                   <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Média de Avaliação</p>
                   <div className="flex items-center gap-1 text-2xl font-headline text-primary">
                     {viewingEmployee.rating.toFixed(1)} <span className="material-symbols-outlined star-active text-xl">star</span>
                   </div>
                 </div>
                 <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                   <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Faturamento</p>
                   <p className="text-2xl font-headline text-primary truncate" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewingEmployeeRevenue)}>
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewingEmployeeRevenue)}
                   </p>
                 </div>
                 <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                   <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Faltas / Atrasos</p>
                   <div className="flex items-center gap-1 text-2xl font-headline text-error">
                     {viewingEmployeeNoShows} <span className="material-symbols-outlined text-xl mb-0.5">event_busy</span>
                   </div>
                 </div>
              </div>

              <div className="flex justify-between items-end mb-4">
                <h3 className="text-lg font-headline text-primary">Histórico de Agendamentos</h3>
                <select 
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as any)}
                  className="bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">Todo o período</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="month">Este mês</option>
                </select>
              </div>
              
              <div className="overflow-y-auto flex-grow border border-outline-variant/10 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest">Data/Hora</th>
                      <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest">Cliente</th>
                      <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest">Serviços</th>
                      <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(app => (
                        <tr key={app.id} className="border-t border-outline-variant/10 hover:bg-surface/50 transition-colors">
                          <td className="py-3 px-4 text-sm text-on-surface-variant whitespace-nowrap">
                            {app.date?.split('-').reverse().join('/') || ''} <br/> <span className="font-bold">{app.time}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-on-surface font-medium">
                            {app.clientName}
                            {(app as any).specialNeeds && (app as any).specialNeeds.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 cursor-help" title={(app as any).notes ? `Observações: ${(app as any).notes}` : 'Nenhuma observação detalhada.'}>
                                {(app as any).specialNeeds.map((need: string) => (
                                  <span key={need} className="bg-error/10 text-error text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest flex items-center gap-0.5 w-fit">
                                    <span className="material-symbols-outlined text-[9px]">medical_services</span>
                                    {need}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-on-surface-variant max-w-[150px] truncate" title={app.services.join(', ')}>{app.services.join(', ')}</td>
                          <td className="py-3 px-4 text-xs">
                            <span className={`px-2 py-1 rounded-full font-bold uppercase tracking-wider text-[9px] ${app.status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-secondary-container text-on-secondary-container'}`}>
                              {app.status === 'completed' ? 'Concluído' : 'Agendado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-on-surface-variant text-sm">Nenhum histórico encontrado para este período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Sucesso - Credenciais do Novo Usuário */}
        {createdEmployeeInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-surface-container-lowest/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-md w-full border border-outline-variant/30"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-primary">how_to_reg</span>
                </div>
                <h2 className="text-2xl font-headline text-primary mb-2">Acesso Criado!</h2>
                <p className="text-on-surface-variant text-sm">O profissional foi cadastrado e já pode acessar o sistema.</p>
              </div>
              
              <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20 space-y-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Nome</p>
                  <p className="text-sm font-bold text-on-surface mt-0.5">{createdEmployeeInfo.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">E-mail de Acesso</p>
                  <p className="text-sm font-bold text-primary mt-0.5 select-all">{createdEmployeeInfo.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Senha Padrão</p>
                  <p className="text-sm font-bold text-on-surface mt-0.5 select-all">123456</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Nível de Acesso</p>
                  <p className="text-sm font-bold text-on-surface mt-0.5 capitalize">{
                    createdEmployeeInfo.role === 'supervisor' ? 'Supervisor (Acesso Total)' : 
                    'Colaborador (Agenda Padrão)'
                  }</p>
                </div>
              </div>

              <button 
                onClick={() => setCreatedEmployeeInfo(null)}
                className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-sm uppercase tracking-wider shadow-sm hover:bg-primary-dim transition-colors"
              >
                Concluir
              </button>
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
            className="fixed bottom-8 right-8 bg-surface-container-highest text-on-surface border border-outline-variant/30 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 z-[100]"
          >
            <span className="material-symbols-outlined text-primary">check_circle</span>
            <p className="text-sm font-bold">{toastMessage}</p>
          </motion.div>
        )}
    </div>
  );
}
