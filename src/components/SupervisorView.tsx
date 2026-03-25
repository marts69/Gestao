import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Appointment, Employee } from '../types';


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
  onDeleteAppointment: (id: string) => Promise<boolean | void> | void;
  onEditAppointment: (id: string, appointment: any) => Promise<boolean | void> | void;
  onCompleteAppointment: (id: string) => void;
}

export function SupervisorView({ employees, appointments, services, clients, onReassign, onAddEmployee, onDeleteEmployee, onEditEmployee, onAddService, onEditService, onDeleteService, onAddAppointment, onDeleteAppointment, onEditAppointment, onCompleteAppointment }: SupervisorViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'escala' | 'equipe' | 'servicos'>('dashboard');
  
  // Recepção/Escala State
  const getLocalTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  
  const [receptionDate, setReceptionDate] = useState(getLocalTodayString());
  const [scheduleSearchTerm, setScheduleSearchTerm] = useState('');
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [bookName, setBookName] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookEmp, setBookEmp] = useState('');
  const [bookService, setBookService] = useState<string[]>([]);
  const [bookHighBloodPressure, setBookHighBloodPressure] = useState(false);
  const [bookPregnant, setBookPregnant] = useState(false);
  const [bookDetails, setBookDetails] = useState('');

  // New Employee Form
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpSpecialty, setNewEmpSpecialty] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'supervisor' | 'collaborator' | 'receptionist'>('collaborator');
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
  const [editBookName, setEditBookName] = useState('');
  const [editBookPhone, setEditBookPhone] = useState('');
  const [editBookDate, setEditBookDate] = useState('');
  const [editBookTime, setEditBookTime] = useState('');
  const [editBookEmp, setEditBookEmp] = useState('');
  const [editBookService, setEditBookService] = useState<string[]>([]);
  const [editBookHighBloodPressure, setEditBookHighBloodPressure] = useState(false);
  const [editBookPregnant, setEditBookPregnant] = useState(false);
  const [editBookDetails, setEditBookDetails] = useState('');

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

  // NOVO: Controle de Atrasos e Auto-Exclusão
  const [currentMinute, setCurrentMinute] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentMinute(new Date()), 60000); // Atualiza a cada 1 min
    return () => clearInterval(interval);
  }, []);

  // Função de máscara de telefone
  const formatPhone = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 3) return phoneNumber;
    if (phoneNumberLength < 8) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  // Função para formatar minutos em texto legível (ex: 1h 30m)
  const formatDuration = (minutes: number) => {
    if (!minutes) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Helper para verificar duração e conflito de agendamentos
  const getDuration = (serviceNames: string[]) => serviceNames.reduce((sum, name) => {
    const srv = services.find(s => s.nome === name);
    return sum + (Number(srv?.duracao) || 60);
  }, 0);

  const hasOverlap = (targetDate: string, targetTime: string, empId: string, serviceNames: string[], ignoreAppId: string | null = null) => {
    const newStart = parseInt(targetTime.split(':')[0]) * 60 + parseInt(targetTime.split(':')[1]);
    const newEnd = newStart + getDuration(serviceNames);

    return appointments.some(a => {
      if (a.id === ignoreAppId || a.date !== targetDate || a.assignedEmployeeId !== empId || a.status !== 'scheduled' || !a.time) return false;
      const existStart = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
      const existEnd = existStart + getDuration(a.services);
      return newStart < existEnd && newEnd > existStart;
    });
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
        role: newEmpRole
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

  // Função Rápida da Recepção (Estilo Google)
  const handleQuickBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receptionDate < getLocalTodayString()) {
      setErrorMessage('Não é possível criar novos agendamentos para datas no passado.');
      return;
    }
    if (bookTime < '09:00' || bookTime > '21:00') {
      setErrorMessage('Os agendamentos devem ser feitos no horário comercial (09:00 às 21:00).');
      return;
    }

    if (bookService.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um serviço.');
      return;
    }

    // Verifica se já existe um agendamento conflitante com base na duração
    const isOccupied = hasOverlap(receptionDate, bookTime, bookEmp, bookService);
    if (isOccupied) {
      setErrorMessage('Não foi possível adicionar a reserva. Tente outro horário em alguns instantes.');
      return;
    }

    const success = await onAddAppointment({
      clientName: bookName, 
      contact: bookPhone || 'Não informado',
      date: receptionDate, 
      time: bookTime,
      guests: 1, 
      specialNeeds: [
        ...(bookHighBloodPressure ? ['Pressão Alta'] : []),
        ...(bookPregnant ? ['Gravidez'] : [])
      ],
      notes: bookDetails,
      assignedEmployeeId: bookEmp, services: bookService
    });
    if (success !== false) {
      setShowNewBookingModal(false); setBookName(''); setBookPhone(''); setBookTime(''); setBookEmp(''); setBookService([]);
      setBookHighBloodPressure(false);
      setBookPregnant(false);
      setBookDetails('');
      setToastMessage('Agendamento salvo na escala!');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Função de Editar Agendamento
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editBookDate < getLocalTodayString()) {
      setErrorMessage('Não é possível mover o agendamento para uma data no passado.');
      return;
    }
    if (editBookTime < '09:00' || editBookTime > '21:00') {
      setErrorMessage('Os agendamentos devem ser feitos no horário comercial (09:00 às 21:00).');
      return;
    }

    // Verifica conflito de duração ignorando o próprio agendamento que está sendo editado
    const isOccupied = hasOverlap(editBookDate, editBookTime, editBookEmp, editBookService, editingAppointmentId);
    if (isOccupied) {
      setErrorMessage('Não foi possível adicionar a reserva. Tente outro horário em alguns instantes.');
      return;
    }

    const success = await onEditAppointment(editingAppointmentId!, {
      clientName: editBookName, contact: editBookPhone || 'Não informado', date: editBookDate, time: editBookTime,
      specialNeeds: [
        ...(editBookHighBloodPressure ? ['Pressão Alta'] : []),
        ...(editBookPregnant ? ['Gravidez'] : [])
      ],
      notes: editBookDetails,
      assignedEmployeeId: editBookEmp, services: editBookService
    });
    if (success !== false) {
      setEditingAppointmentId(null);
      setToastMessage('Agendamento atualizado com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Função para imprimir comprovante de agendamento (Salvar PDF)
  const handlePrintAppointment = (app: Appointment, empName: string, printType: 'a4' | 'thermal' = 'a4') => {
    // Calcula o preço dos serviços associados a este agendamento
    const servicesWithPrices = app.services.map(sName => {
      const srv = services.find(s => s.nome === sName);
      return { name: sName, price: Number(srv?.preco) || 0 };
    });
    const totalPrice = servicesWithPrices.reduce((sum, s) => sum + s.price, 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const a4Styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; max-width: 400px; margin: 0 auto; background: #f9fafb; }
      .receipt-container { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
      .header { text-align: center; margin-bottom: 25px; }
      .header img { max-height: 70px; margin-bottom: 12px; border-radius: 8px; }
      .header h1 { margin: 0; color: #111827; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
      .header p { margin: 4px 0 0 0; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; }
      .divider { border-bottom: 1px dashed #d1d5db; margin: 20px 0; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
      .info-row span.label { color: #6b7280; }
      .info-row span.value { font-weight: 600; text-align: right; color: #1f2937; }
      .services-list { margin-top: 15px; }
      .service-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
      .service-item .s-name { color: #374151; }
      .service-item .s-price { font-weight: 600; }
      .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb; font-size: 18px; font-weight: 700; color: #111827; }
      .alert-box { margin-top: 25px; background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; }
      .alert-box strong { color: #dc2626; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: 0.5px; }
      .alert-box p { margin: 0; font-size: 12px; color: #991b1b; }
      .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #9ca3af; }
    `;

    const thermalStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
      body { font-family: 'Courier Prime', monospace; padding: 0; margin: 0; color: #000; width: 80mm; background: #fff; }
      .receipt-container { padding: 10px; width: calc(100% - 20px); }
      .header { text-align: center; margin-bottom: 15px; }
      .header img { max-height: 50px; margin-bottom: 5px; filter: grayscale(100%); }
      .header h1 { margin: 0; color: #000; font-size: 16px; font-weight: 700; }
      .header p { margin: 2px 0 0 0; color: #000; font-size: 10px; text-transform: uppercase; }
      .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
      .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
      .info-row span.label { color: #000; }
      .info-row span.value { font-weight: 700; text-align: right; color: #000; }
      .services-list { margin-top: 10px; }
      .service-item { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
      .service-item .s-name { color: #000; }
      .service-item .s-price { font-weight: 700; }
      .total-row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px dashed #000; font-size: 14px; font-weight: 700; color: #000; }
      .alert-box { margin-top: 15px; border: 1px dashed #000; padding: 8px; }
      .alert-box strong { color: #000; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 4px; }
      .alert-box p { margin: 0; font-size: 11px; color: #000; font-style: italic; }
      .footer { margin-top: 20px; font-size: 10px; text-align: center; color: #000; }
    `;

    // Define a logo com base no tipo de impressão
    const logoSrc = printType === 'thermal' 
      ? 'https://ui-avatars.com/api/?name=Serenidade+Spa&background=000&color=fff&rounded=true&size=150' 
      : 'https://ui-avatars.com/api/?name=Serenidade+Spa&background=0D9488&color=fff&rounded=true&size=150'; 

    printWindow.document.write(`
      <html>
        <head><title>Comprovante - ${app.clientName}</title><style>${printType === 'a4' ? a4Styles : thermalStyles}</style></head>
        <body><div class="receipt-container"><div class="header"><img src="${logoSrc}" alt="Logo" /><h1>Serenidade Spa</h1><p>Comprovante de Agendamento</p></div><div class="info-row"><span class="label">Cliente:</span> <span class="value">${app.clientName}</span></div><div class="info-row"><span class="label">Contato:</span> <span class="value">${app.contact}</span></div><div class="info-row"><span class="label">Data:</span> <span class="value">${app.date.split('-').reverse().join('/')}</span></div><div class="info-row"><span class="label">Horário:</span> <span class="value">${app.time}</span></div><div class="info-row"><span class="label">Profissional:</span> <span class="value">${empName}</span></div><div class="divider"></div><div class="services-list"><div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: bold;">Serviços Solicitados</div>${servicesWithPrices.map(s => `<div class="service-item"><span class="s-name">${s.name}</span><span class="s-price">R$ ${s.price.toFixed(2)}</span></div>`).join('')}</div><div class="total-row"><span>Total Estimado</span><span>R$ ${totalPrice.toFixed(2)}</span></div>${((app as any).specialNeeds && (app as any).specialNeeds.length > 0) || (app as any).notes ? `<div class="alert-box">${(app as any).specialNeeds && (app as any).specialNeeds.length > 0 ? `<strong>⚠️ Atenção: ${(app as any).specialNeeds.join(', ')}</strong>` : ''}${(app as any).notes ? `<p><i>"${(app as any).notes}"</i></p>` : ''}</div>` : ''}<div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div></div><script>window.onload = function() { window.print(); window.close(); }</script></body>
      </html>
    `);
    printWindow.document.close();
  };

  // Função para enviar o Comprovante formatado via WhatsApp
  const handleSendReceiptWhatsApp = (app: Appointment, empName: string) => {
    if (!app.contact || app.contact === 'Não informado') {
      setErrorMessage('Cliente não possui telefone cadastrado para envio.');
      return;
    }
    
    const servicesWithPrices = app.services.map(sName => {
      const srv = services.find(s => s.nome === sName);
      return { name: sName, price: Number(srv?.preco) || 0 };
    });
    const totalPrice = servicesWithPrices.reduce((sum, s) => sum + s.price, 0);
    
    const text = encodeURIComponent(
      `*Serenidade Spa - Comprovante de Agendamento*\n\n` +
      `Olá, *${app.clientName}*! Seu agendamento está confirmado.\n\n` +
      `📅 *Data:* ${app.date.split('-').reverse().join('/')}\n` +
      `⏰ *Horário:* ${app.time}\n` +
      `👤 *Profissional:* ${empName}\n\n` +
      `*Serviços solicitados:*\n${servicesWithPrices.map(s => `• ${s.name} (R$ ${s.price.toFixed(2)})`).join('\n')}\n\n` +
      `*Total Estimado:* R$ ${totalPrice.toFixed(2)}\n\n` +
      `Aguardamos você!`
    );
    
    window.open(`https://wa.me/${app.contact.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  const editingApp = appointments.find(a => a.id === editingAppointmentId);
  const isEditingCompleted = editingApp?.status === 'completed';

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
        
        <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/20 overflow-x-auto max-w-full">
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
        </div>
      </div>

      <datalist id="client-list">
        {clients?.map(c => <option key={c.id} value={c.nome} />)}
      </datalist>

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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h3 className="text-2xl font-headline text-primary">Agenda da Recepção</h3>
              <p className="text-sm text-on-surface-variant">Controle total dos atendimentos e realocações.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-auto">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
                <input type="text" placeholder="Buscar Colaborador..." value={scheduleSearchTerm} onChange={e => setScheduleSearchTerm(e.target.value)} className="w-full sm:w-48 pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 text-sm rounded-xl focus:ring-1 focus:ring-primary text-on-surface" />
              </div>
              <input type="date" value={receptionDate} onChange={e => setReceptionDate(e.target.value)} className="bg-surface-container-low border border-outline-variant/30 text-sm rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary text-on-surface" />
              <button 
                onClick={() => setShowNewBookingModal(true)}
                className="bg-primary text-on-primary px-6 py-2 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md hover:bg-primary-dim flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nova Reserva
              </button>
            </div>
          </div>

          {/* Linha do Tempo / Quadro Visual (Vertical) */}
          <div className="flex flex-col gap-6 pb-4">
            {employees.map(emp => {
              const empAppointments = appointments
                .filter(a => (a.status === 'scheduled' || a.status === 'completed') && a.date === receptionDate && a.assignedEmployeeId === emp.id)
                .filter(a => scheduleSearchTerm === '' || a.clientName.toLowerCase().includes(scheduleSearchTerm.toLowerCase()) || a.services.some(s => s.toLowerCase().includes(scheduleSearchTerm.toLowerCase())))
                .filter(a => {
                  if (a.status !== 'completed') return true;
                  if (a.date !== todayStr) return true; // Se estiver vendo dias antigos, mostra tudo para conferência
                  
                  const appDateTime = new Date(`${a.date}T${a.time}:00`);
                  const durationMins = getDuration(a.services);
                  const minutesSinceEnd = Math.floor((currentMinute.getTime() - (appDateTime.getTime() + durationMins * 60000)) / 60000);
                  
                  return minutesSinceEnd <= 30; // Some da tela 30 minutos após o horário previsto de término
                })
                .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

              return (
                <div key={emp.id} className="w-full bg-surface-container-low/50 rounded-3xl p-6 border border-outline-variant/20">
                  <div className="flex items-center gap-3 mb-6 border-b border-outline-variant/10 pb-4">
                    <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full object-cover border-2 border-surface-container-lowest shadow-sm" />
                    <div>
                      <h4 className="font-bold text-on-surface text-sm">{emp.name}</h4>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{emp.specialty}</p>
                    </div>
                    <div className="ml-auto bg-surface-container-lowest px-3 py-1 rounded-xl text-xs font-bold text-primary shadow-sm border border-outline-variant/10">
                      {empAppointments.length}
                    </div>
                  </div>

                  <>
                    {empAppointments.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-outline-variant/20 rounded-2xl">
                        <span className="material-symbols-outlined text-outline-variant/50 text-4xl mb-2">event_available</span>
                        <p className="text-xs text-on-surface-variant font-medium">Agenda livre</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {empAppointments.map(app => {
                        const isCompleted = app.status === 'completed';
                        const appDateTime = new Date(`${app.date}T${app.time}:00`);
                        const isToday = app.date === todayStr;
                        const isPastDay = app.date < todayStr;
                        const isNoShow = !isCompleted && isPastDay;
                        const delayMinutes = (!isCompleted && isToday && currentMinute > appDateTime) 
                          ? Math.floor((currentMinute.getTime() - appDateTime.getTime()) / 60000) 
                          : 0;
                        const appSpecialNeeds = (app as any).specialNeeds || [];
                        const appNotes = (app as any).notes || '';

                        const cardBaseClass = "p-5 rounded-2xl border shadow-sm relative group transition-all";
                        const cardStatusClass = isCompleted 
                          ? "bg-surface-container-lowest/50 border-outline-variant/20 opacity-70" 
                          : (isNoShow || delayMinutes > 0) 
                            ? "bg-error-container/10 border-error/30 hover:shadow-md" 
                            : "bg-surface-container-lowest border-outline-variant/20 hover:border-primary/30 hover:shadow-md";
                        const sideColorClass = isCompleted ? "bg-outline-variant/50" : (isNoShow || delayMinutes > 0) ? "bg-error" : "bg-primary";

                        return (
                        <div key={app.id} className={`${cardBaseClass} ${cardStatusClass}`}>
                          <div className={`absolute top-0 left-0 bottom-0 w-1.5 rounded-l-2xl ${sideColorClass}`}></div>
                          <div className="pl-2">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`material-symbols-outlined text-[18px] ${isCompleted ? 'text-outline-variant' : (isNoShow || delayMinutes > 0) ? 'text-error' : 'text-primary'}`}>{isCompleted ? 'check_circle' : isNoShow ? 'event_busy' : delayMinutes > 0 ? 'warning' : 'schedule'}</span>
                                <span className={`text-xl font-headline font-bold leading-none ${isCompleted ? 'text-outline-variant line-through' : (isNoShow || delayMinutes > 0) ? 'text-error' : 'text-primary'}`}>{app.time}</span>
                                {isCompleted && <span className="bg-surface-container-highest text-on-surface-variant border border-outline-variant/20 text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Concluído</span>}
                                {isNoShow && <span className="bg-error/10 text-error text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Falta</span>}
                                {delayMinutes > 0 && <span className="bg-error/10 text-error text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">{delayMinutes}m atraso</span>}
                              </div>
                              <div className="flex gap-1">
                                {!isCompleted && (
                                  <button 
                                    onClick={() => { onCompleteAppointment(app.id); setToastMessage('Agendamento concluído!'); setTimeout(() => setToastMessage(null), 3000); }}
                                    className="text-on-surface-variant hover:text-primary hover:bg-primary-container/20 p-2 rounded-full transition-colors"
                                    title="Marcar como concluído"
                                  ><span className="material-symbols-outlined text-[20px]">check_circle</span></button>
                                )}
                                <button 
                                  onClick={() => {
                                    setEditingAppointmentId(app.id); setEditBookName(app.clientName);
                                    setEditBookPhone(app.contact && app.contact !== 'Não informado' ? formatPhone(app.contact) : '');
                                    setEditBookDate(app.date); setEditBookTime(app.time);
                                    setEditBookEmp(app.assignedEmployeeId); setEditBookService(app.services || []);
                                    setEditBookHighBloodPressure(appSpecialNeeds.includes('Pressão Alta'));
                                    setEditBookPregnant(appSpecialNeeds.includes('Gravidez'));
                                    setEditBookDetails(appNotes);
                                  }}
                                  className="text-on-surface-variant hover:text-primary hover:bg-primary-container/20 p-2 rounded-full transition-colors"
                                  title="Editar horário e dados"
                                ><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                <button 
                                  onClick={() => setAppointmentToDelete(app.id)}
                                  className="text-on-surface-variant hover:text-error hover:bg-error-container/20 p-2 rounded-full transition-colors"
                                  title="Cancelar agendamento"
                                ><span className="material-symbols-outlined text-[20px]">cancel</span></button>
                                <div className="flex bg-surface-container-low rounded-full ml-1 border border-outline-variant/10 overflow-hidden">
                                  <button 
                                    onClick={() => handleSendReceiptWhatsApp(app, emp.name)}
                                    className="text-on-surface-variant hover:text-[#25D366] hover:bg-[#25D366]/10 p-2 rounded-full transition-colors"
                                    title="Enviar Comprovante via WhatsApp"
                                  ><span className="material-symbols-outlined text-[20px]">send_to_mobile</span></button>
                                  <button 
                                    onClick={() => handlePrintAppointment(app, emp.name, 'a4')}
                                    className="text-on-surface-variant hover:text-primary hover:bg-primary-container/20 p-2 rounded-full transition-colors"
                                    title="Imprimir em A4"
                                  ><span className="material-symbols-outlined text-[20px]">print</span></button>
                                  <button 
                                    onClick={() => handlePrintAppointment(app, emp.name, 'thermal')}
                                    className="text-on-surface-variant hover:text-primary hover:bg-primary-container/20 p-2 rounded-full transition-colors"
                                    title="Imprimir Cupom Térmico (Bobina)"
                                  ><span className="material-symbols-outlined text-[20px]">receipt_long</span></button>
                                </div>
                              </div>
                            </div>
                            <h5 className="font-bold text-on-surface text-sm mb-1">{app.clientName}</h5>
                            <p className="text-xs text-on-surface-variant line-clamp-2 mb-4" title={app.services.join(', ')}>
                              {app.services.join(', ')}
                            </p>
                            {appSpecialNeeds.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {appSpecialNeeds.map((need: string) => (
                                  <span key={need} className="bg-error/10 text-error text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[10px]">medical_services</span>
                                    {need}
                                  </span>
                                ))}
                              </div>
                            )}
                            {appNotes && (
                              <p className="text-[10px] text-on-surface-variant mb-4 italic border-l-2 border-outline-variant/30 pl-2 line-clamp-2" title={appNotes}>
                                "{appNotes}"
                              </p>
                            )}
                            {!isCompleted && (
                              <div className="pt-3 border-t border-outline-variant/10">
                                <label className="text-[9px] font-bold text-outline uppercase tracking-widest block mb-2">Realocar para:</label>
                                <select 
                                  value={app.assignedEmployeeId}
                                  onChange={(e) => onReassign(app.id, e.target.value)}
                                  className="w-full bg-surface-container-low border border-outline-variant/20 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary text-on-surface-variant cursor-pointer transition-colors hover:border-primary/50"
                                >
                                  {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {(isNoShow || delayMinutes >= 15) && (
                               <button 
                                 onClick={() => setAppointmentToDelete(app.id)}
                                 className="w-full mt-3 flex items-center justify-center gap-1 bg-error/10 hover:bg-error/20 text-error py-2 rounded-xl text-[10px] font-bold uppercase transition-colors"
                               >
                                 <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                 {isNoShow ? 'Excluir Agendamento' : 'Excluir Falta (Atraso)'}
                               </button>
                            )}
                          </div>
                        </div>
                      );
                      })}
                      </div>
                    )}
                  </>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {activeTab === 'equipe' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {employees.length === 0 ? (
              <div className="text-center py-16 bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm w-full">
                <span className="material-symbols-outlined text-4xl text-outline-variant mb-4">group_off</span>
                <p className="text-on-surface-variant text-sm font-medium">Nenhum colaborador cadastrado no momento.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 content-start">
                  {employees.slice((employeeCurrentPage - 1) * EMPLOYEES_PER_PAGE, employeeCurrentPage * EMPLOYEES_PER_PAGE).map(emp => (
                    <div key={emp.id} className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col gap-4 h-fit">
                      <div className="flex items-center gap-4 min-w-0">
                        <img src={emp.avatar} alt={emp.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-bold text-on-surface flex items-center gap-2 truncate">
                            {emp.name}
                            {emp.role === 'supervisor' && (
                              <span className="material-symbols-outlined text-[14px] text-primary shrink-0" title="Supervisor">shield_person</span>
                            )}
                          </h4>
                          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1 truncate">{emp.specialty}</p>
                          <p className="text-xs text-on-surface-variant mt-1 truncate">{emp.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end border-t border-outline-variant/10 pt-3">
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-container/20 rounded-full transition-colors"
                          title="Ver histórico e detalhes"
                        >
                          <span className="material-symbols-outlined text-[22px]">history</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingEmployeeId(emp.id);
                            setNewEmpName(emp.name);
                            setNewEmpEmail(emp.email);
                            setNewEmpSpecialty(emp.specialty);
                            setNewEmpRole(emp.role as 'supervisor' | 'collaborator' | 'receptionist');
                          }}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-container/20 rounded-full transition-colors"
                          title="Editar profissional"
                        >
                          <span className="material-symbols-outlined text-[22px]">edit</span>
                        </button>
                        <button
                          onClick={() => setEmployeeToDelete(emp.id)}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                          title="Excluir profissional"
                        >
                          <span className="material-symbols-outlined text-[22px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {Math.ceil(employees.length / EMPLOYEES_PER_PAGE) > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-2">
                    <button 
                      disabled={employeeCurrentPage === 1} 
                      onClick={() => setEmployeeCurrentPage(p => p - 1)}
                      className="p-2 rounded-full border border-outline-variant/20 text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="text-xs text-on-surface-variant font-medium">
                      Página {employeeCurrentPage} de {Math.ceil(employees.length / EMPLOYEES_PER_PAGE)}
                    </span>
                    <button 
                      disabled={employeeCurrentPage === Math.ceil(employees.length / EMPLOYEES_PER_PAGE)} 
                      onClick={() => setEmployeeCurrentPage(p => p + 1)}
                      className="p-2 rounded-full border border-outline-variant/20 text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/20 h-fit">
            <h3 className="text-lg font-headline text-primary mb-6">{editingEmployeeId ? 'Editar Colaborador' : 'Adicionar Colaborador'}</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Nome Completo</label>
                <input required type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Especialidade</label>
                <input required type="text" value={newEmpSpecialty} onChange={e => setNewEmpSpecialty(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Ex: Massoterapia" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Papel / Acesso</label>
                <select 
                  value={newEmpRole} 
                  onChange={e => setNewEmpRole(e.target.value as 'supervisor' | 'collaborator' | 'receptionist')} 
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all text-on-surface"
                >
                  <option value="collaborator">Colaborador (Agenda padrão)</option>
                  <option value="receptionist">Recepcionista (Gestão de Escala)</option>
                  <option value="supervisor">Supervisor (Acesso Total)</option>
                </select>
              </div>
              {!editingEmployeeId && (
                <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 mt-2">
                  <p className="text-xs text-on-surface-variant text-center">O e-mail de acesso será gerado com base no nome. A senha padrão é: <strong className="text-on-surface">123456</strong></p>
                </div>
              )}
              <button disabled={isSubmitting} type="submit" className={`w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}>
                {isSubmitting ? 'Salvando...' : (editingEmployeeId ? 'Salvar Alterações' : 'Cadastrar')}
              </button>
              {editingEmployeeId && (
                <button type="button" onClick={cancelEdit} className="w-full mt-2 text-xs font-bold text-on-surface-variant uppercase tracking-widest hover:text-on-surface transition-colors py-2">
                  Cancelar Edição
                </button>
              )}
            </form>
          </div>
        </motion.div>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-lg w-full border border-outline-variant/20 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-headline text-primary">Novo Agendamento</h2>
                <button onClick={() => setShowNewBookingModal(false)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={handleQuickBook} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Cliente</label>
                    <input required list="client-list" type="text" value={bookName} onChange={e => setBookName(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm" placeholder="Digite ou selecione..." autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Telefone / WhatsApp</label>
                    <input type="text" value={bookPhone} onChange={e => setBookPhone(formatPhone(e.target.value))} maxLength={15} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Horário</label>
                    <input required type="time" min="09:00" max="21:00" value={bookTime} onChange={e => setBookTime(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm" />
                  </div>
                  <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Serviços</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {services.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setBookService(prev => prev.includes(s.nome) ? prev.filter(item => item !== s.nome) : [...prev, s.nome])}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${bookService.includes(s.nome) ? 'bg-primary/10 border-primary shadow-sm' : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/50'}`}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                         <span className={`text-xs font-bold leading-tight ${bookService.includes(s.nome) ? 'text-primary' : 'text-on-surface'}`}>{s.nome}</span>
                         <span className="text-[10px] font-bold text-on-surface-variant whitespace-nowrap bg-surface-container px-1.5 py-0.5 rounded">R$ {Number(s.preco).toFixed(2)}</span>
                      </div>
                      {s.descricao && <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2 mt-1">{s.descricao}</p>}
                    </div>
                  ))}
                </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Profissional Atribuído</label>
                  <select required value={bookEmp} onChange={e => setBookEmp(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm">
                    <option value="" disabled>Selecione...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="border-t border-outline-variant/20 pt-4 mt-4">
                  <label className="block text-[10px] font-bold text-primary tracking-[0.15em] uppercase mb-3">Saúde e Observações (Recepção)</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                      <input type="checkbox" checked={bookHighBloodPressure} onChange={e => setBookHighBloodPressure(e.target.checked)} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" />
                      Pressão Alta
                    </label>
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                      <input type="checkbox" checked={bookPregnant} onChange={e => setBookPregnant(e.target.checked)} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" />
                      Gravidez
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Detalhes / Observações</label>
                    <textarea rows={4} value={bookDetails} onChange={e => setBookDetails(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm min-h-[120px] resize-none" placeholder="Ex: Cliente prefere atendimento mais leve, restrições, etc." />
                  </div>
                </div>
                <button type="submit" className="w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all">Confirmar Agendamento</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal de Edição de Agendamento */}
        {editingAppointmentId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-lg w-full border border-outline-variant/20 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-headline text-primary">Editar Agendamento</h2>
                <button onClick={() => setEditingAppointmentId(null)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
              </div>
              {isEditingCompleted && (
                <div className="bg-secondary-container/50 text-on-secondary-container p-3 rounded-xl text-xs flex gap-2 items-center mb-4">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Este agendamento já foi concluído. Apenas os serviços prestados podem ser ajustados.</span>
                </div>
              )}
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Cliente</label>
                    <input required list="client-list" type="text" value={editBookName} onChange={e => setEditBookName(e.target.value)} disabled={isEditingCompleted} className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm ${isEditingCompleted ? 'opacity-50 cursor-not-allowed' : ''}`} autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Telefone / WhatsApp</label>
                    <input type="text" value={editBookPhone} onChange={e => setEditBookPhone(formatPhone(e.target.value))} maxLength={15} disabled={isEditingCompleted} className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm ${isEditingCompleted ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Data</label>
                    <input required type="date" value={editBookDate} onChange={e => setEditBookDate(e.target.value)} disabled={isEditingCompleted} className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm ${isEditingCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Horário</label>
                    <input required type="time" min="09:00" max="21:00" value={editBookTime} onChange={e => setEditBookTime(e.target.value)} disabled={isEditingCompleted} className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm ${isEditingCompleted ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Profissional Atribuído</label>
              <select required value={editBookEmp} onChange={e => setEditBookEmp(e.target.value)} disabled={isEditingCompleted} className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm ${isEditingCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Serviços</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {services.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setEditBookService(prev => prev.includes(s.nome) ? prev.filter(item => item !== s.nome) : [...prev, s.nome])}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${editBookService.includes(s.nome) ? 'bg-primary/10 border-primary shadow-sm' : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/50'}`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                       <span className={`text-xs font-bold leading-tight ${editBookService.includes(s.nome) ? 'text-primary' : 'text-on-surface'}`}>{s.nome}</span>
                       <span className="text-[10px] font-bold text-on-surface-variant whitespace-nowrap bg-surface-container px-1.5 py-0.5 rounded">R$ {Number(s.preco).toFixed(2)}</span>
                    </div>
                    {s.descricao && <p className="text-[10px] text-on-surface-variant leading-snug line-clamp-2 mt-1">{s.descricao}</p>}
                  </div>
                ))}
              </div>
                </div>
                <div className="border-t border-outline-variant/20 pt-4 mt-4">
                  <label className="block text-[10px] font-bold text-primary tracking-[0.15em] uppercase mb-3">Saúde e Observações (Recepção)</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                      <input type="checkbox" checked={editBookHighBloodPressure} onChange={e => setEditBookHighBloodPressure(e.target.checked)} disabled={isEditingCompleted} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" />
                      Pressão Alta
                    </label>
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                      <input type="checkbox" checked={editBookPregnant} onChange={e => setEditBookPregnant(e.target.checked)} disabled={isEditingCompleted} className="rounded border-outline-variant/30 text-primary focus:ring-primary bg-surface-container-lowest" />
                      Gravidez
                    </label>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Detalhes / Observações</label>
                    <textarea rows={4} value={editBookDetails} onChange={e => setEditBookDetails(e.target.value)} disabled={isEditingCompleted} className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm min-h-[120px] resize-none ${isEditingCompleted ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="Ex: Cliente prefere atendimento mais leve, restrições, etc." />
                  </div>
                </div>
                <button type="submit" className="w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all">Salvar Alterações</button>
              </form>
            </motion.div>
          </div>
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
                    createdEmployeeInfo.role === 'receptionist' ? 'Recepcionista (Gestão de Escala)' : 
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
