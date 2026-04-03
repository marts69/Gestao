import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Appointment, Client, Employee, Service } from './types';
import { getLocalTodayString, getBrazilCurrentTimeString, getDuration, hasOverlap } from './components/appointmentUtils';
import { AnamneseForm, AnamneseData, initialAnamnese, formatAnamnese } from './components/AnamneseForm';
import { formatAnamneseStorage, parseClientObservation } from './utils/anamneseUtils';
import { formatPhone, formatCpf } from './utils/formatters';
import { useFormDraft } from './hooks/useFormDraft';
import { SCHEDULE_CONFIG } from './config/scheduleConfig';

const normalizeSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

type BookingDraft = {
  clientMode: 'search' | 'new';
  bookDate: string;
  bookName: string;
  bookPhone: string;
  bookCpf: string;
  bookTime: string;
  bookEmp: string;
  bookService: string[];
  serviceSearchTerm: string;
  bookDetails: string;
  bookClientObservation: string;
};

type BookingAppointmentPayload = Omit<Appointment, 'id' | 'status'> & {
  cpf?: string;
  clientId?: string;
  clientObservation?: string;
};

export interface BookingModalProps {
  receptionDate: string;
  initialTime: string;
  initialEmpId: string;
  clients: Client[];
  services: Service[];
  employees: Employee[];
  appointments: Appointment[];
  isAddingAppointment?: boolean;
  onClose: () => void;
  onAddAppointment: (appointment: BookingAppointmentPayload) => Promise<boolean | void> | void;
  onEditClient?: (id: string, clientData: Partial<Client>) => Promise<boolean | void> | void;
  setErrorMessage: (msg: string | null) => void;
  setToastMessage: (msg: string | null) => void;
}

export function BookingModal({ receptionDate, initialTime, initialEmpId, clients, services, employees, appointments, isAddingAppointment, onClose, onAddAppointment, onEditClient, setErrorMessage, setToastMessage }: BookingModalProps) {
  const initialDraft = useMemo<BookingDraft>(() => ({
    clientMode: 'search',
    bookDate: receptionDate,
    bookName: '',
    bookPhone: '',
    bookCpf: '',
    bookTime: initialTime,
    bookEmp: initialEmpId,
    bookService: [],
    serviceSearchTerm: '',
    bookDetails: '',
    bookClientObservation: '',
  }), [initialEmpId, initialTime, receptionDate]);

  const { draft, setDraft, clearDraft } = useFormDraft<BookingDraft>('booking-modal-draft', initialDraft);

  const [clientMode, setClientMode] = useState<'search' | 'new'>('search');
  const [bookDate, setBookDate] = useState(receptionDate);
  const [bookName, setBookName] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [activeClientIndex, setActiveClientIndex] = useState(-1);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [bookPhone, setBookPhone] = useState('');
  const [bookCpf, setBookCpf] = useState('');
  const [bookTime, setBookTime] = useState(initialTime);
  const [bookEmp, setBookEmp] = useState(initialEmpId);
  const [bookService, setBookService] = useState<string[]>([]);
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [bookDetails, setBookDetails] = useState('');
  const [bookClientObservation, setBookClientObservation] = useState('');
  const [showAnamnese, setShowAnamnese] = useState(false);
  const [anamneseData, setAnamneseData] = useState<AnamneseData>(initialAnamnese);
  const clientSearchWrapperRef = useRef<HTMLDivElement | null>(null);
  const canShowBookingDetails = clientMode === 'new' || Boolean(selectedClientId);

  useEffect(() => {
    setClientMode(draft.clientMode);
    setBookDate(draft.bookDate || receptionDate);
    setBookName(draft.bookName || '');
    setBookPhone(draft.bookPhone || '');
    setBookCpf(draft.bookCpf || '');
    setBookTime(draft.bookTime || initialTime);
    setBookEmp(draft.bookEmp || initialEmpId);
    setBookService(Array.isArray(draft.bookService) ? draft.bookService : []);
    setServiceSearchTerm(draft.serviceSearchTerm || '');
    setBookDetails(draft.bookDetails || '');
    setBookClientObservation(draft.bookClientObservation || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDraft({
      clientMode,
      bookDate,
      bookName,
      bookPhone,
      bookCpf,
      bookTime,
      bookEmp,
      bookService,
      serviceSearchTerm,
      bookDetails,
      bookClientObservation,
    });
  }, [
    clientMode,
    bookDate,
    bookName,
    bookPhone,
    bookCpf,
    bookTime,
    bookEmp,
    bookService,
    serviceSearchTerm,
    bookDetails,
    bookClientObservation,
    setDraft,
  ]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!clientSearchWrapperRef.current) return;
      const target = event.target as Node | null;
      if (target && !clientSearchWrapperRef.current.contains(target)) {
        setIsClientSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredClients = useMemo(() => {
    const q = normalizeSearch(clientSearchTerm);
    if (q.length < 2) return [];
    const digits = q.replace(/\D/g, '');
    const ranked = clients
      .map(client => {
        const name = normalizeSearch(client.nome);
        const phone = (client.telefone || '').replace(/\D/g, '');
        const cpf = (client.cpf || '').replace(/\D/g, '');
        const matches = !q || name.includes(q) || phone.includes(digits) || cpf.includes(digits);
        if (!matches) return null;

        let score = 0;
        if (q) {
          if (cpf === digits) score += 120;
          if (cpf.startsWith(digits) && digits.length > 0) score += 90;
          if (phone === digits) score += 80;
          if (phone.startsWith(digits) && digits.length > 0) score += 60;
          if (name.startsWith(q)) score += 50;
          if (name.includes(q)) score += 30;
          if (client.nome.toLowerCase().includes(clientSearchTerm.trim().toLowerCase())) score += 10;
        }

        return { client, score };
      })
      .filter((entry): entry is { client: Client; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score || a.client.nome.localeCompare(b.client.nome));

    return ranked.slice(0, 8).map(entry => entry.client);
  }, [clientSearchTerm, clients]);

  const filteredServices = useMemo(() => {
    const q = normalizeSearch(serviceSearchTerm);
    if (!q) return services;
    return services.filter(s => {
      const name = normalizeSearch(s.nome);
      const description = normalizeSearch(s.descricao || '');
      return name.includes(q) || description.includes(q);
    });
  }, [serviceSearchTerm, services]);

  useEffect(() => {
    if (!isClientSearchOpen) {
      setActiveClientIndex(-1);
      return;
    }

    setActiveClientIndex(filteredClients.length > 0 ? 0 : -1);
  }, [filteredClients, isClientSearchOpen]);

  const selectClient = (client: Client) => {
    const parsed = parseClientObservation(client.observacao);
    const cpfFromHistory = appointments
      .slice()
      .reverse()
      .find((app) => app.clientName.toLowerCase() === client.nome.toLowerCase() && app.cpf)?.cpf;

    const finalCpf = client.cpf || cpfFromHistory || '';

    setSelectedClientId(client.id);
    setBookName(client.nome);
    setBookPhone(client.telefone || '');
    setBookCpf(formatCpf(finalCpf));
    setBookClientObservation(parsed.note);
    setAnamneseData(parsed.anamData);
    setClientSearchTerm(`${client.nome}${client.cpf ? ` - ${client.cpf}` : ''}`);
    setIsClientSearchOpen(false);
    setActiveClientIndex(-1);
  };

  const handleClientSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isClientSearchOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsClientSearchOpen(true);
      return;
    }

    if (filteredClients.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveClientIndex((prev) => (prev < 0 ? 0 : (prev + 1) % filteredClients.length));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveClientIndex((prev) => (prev <= 0 ? filteredClients.length - 1 : prev - 1));
      return;
    }

    if (e.key === 'Enter' && isClientSearchOpen && activeClientIndex >= 0) {
      e.preventDefault();
      selectClient(filteredClients[activeClientIndex]);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsClientSearchOpen(false);
    }
  };

  const switchClientMode = (mode: 'search' | 'new') => {
    setClientMode(mode);
    if (mode === 'new') {
      setSelectedClientId(null);
      setClientSearchTerm('');
      setIsClientSearchOpen(false);
      return;
    }

    const seededSearch = bookName.trim();
    if (!selectedClientId && seededSearch.length >= 2) {
      setClientSearchTerm(seededSearch);
      setIsClientSearchOpen(true);
    }
  };

  const handleQuickBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientMode === 'search' && !selectedClientId) {
      setErrorMessage('Selecione um cliente na busca para continuar.');
      return;
    }
    if (bookTime < '09:00' || bookTime > '21:00') {
      setErrorMessage('Agendamentos devem ser no horário comercial (09:00 às 21:00).');
      return;
    }

    const todayStr = getLocalTodayString();
    const currentTime = getBrazilCurrentTimeString();

    if (bookDate < todayStr || (bookDate === todayStr && bookTime < currentTime)) {
      setErrorMessage('Não é permitido agendar no passado. Escolha uma data/horário futuro.');
      return;
    }

    if (bookService.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um serviço.'); return;
    }

    const [startHour, startMinute] = bookTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const durationMinutes = getDuration(bookService, services);
    const closingMinutes = SCHEDULE_CONFIG.END_HOUR * 60;

    if (startMinutes + durationMinutes > closingMinutes) {
      setErrorMessage('Este agendamento ultrapassa o fechamento às 21:00. Reduza os serviços ou escolha um horário mais cedo.');
      return;
    }

    const selectedEmployee = employees.find((emp) => emp.id === bookEmp);
    const overlapBlock = (selectedEmployee?.bloqueios || [])
      .filter((block) => block.data === bookDate)
      .find((block) => {
        const [blockStartH, blockStartM] = block.horaInicio.split(':').map(Number);
        const [blockEndH, blockEndM] = block.horaFim.split(':').map(Number);
        const blockStart = blockStartH * 60 + blockStartM;
        const blockEnd = blockEndH * 60 + blockEndM;
        return startMinutes < blockEnd && startMinutes + durationMinutes > blockStart;
      });

    if (overlapBlock) {
      setErrorMessage(`Profissional indisponível no período: ${overlapBlock.motivo}.`);
      return;
    }

    const isOccupied = hasOverlap(bookDate, bookTime, bookEmp, bookService, appointments, services);
    if (isOccupied) {
      setErrorMessage('Conflito de Horário: Você já possui clientes ou bloqueios neste período.'); return;
    }

    const finalDetails = showAnamnese ? `${bookDetails}${formatAnamnese(anamneseData)}`.trim() : bookDetails;
    const matchedClient = clientMode === 'search'
      ? clients.find(c => c.nome.toLowerCase() === bookName.toLowerCase().trim())
      : undefined;
    const payloadObservation = formatAnamneseStorage(bookClientObservation, anamneseData);

    const selectedClient = clientMode === 'search'
      ? clients.find(c => c.id === selectedClientId)
      : undefined;
    const clientToUpdate = selectedClient || matchedClient;
    if (clientToUpdate && onEditClient) {
      await onEditClient(clientToUpdate.id, {
        telefone: bookPhone,
        cpf: bookCpf,
        observacao: payloadObservation,
      });
    }

    const success = await onAddAppointment({
      clientName: bookName, contact: bookPhone || 'Não informado', date: bookDate, time: bookTime, guests: 1, specialNeeds: [],
      observation: finalDetails,
      assignedEmployeeId: bookEmp,
      services: bookService,
      cpf: bookCpf,
      clientId: clientToUpdate?.id,
      clientObservation: payloadObservation,
    });

    if (success !== false) {
      clearDraft();
      onClose();
      setToastMessage('Agendamento salvo na sua agenda!'); setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-lg w-full border border-outline-variant/20 max-h-[90vh] overflow-y-auto"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline text-primary">Agendar na Minha Escala</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={handleQuickBook} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Cliente</label>
            <div className="inline-flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/20 gap-1">
              <button
                type="button"
                onClick={() => switchClientMode('search')}
                className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors ${clientMode === 'search' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
              >
                Buscar Cliente
              </button>
              <button
                type="button"
                onClick={() => switchClientMode('new')}
                className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors ${clientMode === 'new' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
              >
                Novo Cliente
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {clientMode === 'search' && (
            <div ref={clientSearchWrapperRef}>
              <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Buscar Cliente</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
                <input
                  type="text"
                  value={clientSearchTerm}
                  onFocus={() => setIsClientSearchOpen(true)}
                  onKeyDown={handleClientSearchKeyDown}
                  onChange={e => {
                    setClientSearchTerm(e.target.value);
                    setSelectedClientId(null);
                    setIsClientSearchOpen(true);
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-10 p-3 pr-24 focus:ring-1 focus:ring-primary text-sm"
                  placeholder="Digite nome, telefone ou CPF"
                  autoComplete="off"
                />
                {clientSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setClientSearchTerm('');
                      setSelectedClientId(null);
                      setIsClientSearchOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold tracking-widest text-on-surface-variant hover:text-primary"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="mt-1 text-[10px] text-on-surface-variant">Digite pelo menos 2 caracteres para buscar.</p>
              {isClientSearchOpen && filteredClients.length > 0 && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-low custom-scrollbar shadow-sm">
                  {filteredClients.map((c, index) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectClient(c);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors border-b last:border-b-0 border-outline-variant/10 ${(selectedClientId === c.id || index === activeClientIndex) ? 'bg-primary/10' : 'hover:bg-primary/10'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-on-surface truncate">{c.nome}</p>
                        {selectedClientId === c.id && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Selecionado</span>
                        )}
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">
                        {c.telefone || 'Sem telefone'}{c.cpf ? ` · CPF ${c.cpf}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {isClientSearchOpen && clientSearchTerm.trim().length >= 2 && filteredClients.length === 0 && (
                <div className="mt-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-3">
                  <p className="text-xs text-on-surface-variant">Nenhum cliente encontrado para essa busca.</p>
                </div>
              )}
            </div>
            )}
            {clientMode === 'new' ? (
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Nome do Cliente</label>
                <input
                  required
                  type="text"
                  value={bookName}
                  onChange={e => setBookName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm"
                  placeholder="Nome completo"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Cliente Selecionado</p>
                  <p className="text-sm font-bold text-on-surface truncate">{bookName || 'Nenhum cliente selecionado'}</p>
                </div>
                {selectedClientId && <span className="text-[10px] text-primary font-bold uppercase tracking-widest">ok</span>}
              </div>
            )}
            {canShowBookingDetails && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Telefone</label>
                  <input type="text" value={bookPhone} onChange={e => setBookPhone(formatPhone(e.target.value))} maxLength={15} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">CPF</label>
                  <input type="text" value={bookCpf} onChange={e => setBookCpf(formatCpf(e.target.value))} maxLength={14} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm" placeholder="000.000.000-00" />
                </div>
              </>
            )}
          </div>
          {!canShowBookingDetails && clientMode === 'search' && (
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-3">
              <p className="text-xs text-on-surface-variant">Selecione um cliente para liberar os demais campos de agendamento.</p>
            </div>
          )}
          {canShowBookingDetails && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Data</label>
                  <input
                    required
                    type="date"
                    value={bookDate}
                    onChange={e => setBookDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Horário</label>
                  <input required type="time" min="09:00" max="21:00" value={bookTime} onChange={e => setBookTime(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Profissional</label>
                  <select required value={bookEmp} onChange={e => setBookEmp(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm">
                    <option value="" disabled>Selecione...</option>
                    {employees.filter(emp => emp.id !== 'admin').map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Serviços</label>
                <input
                  type="text"
                  value={serviceSearchTerm}
                  onChange={e => setServiceSearchTerm(e.target.value)}
                  className="w-full mb-2 bg-surface-container-low border border-outline-variant/20 rounded-xl p-2 focus:ring-1 focus:ring-primary text-sm"
                  placeholder="Pesquisar serviço..."
                />
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredServices.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setBookService(prev => prev.includes(s.nome) ? prev.filter(item => item !== s.nome) : [...prev, s.nome])}
                        className={`text-left p-2 rounded-xl border cursor-pointer transition-all ${bookService.includes(s.nome) ? 'bg-primary/10 border-primary shadow-sm' : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/50'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold leading-tight ${bookService.includes(s.nome) ? 'text-primary' : 'text-on-surface'}`}>{s.nome}</span>
                          <span className="text-[9px] text-on-surface-variant uppercase tracking-widest">{bookService.includes(s.nome) ? 'Selecionado' : 'Toque para incluir'}</span>
                        </div>
                        {s.descricao && <p className="text-[10px] text-on-surface-variant mt-1 line-clamp-1">{s.descricao}</p>}
                      </button>
                    ))}
                  </div>
              </div>
              <div className="border-t border-outline-variant/20 pt-4 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase">Observações</label>
                  <button type="button" onClick={() => setShowAnamnese(true)} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-colors bg-surface-container text-on-surface-variant hover:bg-surface-container-high">+ Ficha de Anamnese</button>
                </div>
                <textarea rows={3} value={bookDetails} onChange={e => setBookDetails(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm resize-none" placeholder="Ex: Preferências do cliente..." />
              </div>
              <button disabled={isAddingAppointment} type="submit" className={`w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all ${isAddingAppointment ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}>{isAddingAppointment ? 'Salvando...' : 'Confirmar Agendamento'}</button>
            </>
          )}
        </form>
      </motion.div>
      {showAnamnese && <AnamneseForm data={anamneseData} onChange={setAnamneseData} onClose={() => setShowAnamnese(false)} />}
    </div>
  );
}