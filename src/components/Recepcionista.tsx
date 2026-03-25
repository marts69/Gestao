import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Appointment, Employee } from '../types';

interface ReceptionistViewProps {
  currentUser: Employee;
  employees: Employee[];
  appointments: Appointment[];
  services: any[];
  clients: any[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => Promise<boolean | void> | void;
  onReassign: (appointmentId: string, newEmployeeId: string) => void;
  onDeleteAppointment: (id: string) => Promise<boolean | void> | void;
  onEditAppointment: (id: string, appointment: any) => Promise<boolean | void> | void;
  onEditClient: (id: string, clientData: any) => Promise<boolean | void> | void;
  onDeleteClient: (id: string) => Promise<boolean | void> | void;
  onCompleteAppointment: (id: string) => void;
}

export function ReceptionistView({ currentUser, employees, appointments, services, clients, onAddAppointment, onReassign, onDeleteAppointment, onEditAppointment, onEditClient, onDeleteClient, onCompleteAppointment }: ReceptionistViewProps) {
  const [activeTab, setActiveTab] = useState<'escala' | 'clientes'>('escala');

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

  // Estado para controlar o Modal de Exclusão de Agendamento
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  // Estado para controlar o Toast de sucesso
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estado para controlar a edição de Clientes
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientObservation, setEditClientObservation] = useState('');
  
  // Estado para armazenar o termo de busca de clientes
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  // Estado para controlar a exclusão de Clientes
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Função Rápida da Recepção (Estilo Google)
  const handleQuickBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receptionDate < getLocalTodayString()) {
      setErrorMessage('Não é possível criar agendamentos em datas passadas.');
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
      setErrorMessage('Não é possível mover um agendamento para uma data no passado.');
      return;
    }
    if (editBookTime < '09:00' || editBookTime > '21:00') {
      setErrorMessage('Os agendamentos devem ser feitos no horário comercial (09:00 às 21:00).');
      return;
    }

    if (editBookService.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um serviço.');
      return;
    }

    // Verifica conflito ignorando o próprio agendamento que está sendo editado
    const isOccupied = hasOverlap(editBookDate, editBookTime, editBookEmp, editBookService, editingAppointmentId);
    if (isOccupied) {
      setErrorMessage('Não foi possível atualizar a reserva. Tente outro horário em alguns instantes.');
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

  // Lógica Inteligente de Encaixe / Walk-in
  const handleSuggestTime = () => {
    if (bookService.length === 0) {
      setErrorMessage('Selecione pelo menos um serviço para buscar o encaixe ideal.');
      return;
    }

    const todayStr = getLocalTodayString();
    setReceptionDate(todayStr);

    let currentTime = new Date();
    // Arredonda para os próximos 30 minutos
    currentTime.setMinutes(Math.ceil(currentTime.getMinutes() / 30) * 30);
    currentTime.setSeconds(0);
    
    if (currentTime.getHours() < 9) currentTime.setHours(9, 0); // Abre às 09h
    
    const requiredDuration = getDuration(bookService);

    while (currentTime.getHours() < 21) { // Fecha às 21h
      const timeStr = currentTime.toTimeString().substring(0, 5);
      const newStartMins = currentTime.getHours() * 60 + currentTime.getMinutes();
      const newEndMins = newStartMins + requiredDuration;

      const freeEmp = employees.find(emp => {
        const hasConflict = appointments.some(a => {
          if (a.date !== todayStr || a.assignedEmployeeId !== emp.id || a.status !== 'scheduled' || !a.time) return false;
          const existStart = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
          const existEnd = existStart + getDuration(a.services);
          return newStartMins < existEnd && newEndMins > existStart;
        });
        return !hasConflict;
      });

      if (freeEmp && newEndMins <= 21 * 60) {
        setBookTime(timeStr); setBookEmp(freeEmp.id);
        setToastMessage(`Encaixe disponível: ${timeStr} com ${freeEmp.name}`);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }
    setErrorMessage('Não há horários livres com duração suficiente para este serviço hoje.');
  };

  // Função para abrir o WhatsApp com mensagem pré-formatada
  const handleWhatsApp = (contact: string, name: string, date: string, time: string) => {
    const text = encodeURIComponent(`Olá ${name}, tudo bem? Aqui é da recepção do Serenidade Spa. Referente ao seu agendamento do dia ${date?.split('-').reverse().join('/') || ''} às ${time}...`);
    window.open(`https://wa.me/${contact.replace(/\D/g, '')}?text=${text}`, '_blank');
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

    // Define a logo com base no tipo de impressão (A4 ou Bobina)
    const logoSrc = printType === 'thermal' 
      ? 'https://ui-avatars.com/api/?name=Serenidade+Spa&background=000&color=fff&rounded=true&size=150' // Substitua por: '/sua-logo-preto-e-branco.png'
      : 'https://ui-avatars.com/api/?name=Serenidade+Spa&background=0D9488&color=fff&rounded=true&size=150'; // Substitua por: '/sua-logo-colorida.png'

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante - ${app.clientName}</title>
          <style>
            ${printType === 'a4' ? a4Styles : thermalStyles}
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <!-- Logo Dinâmica -->
              <img src="${logoSrc}" alt="Logo Serenidade Spa" />
              <h1>Serenidade Spa</h1>
              <p>Comprovante de Agendamento</p>
            </div>
            
            <div class="info-row"><span class="label">Cliente:</span> <span class="value">${app.clientName}</span></div>
            <div class="info-row"><span class="label">Contato:</span> <span class="value">${app.contact}</span></div>
            <div class="info-row"><span class="label">Data:</span> <span class="value">${app.date.split('-').reverse().join('/')}</span></div>
            <div class="info-row"><span class="label">Horário:</span> <span class="value">${app.time}</span></div>
            <div class="info-row"><span class="label">Profissional:</span> <span class="value">${empName}</span></div>
            
            <div class="divider"></div>
            
            <div class="services-list">
              <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: bold;">Serviços Solicitados</div>
              ${servicesWithPrices.map(s => `<div class="service-item"><span class="s-name">${s.name}</span><span class="s-price">R$ ${s.price.toFixed(2)}</span></div>`).join('')}
            </div>
            
            <div class="total-row">
              <span>Total Estimado</span>
              <span>R$ ${totalPrice.toFixed(2)}</span>
            </div>
            
            ${((app as any).specialNeeds && (app as any).specialNeeds.length > 0) || (app as any).notes ? `
              <div class="alert-box">
                ${(app as any).specialNeeds && (app as any).specialNeeds.length > 0 ? `<strong>⚠️ Atenção: ${(app as any).specialNeeds.join(', ')}</strong>` : ''}
                ${(app as any).notes ? `<p><i>"${(app as any).notes}"</i></p>` : ''}
              </div>
            ` : ''}
            
            <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
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

  // Data local segura para o restante do componente
  const todayStr = getLocalTodayString();

  // Filtra os clientes com base na busca (nome ou telefone)
  const filteredClients = useMemo(() => {
    return clients?.filter(c => 
      c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
      (c.telefone && c.telefone.includes(clientSearchTerm))
    );
  }, [clients, clientSearchTerm]);

  // Função para exportar clientes para CSV / Excel
  const handleExportCSV = () => {
    if (!clients || clients.length === 0) {
      alert('Nenhum cliente para exportar.');
      return;
    }
    
    // O \uFEFF é o BOM (Byte Order Mark) que garante que o Excel leia os acentos corretamente
    const cabecalho = '\uFEFF"Nome do Cliente","Telefone / WhatsApp"\n';
    
    const linhas = clients.map(c => {
      // Remove quebras de linha e escapa aspas duplas para não corromper o Excel
      const nome = c.nome.replace(/"/g, '""').replace(/[\r\n]+/g, ' '); 
      const telefone = c.telefone ? String(c.telefone).replace(/"/g, '""') : 'Não informado';
      return `"${nome}","${telefone}"`;
    }).join('\n');
    
    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Base_Clientes_Serenidade_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl flex flex-col flex-grow">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-headline text-primary mb-2">Visão da <span className="italic">Recepção</span>.</h1>
          <p className="text-on-surface-variant font-body">Olá, {currentUser.name?.split(' ')[0] || 'Recepcionista'}. Gerencie a escala e os clientes do dia.</p>
        </div>

        <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/20 overflow-x-auto max-w-full">
          <button 
            onClick={() => setActiveTab('escala')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'escala' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Gestão de Escala
          </button>
          <button 
            onClick={() => setActiveTab('clientes')}
            className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'clientes' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Base de Clientes
          </button>
        </div>
      </div>

      <datalist id="client-list">
        {clients?.map(c => <option key={c.id} value={c.nome} />)}
      </datalist>

      {activeTab === 'escala' && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container-lowest/60 backdrop-blur-xl p-8 rounded-3xl border border-outline-variant/30 shadow-lg flex flex-col flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-2xl font-headline text-primary">Agenda Diária</h3>
            <p className="text-sm text-on-surface-variant">Controle total dos atendimentos e realocações.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
              <input type="text" placeholder="Buscar Colaborador..." value={scheduleSearchTerm} onChange={e => setScheduleSearchTerm(e.target.value)} className="w-full sm:w-48 pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 text-sm rounded-xl focus:ring-1 focus:ring-primary text-on-surface" />
            </div>
            <input 
              type="date" 
              value={receptionDate} 
              onChange={e => setReceptionDate(e.target.value)} 
              className="bg-surface-container-low border border-outline-variant/30 text-sm rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary text-on-surface cursor-pointer" 
            />
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
        <div className="flex flex-col gap-6 pb-4 flex-grow">
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
                          {app.contact && app.contact !== 'Não informado' && (
                            <div className="flex items-center justify-between mb-2">
                              <p className={`text-xs font-medium flex items-center gap-1 ${isCompleted ? 'text-on-surface-variant' : 'text-primary'}`}>
                                <span className="material-symbols-outlined text-[12px]">call</span>
                                {app.contact}
                              </p>
                              <button 
                                onClick={() => handleWhatsApp(app.contact, app.clientName, app.date, app.time)}
                                className={`flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-colors ${isCompleted ? 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high' : 'text-[#128C7E] bg-[#25D366]/10 hover:bg-[#25D366]/20'}`}
                              >
                                <span className="material-symbols-outlined text-[12px]">chat</span>
                                WhatsApp
                              </button>
                            </div>
                          )}
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

      {activeTab === 'clientes' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-container-lowest/60 backdrop-blur-xl p-8 rounded-3xl border border-outline-variant/30 shadow-lg flex flex-col flex-grow">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-2xl font-headline text-primary">Base de Clientes</h3>
              <p className="text-sm text-on-surface-variant">Veja e edite as informações de contato dos seus clientes.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
                <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all text-on-surface placeholder:text-outline-variant"
                />
              </div>
              <button 
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 bg-primary-container text-on-primary-container px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-primary-container/80 transition-colors whitespace-nowrap shadow-sm"
                title="Exportar base completa para Excel/CSV"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Exportar
              </button>
            </div>
          </div>
          <div className="overflow-auto flex-grow border border-outline-variant/10 rounded-2xl max-h-[60vh]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest">Nome do Cliente</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest">Telefone / WhatsApp</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest">Última Visita</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest">Últimos Serviços</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients?.map(client => {
                  const clientHistory = appointments
                    .filter(a => a.clientName === client.nome && a.status === 'completed')
                    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
                  const lastVisit = clientHistory[0];

                  return (
                  <tr key={client.id} className="border-b border-outline-variant/10 hover:bg-surface/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-on-surface font-medium">
                      {client.nome}
                      {client.observacao && (
                        <span className="material-symbols-outlined text-[16px] text-primary ml-2 align-middle cursor-help" title={client.observacao}>speaker_notes</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-on-surface-variant">{client.telefone || <span className="text-outline-variant italic">Não informado</span>}</td>
                    <td className="py-4 px-4 text-sm text-on-surface-variant">
                      {lastVisit ? (
                        <div className="flex flex-col"><span>{lastVisit.date?.split('-').reverse().join('/') || ''}</span><span className="font-bold text-xs">{lastVisit.time}</span></div>
                      ) : <span className="text-outline-variant italic">Nenhum</span>}
                    </td>
                    <td className="py-4 px-4 text-xs text-on-surface-variant max-w-[150px] truncate" title={lastVisit ? lastVisit.services.join(', ') : ''}>
                      {lastVisit ? lastVisit.services.join(', ') : '-'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button onClick={() => { setEditingClientId(client.id); setEditClientName(client.nome); setEditClientPhone(client.telefone ? formatPhone(client.telefone) : ''); setEditClientObservation(client.observacao || ''); }} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-container/20 rounded-full transition-colors" title="Editar cliente e notas">
                        <span className="material-symbols-outlined text-[22px]">edit</span>
                      </button>
                      <button onClick={() => setClientToDelete(client.id)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-full transition-colors" title="Excluir cliente">
                        <span className="material-symbols-outlined text-[22px]">delete</span>
                      </button>
                    </td>
                  </tr>
                )})}
                {filteredClients?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant text-sm">
                      Nenhum cliente encontrado para "{clientSearchTerm}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Modal de Nova Reserva Rápida (Recepção) */}
      {showNewBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-lg w-full border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-headline text-primary">Novo Agendamento</h2>
              <div className="flex items-center gap-3">
                <button type="button" onClick={handleSuggestTime} className="text-[10px] bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:opacity-80 transition-opacity" title="Achar horário livre para hoje">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  Encaixe
                </button>
                <button onClick={() => setShowNewBookingModal(false)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
              </div>
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
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Profissional Atribuído</label>
                  <select required value={bookEmp} onChange={e => setBookEmp(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm">
                    <option value="" disabled>Selecione...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
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
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-lg w-full border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
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
                  <input 
                    required 
                    type="date" 
                    value={editBookDate} 
                    min={todayStr}
                    onChange={e => setEditBookDate(e.target.value)} 
                    disabled={isEditingCompleted}
                    className={`w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm ${isEditingCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
                  />
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

      {/* Modal de Edição de Cliente */}
      {editingClientId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-headline text-primary">Editar Cliente</h2>
              <button onClick={() => setEditingClientId(null)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const oldName = clients.find(c => c.id === editingClientId)?.nome;
              const success = await onEditClient(editingClientId, { nome: editClientName, telefone: editClientPhone, observacao: editClientObservation, oldName });
              if (success) {
                setEditingClientId(null);
                setToastMessage('Cliente atualizado com sucesso!');
                setTimeout(() => setToastMessage(null), 3000);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Nome</label>
                <input required type="text" value={editClientName} onChange={e => setEditClientName(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Telefone</label>
                <input type="text" value={editClientPhone} onChange={e => setEditClientPhone(formatPhone(e.target.value))} maxLength={15} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Anotações / Observações (Opcional)</label>
                <textarea value={editClientObservation} onChange={e => setEditClientObservation(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm resize-none" rows={3} placeholder="Ex: Tem alergia a amêndoas, prefere massagem relaxante..." />
              </div>
              <button type="submit" className="w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all">Salvar Alterações</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Cliente */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-lowest/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-md w-full border border-outline-variant/30"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-error">warning</span>
              </div>
              <h2 className="text-2xl font-headline text-error mb-2">Excluir Cliente?</h2>
              <p className="text-on-surface-variant text-sm">
                Tem certeza que deseja excluir este cliente do sistema? Todos os agendamentos vinculados a ele também serão perdidos. Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setClientToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-on-surface-variant hover:bg-surface-container transition-colors">
                Cancelar
              </button>
              <button onClick={async () => {
                  const success = await onDeleteClient(clientToDelete);
                  if (success !== false) {
                    setToastMessage('Cliente excluído com sucesso!');
                    setTimeout(() => setToastMessage(null), 3000);
                  }
                  setClientToDelete(null);
                }} className="flex-1 flex items-center justify-center gap-2 bg-error text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-error/90 transition-colors shadow-sm">
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
            className="bg-surface-container-lowest/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-md w-full border border-outline-variant/30"
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