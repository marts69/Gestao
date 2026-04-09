import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Appointment, Bloqueio, Client, Employee, Service, TurnoSwapRequest, TurnoSwapStatus, ServiceEligibilityMode } from '../types';
import { getLocalTodayString } from '../features/appointments/utils/appointmentCore';
import { SupervisorDashboardTab } from '../features/dashboard/components';
import { SupervisorClientesTab } from '../features/clients/components';
import { SupervisorEquipeTab } from '../features/team/components';
import { SupervisorEscalaTab } from '../features/scale/components';
import { SupervisorPlanejamentoTab } from '../features/planning/components';
import { SupervisorServicosTab } from '../features/services/components';
import { aplicarFolgasDomingoNoMes, gerarEscala, type DiaEscala } from '../utils/escalaCalculator';
import { analisarConformidadeCLT } from '../utils/cltValidator';

type ServicePayload = {
  nome: string;
  preco: number | string;
  duracao: number | string;
  icone?: string;
  descricao?: string;
  modoElegibilidade?: ServiceEligibilityMode;
  cargosPermitidos?: string[];
  habilidadesPermitidas?: string[];
  profissionaisPermitidos?: string[];
  categoria?: string;
  tempoHigienizacaoMin?: number | string;
  comissaoPercentual?: number | string;
};

const normalizeServiceSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const normalizeRuleList = (value: string): string[] => Array.from(new Set(value
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)));

const appendRuleToken = (currentValue: string, nextToken: string): string => {
  const merged = Array.from(new Set([...normalizeRuleList(currentValue), nextToken.trim()].filter(Boolean)));
  return merged.join(', ');
};

const getEligibilitySummary = (service: Service): string => {
  const mode = service.modoElegibilidade || 'livre';

  if (mode === 'cargo') {
    const cargos = Array.isArray(service.cargosPermitidos) ? service.cargosPermitidos.filter(Boolean) : [];
    return cargos.length > 0 ? `Somente cargos: ${cargos.join(', ')}` : 'Restrito por cargo';
  }

  if (mode === 'habilidade') {
    const habilidades = Array.isArray(service.habilidadesPermitidas) ? service.habilidadesPermitidas.filter(Boolean) : [];
    return habilidades.length > 0 ? `Somente habilidades: ${habilidades.join(', ')}` : 'Restrito por habilidade';
  }

  if (mode === 'profissional') {
    const profissionais = Array.isArray(service.profissionaisPermitidos) ? service.profissionaisPermitidos.filter(Boolean) : [];
    return profissionais.length > 0 ? `Somente profissionais: ${profissionais.join(', ')}` : 'Restrito por profissional';
  }

  return 'Disponível para qualquer profissional';
};

const isValidScaleDayType = (value: unknown): value is DiaEscala['tipo'] => (
  value === 'trabalho' || value === 'folga' || value === 'fds'
);

type AppointmentCreatePayload = Omit<Appointment, 'id' | 'status'> & {
  cpf?: string;
  clientId?: string;
  clientObservation?: string;
};

type ScaleOverridePayload = {
  colaboradorId: string;
  data: string;
  tipo: DiaEscala['tipo'];
  turno?: string;
  descricao?: string;
};

type ScaleSwapPayload = {
  from: {
    colaboradorId: string;
    data: string;
    snapshot?: { tipo: DiaEscala['tipo']; turno?: string; descricao?: string };
  };
  to: {
    colaboradorId: string;
    data: string;
    snapshot?: { tipo: DiaEscala['tipo']; turno?: string; descricao?: string };
  };
};

type ScaleReplicatePayload = {
  colaboradorId: string;
  data: string;
  targetDates: string[];
  source?: { tipo: DiaEscala['tipo']; turno?: string; descricao?: string };
};

interface SupervisorViewProps {
  employees: Employee[];
  appointments: Appointment[];
  services: Service[];
  clients: Client[];
  scaleOverrides?: ScaleOverridePayload[];
  onReassign: (appointmentId: string, newEmployeeId: string) => void;
  onAddEmployee: (employee: Omit<Employee, 'id' | 'rating' | 'completedServices'>) => Promise<boolean | string | void> | void;
  onDeleteEmployee: (id: string, reallocateToId?: string) => void;
  onEditEmployee: (id: string, employee: Partial<Employee>) => Promise<boolean | string | void> | void;
  onAddService: (service: ServicePayload) => Promise<boolean | string | void>;
  onEditService: (id: string, service: ServicePayload) => Promise<boolean | string | void>;
  onDeleteService: (id: string) => void;
  onAddAppointment: (appointment: AppointmentCreatePayload) => Promise<boolean | void> | void;
  isAddingAppointment?: boolean;
  onDeleteAppointment: (id: string) => Promise<boolean | void> | void;
  onEditAppointment: (id: string, appointment: Partial<Appointment>) => Promise<boolean | void> | void;
  onCompleteAppointment: (id: string) => void;
  onEditClient?: (id: string, clientData: Partial<Client>) => Promise<boolean | void> | void;
  onDeleteClient?: (id: string) => Promise<boolean | void> | void;
  onAddBloqueio?: (b: Omit<Bloqueio, 'id'>) => Promise<boolean>;
  onDeleteBloqueio?: (id: string) => Promise<boolean>;
  turnoSwapRequests?: TurnoSwapRequest[];
  onUpdateTurnoSwapRequestStatus?: (id: string, status: Exclude<TurnoSwapStatus, 'pendente'>, respostaObservacao?: string) => Promise<boolean | void> | void;
  onOpenUpcomingAppointments?: () => void;
  onSaveScaleOverride?: (payload: ScaleOverridePayload) => Promise<boolean | void> | void;
  onSwapScaleDays?: (payload: ScaleSwapPayload) => Promise<boolean | void> | void;
  onReplicateScaleDays?: (payload: ScaleReplicatePayload) => Promise<boolean | void> | void;
}

export function SupervisorView({ employees, appointments, services, clients, scaleOverrides = [], onReassign, onAddEmployee, onDeleteEmployee, onEditEmployee, onAddService, onEditService, onDeleteService, onAddAppointment, isAddingAppointment, onDeleteAppointment, onEditAppointment, onCompleteAppointment, onEditClient, onDeleteClient, onAddBloqueio, onDeleteBloqueio, turnoSwapRequests = [], onUpdateTurnoSwapRequestStatus, onOpenUpcomingAppointments, onSaveScaleOverride, onSwapScaleDays, onReplicateScaleDays }: SupervisorViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'escala' | 'planejamento' | 'equipe' | 'servicos' | 'clientes'>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const saved = window.sessionStorage.getItem('supervisor-active-tab');
    if (saved === 'dashboard' || saved === 'escala' || saved === 'planejamento' || saved === 'equipe' || saved === 'servicos' || saved === 'clientes') {
      return saved;
    }
    return 'dashboard';
  });

  const [activeModule, setActiveModule] = useState<'operacional' | 'rh'>(() => {
    if (typeof window === 'undefined') return 'operacional';
    const saved = window.sessionStorage.getItem('supervisor-active-module');
    return saved === 'rh' ? 'rh' : 'operacional';
  });

  const [selectedScaleEmployeeId, setSelectedScaleEmployeeId] = useState('');
  const [selectedScaleMonth, setSelectedScaleMonth] = useState(getLocalTodayString().slice(0, 7));
  const [selectedPlanningEmployeeId, setSelectedPlanningEmployeeId] = useState<string | null>(null);
  const [planningScaleType, setPlanningScaleType] = useState<Employee['tipoEscala']>('6x1');
  const [planningSundayOffs, setPlanningSundayOffs] = useState(2);
  const [planningCoverageTarget, setPlanningCoverageTarget] = useState(5);
  const [planningSundayFrequency, setPlanningSundayFrequency] = useState<'1x1' | '2x1'>('2x1');
  const [isSavingPlanning, setIsSavingPlanning] = useState(false);
  const [showTopAlerts, setShowTopAlerts] = useState(true);
  const [dismissedCltAlertIds, setDismissedCltAlertIds] = useState<Record<string, boolean>>({});
  const cltAlertTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [planningViewMode, setPlanningViewMode] = useState<'calendario' | 'timeline'>(() => {
    if (typeof window === 'undefined') return 'calendario';
    const saved = window.sessionStorage.getItem('supervisor-planning-view-mode');
    return saved === 'timeline' ? 'timeline' : 'calendario';
  });
  const [selectedPlanningDay, setSelectedPlanningDay] = useState<DiaEscala | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPlanningEditMode, setIsPlanningEditMode] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'folgaHoje'>('all');
  const [isScaleGeneratorOpen, setIsScaleGeneratorOpen] = useState(false);
  const [scaleGeneratorEmployeeId, setScaleGeneratorEmployeeId] = useState('');
  const [scaleGeneratorMonth, setScaleGeneratorMonth] = useState(getLocalTodayString().slice(0, 7));
  const [scaleGeneratorType, setScaleGeneratorType] = useState<Employee['tipoEscala']>('6x1');
  const [scaleGeneratorSundayOffs, setScaleGeneratorSundayOffs] = useState(2);
  const [scaleGeneratorCoverageTarget, setScaleGeneratorCoverageTarget] = useState(5);
  const [scaleGeneratorSundayFrequency, setScaleGeneratorSundayFrequency] = useState<'1x1' | '2x1'>('2x1');
  const [scaleGeneratorSearch, setScaleGeneratorSearch] = useState('');
  const planningMonthInputRef = useRef<HTMLInputElement | null>(null);
  const [planningOverrides, setPlanningOverrides] = useState<Record<string, ScaleOverridePayload>>({});
  const [suggestedPlanningKeys, setSuggestedPlanningKeys] = useState<string[]>([]);
  const planningOverridesList = useMemo(
    () => Object.values(planningOverrides) as ScaleOverridePayload[],
    [planningOverrides],
  );

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
  const [viewingEmployeeTab, setViewingEmployeeTab] = useState<'dashboard' | 'jornada' | 'ocorrencias'>('dashboard');
  // Estado para controlar o Modal de Exclusão de Serviço
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  // Estado para controlar o filtro do histórico no modal
  const [historyFilter, setHistoryFilter] = useState<'all' | '7days' | 'month'>('all');
  
  // New Service Form
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const SERVICE_ICONS = ['self_improvement', 'waves', 'face', 'water_drop', 'spa'];
  const [newServiceIcon, setNewServiceIcon] = useState(SERVICE_ICONS[0]);
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [serviceEligibilityMode, setServiceEligibilityMode] = useState<ServiceEligibilityMode>('livre');
  const [newServiceCategoria, setNewServiceCategoria] = useState('');
  const [newServiceTempoHigienizacao, setNewServiceTempoHigienizacao] = useState('0');
  const [newServiceComissao, setNewServiceComissao] = useState('');
  const [serviceAllowedCargosInput, setServiceAllowedCargosInput] = useState('');
  const [serviceAllowedSkillsInput, setServiceAllowedSkillsInput] = useState('');
  const [serviceAllowedProfessionalsInput, setServiceAllowedProfessionalsInput] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const deferredServiceSearchTerm = useDeferredValue(serviceSearchTerm);

  // Estado para controlar o Toast de sucesso
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado da Paginação de Colaboradores
  const [employeeCurrentPage, setEmployeeCurrentPage] = useState(1);
  const EMPLOYEES_PER_PAGE = 6; // Quantidade de cartões por página


  // Função para formatar minutos em texto legível (ex: 1h 30m)
  const formatDuration = (minutes: number) => {
    if (!minutes) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  useEffect(() => {
    setPlanningOverrides((prev) => {
      const next = { ...prev };
      scaleOverrides.forEach((override) => {
        if (!override?.colaboradorId || !override?.data) return;

        const tipo = isValidScaleDayType(override.tipo) ? override.tipo : null;
        if (!tipo) return;

        next[`${override.colaboradorId}:${override.data}`] = {
          colaboradorId: override.colaboradorId,
          data: override.data,
          tipo,
          turno: tipo === 'trabalho' ? override.turno : undefined,
          descricao: override.descricao,
        };
      });
      return next;
    });
  }, [scaleOverrides]);

  // Escuta o comando de Quick Fix vindo do Sino Global
  useEffect(() => {
    const handleQuickResolve = (e: Event) => {
      const customEvent = e as CustomEvent<{ employeeId: string }>;
      const { employeeId } = customEvent.detail;
      const emp = employees.find(el => el.id === employeeId);
      if (emp) {
        setActiveTab('planejamento');
        setPlanningViewMode('timeline');
        setEmployeeSearchTerm(emp.name); // Isola o funcionário na tela
        setShowTopAlerts(true); // Garante que os avisos internos da aba fiquem visíveis
      }
    };
    window.addEventListener('quick-resolve-clt', handleQuickResolve);
    return () => window.removeEventListener('quick-resolve-clt', handleQuickResolve);
  }, [employees]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('supervisor-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('supervisor-active-module', activeModule);
  }, [activeModule]);

  const handleModuleChange = (module: 'operacional' | 'rh') => {
    setActiveModule(module);
    if (module === 'rh' && activeTab !== 'equipe' && activeTab !== 'planejamento') {
      setActiveTab('planejamento');
    } else if (module === 'operacional' && (activeTab === 'equipe' || activeTab === 'planejamento')) {
      setActiveTab('escala');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('supervisor-planning-view-mode', planningViewMode);
  }, [planningViewMode]);

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
    setErrorMessage(null);

    const payload: ServicePayload = {
      nome: newServiceName,
      preco: newServicePrice,
      duracao: newServiceDuration,
      icone: newServiceIcon,
      descricao: newServiceDescription,
      modoElegibilidade: serviceEligibilityMode,
      categoria: newServiceCategoria,
      tempoHigienizacaoMin: newServiceTempoHigienizacao,
      comissaoPercentual: newServiceComissao,
      cargosPermitidos: serviceEligibilityMode === 'cargo' ? normalizeRuleList(serviceAllowedCargosInput) : [],
      habilidadesPermitidas: serviceEligibilityMode === 'habilidade' ? normalizeRuleList(serviceAllowedSkillsInput) : [],
      profissionaisPermitidos: serviceEligibilityMode === 'profissional' ? normalizeRuleList(serviceAllowedProfessionalsInput) : [],
    };

    try {
      let success;
      if (editingServiceId) {
        success = await onEditService(editingServiceId, payload);
      } else {
        success = await onAddService(payload);
      }

      if (typeof success === 'string') {
        setErrorMessage(success);
        return;
      }

      if (success === false) {
        setErrorMessage('Não foi possível salvar o serviço. Tente novamente.');
        return;
      }

      setToastMessage(editingServiceId ? 'Serviço atualizado com sucesso!' : 'Serviço adicionado ao menu!');
      cancelServiceEdit();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao salvar serviço.');
    }
  };

  const cancelServiceEdit = () => {
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDuration('60');
    setNewServiceIcon(SERVICE_ICONS[0]);
    setNewServiceDescription('');
    setServiceEligibilityMode('livre');
    setNewServiceCategoria('');
    setNewServiceTempoHigienizacao('0');
    setNewServiceComissao('');
    setServiceAllowedCargosInput('');
    setServiceAllowedSkillsInput('');
    setServiceAllowedProfessionalsInput('');
  };

  const todayStr = getLocalTodayString();

  const filteredServices = useMemo(() => {
    const search = normalizeServiceSearch(deferredServiceSearchTerm);
    if (!search) return services;

    return services.filter((service) => {
      return [service.nome, service.descricao, service.icone]
        .filter(Boolean)
        .some((value) => normalizeServiceSearch(String(value)).includes(search));
    });
  }, [services, deferredServiceSearchTerm]);

  const availableCargos = useMemo(() => Array.from(new Set(employees
    .map((employee) => (employee.cargo || employee.specialty || '').trim())
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b)), [employees]);

  const availableSkills = useMemo(() => Array.from(new Set(employees
    .flatMap((employee) => Array.isArray(employee.habilidades) ? employee.habilidades : [])
    .map((skill) => String(skill).trim())
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b)), [employees]);

  const availableProfessionals = useMemo(() => Array.from(new Set(employees
    .filter((emp) => emp.id !== 'admin')
    .map((employee) => (employee.name || '').trim())
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b)), [employees]);

  const { viewingEmployeeRevenue, viewingEmployeeNoShows } = useMemo(() => {
    if (!viewingEmployee) return { viewingEmployeeRevenue: 0, viewingEmployeeNoShows: 0 };
    
    const servicePriceMap = new Map(services.map(s => [s.nome, Number(s.preco) || 0]));
    let revenue = 0;
    let noShows = 0;
    for (const app of appointments) {
      if (app.assignedEmployeeId !== viewingEmployee.id) continue;
      if (app.status === 'completed') revenue += app.services.reduce((acc, sName) => acc + (servicePriceMap.get(sName) || 0), 0);
      else if (app.status === 'scheduled' && app.date < todayStr) noShows += 1;
    }
    return { viewingEmployeeRevenue: revenue, viewingEmployeeNoShows: noShows };
  }, [viewingEmployee, appointments, services]);

  const activeNonAdminEmployees = useMemo(
    () => employees.filter((emp) => emp.id !== 'admin'),
    [employees],
  );

  const effectiveSelectedScaleEmployeeId = useMemo(
    () => selectedScaleEmployeeId || activeNonAdminEmployees[0]?.id || '',
    [selectedScaleEmployeeId, activeNonAdminEmployees],
  );

  const selectedScaleEmployee = useMemo(
    () => activeNonAdminEmployees.find((emp) => emp.id === effectiveSelectedScaleEmployeeId) || null,
    [activeNonAdminEmployees, effectiveSelectedScaleEmployeeId],
  );

  useEffect(() => {
    if (!selectedScaleEmployee) return;
    setPlanningScaleType(selectedScaleEmployee.tipoEscala || '6x1');
    setPlanningSundayOffs(selectedScaleEmployee.folgasDomingoNoMes ?? 2);
  }, [selectedScaleEmployee]);

  const splitTurno = (turno?: string) => {
    if (!turno || !turno.includes('-')) {
      return { horaInicio: undefined as string | undefined, horaFim: undefined as string | undefined };
    }
    const [horaInicio, horaFim] = turno.split('-');
    return {
      horaInicio: horaInicio || undefined,
      horaFim: horaFim || undefined,
    };
  };

  const applyOverrideToDia = useCallback((employeeId: string, dia: DiaEscala): DiaEscala => {
    const override = planningOverrides[`${employeeId}:${dia.data}`];
    if (!override) return dia;

    if (!isValidScaleDayType(override.tipo)) {
      return dia;
    }

    const { horaInicio, horaFim } = splitTurno(override.turno);
    if (override.tipo !== 'trabalho') {
      return {
        ...dia,
        tipo: override.tipo,
        turno: undefined,
        horaInicio: undefined,
        horaFim: undefined,
        descricao: override.descricao ?? dia.descricao,
      };
    }

    return {
      ...dia,
      tipo: override.tipo,
      turno: override.turno || dia.turno,
      horaInicio: horaInicio || dia.horaInicio,
      horaFim: horaFim || dia.horaFim,
      descricao: override.descricao ?? dia.descricao,
    };
  }, [planningOverrides]);

  const buildScaleForEmployee = useCallback((employeeId: string, options?: {
    tipoEscala?: Employee['tipoEscala'];
    folgasDomingoNoMes?: number;
  }) => {
    const employee = activeNonAdminEmployees.find((emp) => emp.id === employeeId);
    if (!employee) return [] as DiaEscala[];

    const [yearRaw, monthRaw] = selectedScaleMonth.split('-').map(Number);
    const year = yearRaw || new Date().getFullYear();
    const month = monthRaw || new Date().getMonth() + 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();

    const diasBase = gerarEscala(
      {
        tipo: options?.tipoEscala || employee.tipoEscala || '6x1',
        dataInicio: firstDay,
      },
      daysInMonth,
    );

    const diasComDomingo = aplicarFolgasDomingoNoMes(
      diasBase,
      options?.folgasDomingoNoMes ?? employee.folgasDomingoNoMes ?? 2,
    );

    return diasComDomingo.map((dia) => applyOverrideToDia(employeeId, dia));
  }, [activeNonAdminEmployees, applyOverrideToDia, selectedScaleMonth]);

  const selectedScaleCalendar = useMemo(() => {
    if (!selectedScaleEmployee) {
      return { year: 0, month: 0, dias: [] as DiaEscala[] };
    }

    const [yearRaw, monthRaw] = selectedScaleMonth.split('-').map(Number);
    const year = yearRaw || new Date().getFullYear();
    const month = monthRaw || new Date().getMonth() + 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();

    return {
      year,
      month,
      dias: buildScaleForEmployee(selectedScaleEmployee.id, {
        tipoEscala: planningScaleType || selectedScaleEmployee.tipoEscala || '6x1',
        folgasDomingoNoMes: planningSundayOffs,
      }),
    };
  }, [buildScaleForEmployee, planningScaleType, planningSundayOffs, selectedScaleEmployee, selectedScaleMonth]);

  const selectedScaleMonthLabel = useMemo(() => {
    const [yearRaw, monthRaw] = selectedScaleMonth.split('-').map(Number);
    const safeYear = Number.isFinite(yearRaw) ? yearRaw : new Date().getFullYear();
    const safeMonth = Number.isFinite(monthRaw) ? monthRaw : new Date().getMonth() + 1;
    const label = new Date(safeYear, Math.max(0, safeMonth - 1), 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedScaleMonth]);

  const changeScaleMonthBy = useCallback((offset: number) => {
    setSelectedScaleMonth((current) => {
      const [yearRaw, monthRaw] = current.split('-').map(Number);
      const safeYear = Number.isFinite(yearRaw) ? yearRaw : new Date().getFullYear();
      const safeMonth = Number.isFinite(monthRaw) ? monthRaw : new Date().getMonth() + 1;
      const next = new Date(safeYear, safeMonth - 1 + offset, 1);
      return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  const openPlanningMonthPicker = useCallback(() => {
    const input = planningMonthInputRef.current;
    if (!input) return;

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
      return;
    }

    input.click();
  }, []);

  const timelineEmployees = useMemo(() => {
    const search = employeeSearchTerm.trim().toLowerCase();

    return activeNonAdminEmployees.filter((emp) => {
      if (filterRole !== 'all' && emp.cargo !== filterRole) return false;
      if (filterStatus === 'folgaHoje') {
        const diaHoje = buildScaleForEmployee(emp.id).find((dia) => dia.data === todayStr);
        if (diaHoje?.tipo !== 'folga') return false;
      }

      if (search) {
        const composite = `${emp.name} ${emp.cargo || ''} ${emp.specialty || ''}`.toLowerCase();
        if (!composite.includes(search)) return false;
      }

      return true;
    });
  }, [activeNonAdminEmployees, buildScaleForEmployee, employeeSearchTerm, filterRole, filterStatus, todayStr]);

  const filteredScaleGeneratorEmployees = useMemo(() => {
    const search = scaleGeneratorSearch.trim().toLowerCase();
    if (!search) return activeNonAdminEmployees;
    return activeNonAdminEmployees.filter((emp) => {
      const composite = `${emp.name} ${emp.cargo || ''} ${emp.specialty || ''}`.toLowerCase();
      return composite.includes(search);
    });
  }, [activeNonAdminEmployees, scaleGeneratorSearch]);

  const handleOpenScaleGenerator = () => {
    const baseEmployee = activeNonAdminEmployees.find((emp) => emp.id === effectiveSelectedScaleEmployeeId)
      || activeNonAdminEmployees[0]
      || null;

    if (!baseEmployee) {
      setErrorMessage('Nenhum colaborador disponível para gerar escala.');
      return;
    }

    setScaleGeneratorEmployeeId(baseEmployee.id);
    setScaleGeneratorMonth(selectedScaleMonth);
    setScaleGeneratorType(baseEmployee.tipoEscala || '6x1');
    setScaleGeneratorSundayOffs(baseEmployee.folgasDomingoNoMes ?? 2);
    setScaleGeneratorCoverageTarget(planningCoverageTarget);
    setScaleGeneratorSundayFrequency(planningSundayFrequency);
    setScaleGeneratorSearch('');
    setIsScaleGeneratorOpen(true);
  };

  useEffect(() => {
    if (!isScaleGeneratorOpen) return;
    const employee = activeNonAdminEmployees.find((emp) => emp.id === scaleGeneratorEmployeeId);
    if (!employee) return;
    setScaleGeneratorType(employee.tipoEscala || '6x1');
    setScaleGeneratorSundayOffs(employee.folgasDomingoNoMes ?? 2);
  }, [activeNonAdminEmployees, isScaleGeneratorOpen, scaleGeneratorEmployeeId]);

  const handleGenerateScale = async () => {
    if (!scaleGeneratorEmployeeId || !scaleGeneratorMonth || isSavingPlanning) return;

    setIsSavingPlanning(true);
    try {
      const success = await onEditEmployee(scaleGeneratorEmployeeId, {
        tipoEscala: scaleGeneratorType,
        folgasDomingoNoMes: scaleGeneratorSundayOffs,
      });

      if (typeof success === 'string') {
        setErrorMessage(success);
        return;
      }

      if (success !== false) {
        setSelectedScaleEmployeeId(scaleGeneratorEmployeeId);
        setSelectedScaleMonth(scaleGeneratorMonth);
        setPlanningScaleType(scaleGeneratorType);
        setPlanningSundayOffs(scaleGeneratorSundayOffs);
        setPlanningCoverageTarget(scaleGeneratorCoverageTarget);
        setPlanningSundayFrequency(scaleGeneratorSundayFrequency);
        setIsScaleGeneratorOpen(false);

        setToastMessage('Escala gerada com sucesso.');
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nao foi possivel gerar a escala.');
    } finally {
      setIsSavingPlanning(false);
    }
  };

  const handleTogglePlanningEditMode = () => {
    if (!isPlanningEditMode) {
      setIsPlanningEditMode(true);
      setToastMessage('Modo de edição ativado. Arraste para ajustar a escala.');
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    setIsPlanningEditMode(false);
    setToastMessage('Alterações de grade salvas.');
    setTimeout(() => setToastMessage(null), 2200);
  };

  const applyManualPlanningOverride = useCallback((payload: ScaleOverridePayload, successMessage: string) => {
    const key = `${payload.colaboradorId}:${payload.data}`;

    setPlanningOverrides((prev) => ({
      ...prev,
      [key]: payload,
    }));

    setSuggestedPlanningKeys((prev) => prev.filter((item) => item !== key));

    void (async () => {
      try {
        if (onSaveScaleOverride) {
          const success = await onSaveScaleOverride(payload);
          if (success === false) {
            setToastMessage('Alteração aplicada localmente. Sincronização pendente.');
            setTimeout(() => setToastMessage(null), 2800);
            return;
          }
        }

        setToastMessage(successMessage);
        setTimeout(() => setToastMessage(null), 1800);
      } catch (error) {
        setToastMessage('Alteração aplicada localmente. Falha na sincronização com servidor.');
        setTimeout(() => setToastMessage(null), 3200);
      }
    })();
  }, [onSaveScaleOverride]);

  const handleQuickToggleTimelineDay = useCallback((employeeId: string, day: string, current?: DiaEscala) => {
    const nextType: DiaEscala['tipo'] = current?.tipo === 'trabalho' ? 'folga' : 'trabalho';
    const payload: ScaleOverridePayload = {
      colaboradorId: employeeId,
      data: day,
      tipo: nextType,
      turno: nextType === 'trabalho' ? (current?.turno || '08:00-18:00') : undefined,
      descricao: nextType === 'trabalho' ? 'Ajuste manual rápido' : 'Folga manual rápida',
    };

    applyManualPlanningOverride(payload, `Dia atualizado para ${nextType === 'trabalho' ? 'trabalho' : 'folga'}.`);
  }, [applyManualPlanningOverride]);

  const handleQuickSetTimelineDay = useCallback((employeeId: string, day: string, tipo: DiaEscala['tipo'], turno?: string) => {
    const payload: ScaleOverridePayload = {
      colaboradorId: employeeId,
      data: day,
      tipo,
      turno: tipo === 'trabalho' ? (turno || '08:00-18:00') : undefined,
      descricao: tipo === 'folga' ? 'Folga manual' : `Turno manual (${turno || '08:00-18:00'})`,
    };

    applyManualPlanningOverride(payload, 'Turno ajustado manualmente.');
  }, [applyManualPlanningOverride]);

  const handleSuggestAutomaticScale = useCallback(() => {
    if (timelineEmployees.length === 0) {
      setErrorMessage('Nenhum colaborador disponível para sugerir escala.');
      return;
    }

    const [yearRaw, monthRaw] = selectedScaleMonth.split('-').map(Number);
    const year = yearRaw || new Date().getFullYear();
    const month = monthRaw || new Date().getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const sundayPatternLength = planningSundayFrequency === '1x1' ? 2 : 3;
    const shiftRotation = ['06:00-14:00', '14:00-22:00', '22:00-06:00'];

    const nextSuggested: Record<string, ScaleOverridePayload> = {};
    const suggestedKeys: string[] = [];

    const getProjectedDia = (employeeId: string, date: string) => {
      const key = `${employeeId}:${date}`;
      if (nextSuggested[key]) {
        return {
          tipo: nextSuggested[key].tipo,
          turno: nextSuggested[key].turno,
          descricao: nextSuggested[key].descricao,
        } as DiaEscala;
      }

      return buildScaleForEmployee(employeeId).find((dia) => dia.data === date);
    };

    timelineEmployees.forEach((employee, employeeIndex) => {
      const employeeScale = buildScaleForEmployee(employee.id);
      const sundays = employeeScale.filter((dia) => new Date(`${dia.data}T12:00:00`).getDay() === 0);

      sundays.forEach((dia, sundayIndex) => {
        const shouldRestOnSunday = ((sundayIndex + employeeIndex) % sundayPatternLength) === (sundayPatternLength - 1);
        if (!shouldRestOnSunday) return;

        const key = `${employee.id}:${dia.data}`;
        nextSuggested[key] = {
          colaboradorId: employee.id,
          data: dia.data,
          tipo: 'folga',
          turno: undefined,
          descricao: 'Sugestão automática (regra de domingo)',
        };

        suggestedKeys.push(key);
      });
    });

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${selectedScaleMonth}-${String(day).padStart(2, '0')}`;
      let activeCount = timelineEmployees.reduce((acc, employee) => {
        const projectedDia = getProjectedDia(employee.id, date);
        return acc + ((projectedDia?.tipo || 'trabalho') === 'trabalho' ? 1 : 0);
      }, 0);

      if (activeCount >= planningCoverageTarget) continue;

      const standbyEmployees = timelineEmployees.filter((employee) => {
        const projectedDia = getProjectedDia(employee.id, date);
        return (projectedDia?.tipo || 'trabalho') !== 'trabalho';
      });

      for (let idx = 0; idx < standbyEmployees.length && activeCount < planningCoverageTarget; idx += 1) {
        const employee = standbyEmployees[idx];
        const key = `${employee.id}:${date}`;

        nextSuggested[key] = {
          colaboradorId: employee.id,
          data: date,
          tipo: 'trabalho',
          turno: shiftRotation[(day + idx) % shiftRotation.length],
          descricao: 'Sugestão automática (meta de cobertura)',
        };

        if (!suggestedKeys.includes(key)) suggestedKeys.push(key);
        activeCount += 1;
      }
    }

    setPlanningOverrides((prev) => {
      const next = { ...prev };
      suggestedPlanningKeys.forEach((key) => {
        delete next[key];
      });

      Object.entries(nextSuggested).forEach(([key, override]) => {
        next[key] = override;
      });

      return next;
    });

    setSuggestedPlanningKeys(suggestedKeys);
    setToastMessage(`Sugestão aplicada em ${suggestedKeys.length} dia(s).`);
    setTimeout(() => setToastMessage(null), 2600);
  }, [buildScaleForEmployee, planningCoverageTarget, planningSundayFrequency, selectedScaleMonth, suggestedPlanningKeys, timelineEmployees]);

  const handleConfirmSuggestedScale = useCallback(async () => {
    if (suggestedPlanningKeys.length === 0 || isSavingPlanning) return;

    if (!onSaveScaleOverride) {
      setSuggestedPlanningKeys([]);
      setToastMessage('Escala confirmada localmente.');
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    setIsSavingPlanning(true);
    try {
      let successCount = 0;
      const failedKeys: string[] = [];

      for (const key of suggestedPlanningKeys) {
        const override = planningOverrides[key];
        if (!override) continue;

        try {
          const success = await onSaveScaleOverride(override);
          if (success === false) {
            failedKeys.push(key);
            continue;
          }
          successCount += 1;
        } catch (error) {
          failedKeys.push(key);
        }
      }

      setSuggestedPlanningKeys(failedKeys);

      if (failedKeys.length === 0) {
        setToastMessage(`Escala confirmada (${successCount} ajuste(s) sincronizados).`);
      } else {
        setToastMessage(`Escala parcialmente confirmada. ${failedKeys.length} ajuste(s) pendente(s).`);
      }
      setTimeout(() => setToastMessage(null), 3200);
    } finally {
      setIsSavingPlanning(false);
    }
  }, [isSavingPlanning, onSaveScaleOverride, planningOverrides, suggestedPlanningKeys]);

  const cltRealtimeAlerts = useMemo(() => {
    return activeNonAdminEmployees
      .map((emp) => {
        const malha = buildScaleForEmployee(emp.id);
        const analise = analisarConformidadeCLT(malha);

        return {
          id: emp.id,
          nome: emp.name,
          conforme: analise.statusGeral,
          resumo: analise.resumo,
        };
      })
      .filter((item) => !item.conforme);
  }, [activeNonAdminEmployees, buildScaleForEmployee]);

  const pendingTurnoSwapRequests = useMemo(
    () => turnoSwapRequests.filter((request) => request.status === 'pendente'),
    [turnoSwapRequests],
  );

  const visibleCltToastAlerts = useMemo(
    () => cltRealtimeAlerts.filter((alerta) => !dismissedCltAlertIds[alerta.id]),
    [cltRealtimeAlerts, dismissedCltAlertIds],
  );

  useEffect(() => {
    const activeIds = new Set(cltRealtimeAlerts.map((alerta) => alerta.id));

    setDismissedCltAlertIds((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};

      Object.keys(prev).forEach((id) => {
        if (activeIds.has(id)) {
          next[id] = prev[id];
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    Object.keys(cltAlertTimersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        clearTimeout(cltAlertTimersRef.current[id]);
        delete cltAlertTimersRef.current[id];
      }
    });
  }, [cltRealtimeAlerts]);

  useEffect(() => {
    visibleCltToastAlerts.forEach((alerta) => {
      if (cltAlertTimersRef.current[alerta.id]) return;

      cltAlertTimersRef.current[alerta.id] = setTimeout(() => {
        setDismissedCltAlertIds((prev) => ({ ...prev, [alerta.id]: true }));
        const timer = cltAlertTimersRef.current[alerta.id];
        if (timer) {
          clearTimeout(timer);
          delete cltAlertTimersRef.current[alerta.id];
        }
      }, 8000);
    });
  }, [visibleCltToastAlerts]);

  useEffect(() => {
    return () => {
      Object.keys(cltAlertTimersRef.current).forEach((id) => {
        clearTimeout(cltAlertTimersRef.current[id]);
      });
      cltAlertTimersRef.current = {};
    };
  }, []);

  const handleUpdateSwapStatus = async (id: string, status: Exclude<TurnoSwapStatus, 'pendente'>) => {
    if (!onUpdateTurnoSwapRequestStatus) return;

    const success = await onUpdateTurnoSwapRequestStatus(id, status);
    if (success !== false) {
      setToastMessage(`Solicitacao ${status === 'aprovada' ? 'aprovada' : 'rejeitada'} com sucesso.`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
                <h1 className="text-2xl md:text-3xl font-headline text-primary">
                  {activeModule === 'operacional' ? 'Portal do Supervisor' : 'Módulo de RH e Escalas'}
                </h1>
                <p className="text-sm text-on-surface-variant font-body">
                  {activeModule === 'operacional' 
                    ? (activeTab === 'escala' ? 'Agenda operacional da recepção em tempo real.' : 'Gestão operacional do Spa com foco em produtividade e qualidade.') 
                    : 'Gestão da equipe, controle de ponto e jornadas contratuais.'}
                </p>
          </div>
              
              {/* Botão de Navegação entre Módulos (Simula a troca de página) */}
              {activeModule === 'operacional' ? (
                <button onClick={() => handleModuleChange('rh')} className="bg-primary-container text-on-primary-container px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  Acessar Módulo RH
                </button>
              ) : (
                <button onClick={() => handleModuleChange('operacional')} className="bg-surface-container-high text-on-surface px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-surface-container-highest transition-colors shadow-sm border border-outline-variant/20">
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Voltar para Operação
                </button>
              )}
        </div>

        <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/20 overflow-x-auto max-w-full w-full md:w-auto">
              {activeModule === 'operacional' ? (
                <>
                  <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}>Dashboard</button>
                  <button onClick={() => setActiveTab('escala')} className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'escala' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}>Agenda</button>
                  <button onClick={() => setActiveTab('servicos')} className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'servicos' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}>Serviços</button>
                  <button onClick={() => setActiveTab('clientes')} className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'clientes' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}>Clientes</button>
                </>
              ) : (
                <>
                  <button onClick={() => setActiveTab('planejamento')} className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'planejamento' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}>Grade de Escalas</button>
                  <button onClick={() => setActiveTab('equipe')} className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase whitespace-nowrap transition-all ${activeTab === 'equipe' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary'}`}>Profissionais e Cargos</button>
                </>
              )}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <SupervisorDashboardTab
          appointments={appointments}
          services={services}
          employees={employees}
        />
      )}

      {activeTab === 'escala' && (
        <div className="space-y-8">
          <SupervisorEscalaTab
            employees={employees}
            appointments={appointments}
            services={services}
            clients={clients}
            scaleOverrides={planningOverridesList}
            onOpenUpcomingAppointments={onOpenUpcomingAppointments}
            onReassignAppointment={onReassign}
            onAddAppointment={onAddAppointment}
            isAddingAppointment={isAddingAppointment}
            onDeleteAppointment={onDeleteAppointment}
            onEditAppointment={onEditAppointment}
            onCompleteAppointment={onCompleteAppointment}
            onEditClient={onEditClient}
            onAddBloqueio={onAddBloqueio}
            onDeleteBloqueio={onDeleteBloqueio}
            setToastMessage={setToastMessage}
            setErrorMessage={setErrorMessage}
          />
        </div>
      )}

      {activeTab === 'planejamento' && (
        <SupervisorPlanejamentoTab
          employees={employees}
          appointments={appointments}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          changeScaleMonthBy={changeScaleMonthBy}
          openPlanningMonthPicker={openPlanningMonthPicker}
          selectedScaleMonthLabel={selectedScaleMonthLabel}
          planningMonthInputRef={planningMonthInputRef}
          selectedScaleMonth={selectedScaleMonth}
          setSelectedScaleMonth={setSelectedScaleMonth}
          planningViewMode={planningViewMode}
          setPlanningViewMode={setPlanningViewMode}
          employeeSearchTerm={employeeSearchTerm}
          setEmployeeSearchTerm={setEmployeeSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          handleTogglePlanningEditMode={handleTogglePlanningEditMode}
          isPlanningEditMode={isPlanningEditMode}
          handleOpenScaleGenerator={handleOpenScaleGenerator}
          handleSuggestAutomaticScale={handleSuggestAutomaticScale}
          suggestedPlanningKeys={suggestedPlanningKeys}
          handleConfirmSuggestedScale={handleConfirmSuggestedScale}
          isSavingPlanning={isSavingPlanning}
          showTopAlerts={showTopAlerts}
          setShowTopAlerts={setShowTopAlerts}
          visibleCltToastAlerts={visibleCltToastAlerts}
          pendingTurnoSwapRequests={pendingTurnoSwapRequests}
          handleUpdateSwapStatus={handleUpdateSwapStatus}
          setDismissedCltAlertIds={setDismissedCltAlertIds}
          selectedScaleEmployee={selectedScaleEmployee}
          selectedScaleCalendar={selectedScaleCalendar}
          setSelectedPlanningEmployeeId={setSelectedPlanningEmployeeId}
          setSelectedPlanningDay={setSelectedPlanningDay}
          setIsPopoverOpen={setIsPopoverOpen}
          onSwapScaleDays={onSwapScaleDays}
          setPlanningOverrides={setPlanningOverrides}
          setToastMessage={setToastMessage}
          timelineEmployees={timelineEmployees}
          handleQuickToggleTimelineDay={handleQuickToggleTimelineDay}
          handleQuickSetTimelineDay={handleQuickSetTimelineDay}
          planningOverridesList={planningOverridesList}
          buildScaleForEmployee={buildScaleForEmployee}
          onReplicateScaleDays={onReplicateScaleDays}
          planningCoverageTarget={planningCoverageTarget}
          isPopoverOpen={isPopoverOpen}
          selectedPlanningDay={selectedPlanningDay}
          selectedPlanningEmployeeId={selectedPlanningEmployeeId}
          splitTurno={splitTurno}
          onSaveScaleOverride={onSaveScaleOverride}
          isScaleGeneratorOpen={isScaleGeneratorOpen}
          setIsScaleGeneratorOpen={setIsScaleGeneratorOpen}
          filteredScaleGeneratorEmployees={filteredScaleGeneratorEmployees}
          scaleGeneratorSearch={scaleGeneratorSearch}
          setScaleGeneratorSearch={setScaleGeneratorSearch}
          scaleGeneratorEmployeeId={scaleGeneratorEmployeeId}
          setScaleGeneratorEmployeeId={setScaleGeneratorEmployeeId}
          scaleGeneratorMonth={scaleGeneratorMonth}
          setScaleGeneratorMonth={setScaleGeneratorMonth}
          scaleGeneratorType={scaleGeneratorType}
          setScaleGeneratorType={setScaleGeneratorType}
          scaleGeneratorSundayOffs={scaleGeneratorSundayOffs}
          setScaleGeneratorSundayOffs={setScaleGeneratorSundayOffs}
          scaleGeneratorCoverageTarget={scaleGeneratorCoverageTarget}
          setScaleGeneratorCoverageTarget={setScaleGeneratorCoverageTarget}
          scaleGeneratorSundayFrequency={scaleGeneratorSundayFrequency}
          setScaleGeneratorSundayFrequency={setScaleGeneratorSundayFrequency}
          handleGenerateScale={handleGenerateScale}
          setSelectedScaleEmployeeId={setSelectedScaleEmployeeId}
        />
      )}

      {activeTab === 'equipe' && (
        <SupervisorEquipeTab
          employees={employees}
          onAddEmployee={onAddEmployee}
          onDeleteEmployee={onDeleteEmployee}
          onEditEmployee={onEditEmployee}
          onSaveScaleOverride={onSaveScaleOverride}
          setToastMessage={setToastMessage}
          setErrorMessage={setErrorMessage}
          onViewEmployee={setViewingEmployee}
        />
      )}

      {/* NOVA ABA: MENU DE SERVIÇOS (Inspirada no HTML enviado) */}
      {activeTab === 'servicos' && (
        <SupervisorServicosTab
          services={services}
          filteredServices={filteredServices}
          serviceSearchTerm={serviceSearchTerm}
          setServiceSearchTerm={setServiceSearchTerm}
          editingServiceId={editingServiceId}
          cancelServiceEdit={cancelServiceEdit}
          handleServiceSubmit={handleServiceSubmit}
          formatDuration={formatDuration}
          getEligibilitySummary={getEligibilitySummary}
          onEditServiceCard={(srv) => {
            setEditingServiceId(srv.id);
            setNewServiceName(srv.nome);
            setNewServicePrice(String(srv.preco));
            setNewServiceDuration(String(srv.duracao || 60));
            setNewServiceIcon(srv.icone || SERVICE_ICONS[0]);
            setNewServiceDescription(srv.descricao || '');
            setServiceEligibilityMode(srv.modoElegibilidade || 'livre');
            setNewServiceCategoria(srv.categoria || '');
            setNewServiceTempoHigienizacao(String(srv.tempoHigienizacaoMin || 0));
            setNewServiceComissao(srv.comissaoPercentual !== undefined && srv.comissaoPercentual !== null ? String(srv.comissaoPercentual) : '');
            setServiceAllowedCargosInput((srv.cargosPermitidos || []).join(', '));
            setServiceAllowedSkillsInput((srv.habilidadesPermitidas || []).join(', '));
            setServiceAllowedProfessionalsInput((srv.profissionaisPermitidos || []).join(', '));
          }}
          onDeleteServiceCard={setServiceToDelete}
          serviceIcons={SERVICE_ICONS}
          newServiceIcon={newServiceIcon}
          setNewServiceIcon={setNewServiceIcon}
          newServiceName={newServiceName}
          setNewServiceName={setNewServiceName}
          newServicePrice={newServicePrice}
          setNewServicePrice={setNewServicePrice}
          newServiceDuration={newServiceDuration}
          setNewServiceDuration={setNewServiceDuration}
          serviceEligibilityMode={serviceEligibilityMode}
          setServiceEligibilityMode={setServiceEligibilityMode}
          newServiceCategoria={newServiceCategoria}
          setNewServiceCategoria={setNewServiceCategoria}
          newServiceTempoHigienizacao={newServiceTempoHigienizacao}
          setNewServiceTempoHigienizacao={setNewServiceTempoHigienizacao}
          newServiceComissao={newServiceComissao}
          setNewServiceComissao={setNewServiceComissao}
          serviceAllowedCargosInput={serviceAllowedCargosInput}
          setServiceAllowedCargosInput={setServiceAllowedCargosInput}
          serviceAllowedSkillsInput={serviceAllowedSkillsInput}
          setServiceAllowedSkillsInput={setServiceAllowedSkillsInput}
          serviceAllowedProfessionalsInput={serviceAllowedProfessionalsInput}
          setServiceAllowedProfessionalsInput={setServiceAllowedProfessionalsInput}
          availableCargos={availableCargos}
          availableSkills={availableSkills}
          availableProfessionals={availableProfessionals}
          appendRuleToken={appendRuleToken}
          newServiceDescription={newServiceDescription}
          setNewServiceDescription={setNewServiceDescription}
        />
      )}

      {activeTab === 'clientes' && (
        <SupervisorClientesTab
          clients={clients}
          appointments={appointments}
          services={services}
          onEditClient={onEditClient}
          onDeleteClient={onDeleteClient}
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

          {cltRealtimeAlerts.find(a => a.id === viewingEmployee.id) && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl mb-6 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
              <div>
                <h4 className="text-sm font-bold text-amber-600 uppercase tracking-widest">Alerta de Conformidade CLT</h4>
                <p className="text-xs text-amber-700/80 mt-1">{cltRealtimeAlerts.find(a => a.id === viewingEmployee.id)?.resumo.join(' | ')}</p>
              </div>
            </div>
          )}

          <div className="flex gap-6 mb-6 border-b border-outline-variant/20">
            <button onClick={() => setViewingEmployeeTab('dashboard')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors ${viewingEmployeeTab === 'dashboard' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Dashboard</button>
            <button onClick={() => setViewingEmployeeTab('jornada')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors ${viewingEmployeeTab === 'jornada' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Regras de Jornada</button>
            <button onClick={() => setViewingEmployeeTab('ocorrencias')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors ${viewingEmployeeTab === 'ocorrencias' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>Ocorrências (RH)</button>
          </div>

          {viewingEmployeeTab === 'dashboard' && (
            <>
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
                  onChange={(e) => setHistoryFilter(e.target.value as 'all' | '7days' | 'month')}
                  className="bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">Todo o período</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="month">Este mês</option>
                </select>
              </div>
              
              <div className="overflow-y-auto grow border border-outline-variant/10 rounded-2xl">
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
                            {app.specialNeeds && app.specialNeeds.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 cursor-help" title={app.observation ? `Observações: ${app.observation}` : 'Nenhuma observação detalhada.'}>
                                {app.specialNeeds.map((need: string) => (
                                  <span key={need} className="bg-error/10 text-error text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest flex items-center gap-0.5 w-fit">
                                    <span className="material-symbols-outlined text-[9px]">medical_services</span>
                                    {need}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-on-surface-variant max-w-37.5 truncate" title={app.services.join(', ')}>{app.services.join(', ')}</td>
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
            </>
          )}

          {viewingEmployeeTab === 'jornada' && (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="text-lg font-headline text-primary mb-4">Configuração Contratual</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Padrão de Escala</p>
                  <p className="text-xl font-headline text-on-surface">{viewingEmployee.tipoEscala || '6x1'}</p>
                </div>
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Folgas Dominicais (Mês)</p>
                  <p className="text-xl font-headline text-on-surface">{viewingEmployee.folgasDomingoNoMes ?? 2} domingos</p>
                </div>
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Carga Horária Base</p>
                  <p className="text-xl font-headline text-on-surface">{viewingEmployee.cargaHorariaSemanal ?? 44}h / semana</p>
                </div>
              </div>
            </div>
          )}

          {viewingEmployeeTab === 'ocorrencias' && (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-headline text-primary">Histórico de Ocorrências</h3>
                <span className="text-xs text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-bold uppercase tracking-widest">{viewingEmployee.bloqueios?.length || 0} registros</span>
              </div>
              {(!viewingEmployee.bloqueios || viewingEmployee.bloqueios.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-outline-variant/20 rounded-2xl border-dashed">
                  <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">task_alt</span>
                  <p className="text-sm font-bold text-on-surface-variant">Dossiê Limpo</p>
                  <p className="text-xs text-on-surface-variant/70">Nenhuma falta, atestado ou férias registrados recentemente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {viewingEmployee.bloqueios.map(bloq => (
                    <div key={bloq.id} className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bloq.motivo.toLowerCase().includes('falta') ? 'bg-error/10 text-error' : 'bg-secondary-container text-secondary'}`}>
                          <span className="material-symbols-outlined">{bloq.motivo.toLowerCase().includes('falta') ? 'person_off' : 'event_busy'}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{bloq.motivo}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">{bloq.horaInicio} às {bloq.horaFim}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface">{bloq.data.split('-').reverse().join('/')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100 p-4">
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
            className="fixed bottom-8 right-8 bg-surface-container-highest text-on-surface border border-outline-variant/30 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 z-100"
          >
            <span className="material-symbols-outlined text-primary">check_circle</span>
            <p className="text-sm font-bold">{toastMessage}</p>
          </motion.div>
        )}
    </div>
  );
}
