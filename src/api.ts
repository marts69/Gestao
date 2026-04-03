import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Appointment, Bloqueio, Client, Employee, Service } from './types';
import { getApiUrl } from './config/api';

const logFrontendApiError = (context: {
  endpoint: string;
  method: string;
  status?: number;
  requestId?: string | null;
  responseBody?: unknown;
  error?: unknown;
}) => {
  console.error('[FRONTEND][API_ERROR]', context);
};

const fetchApi = async (url: string, token: string | null, options: RequestInit = {}) => {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${url}`, { ...options, headers });
  } catch (error) {
    logFrontendApiError({
      endpoint: url,
      method,
      error,
    });
    throw error;
  }

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    const errorData = await response.json().catch(() => null);
    const message = errorData?.message || errorData?.erro || 'Erro na requisição com o servidor';

    logFrontendApiError({
      endpoint: url,
      method,
      status: response.status,
      requestId,
      responseBody: errorData,
    });

    throw new Error(requestId ? `${message} (requestId: ${requestId})` : message);
  }

  return response.json();
};

interface BackendAppointment {
  id: string | number;
  data?: string;
  date?: string;
  time?: string;
  services?: string[];
  servicos?: Array<string | { nome?: string }>;
  cliente?: { id?: string | number; nome?: string; telefone?: string; cpf?: string };
  clientName?: string;
  contact?: string;
  cpf?: string;
  guests?: number;
  specialNeeds?: string[];
  observation?: string;
  assignedEmployeeId?: string;
  colaboradorId?: string;
  status?: 'scheduled' | 'completed';
}

interface BackendEmployee {
  id: string | number;
  name?: string;
  nome?: string;
  email?: string;
  role?: string;
  papel?: string;
  specialty?: string;
  especialidade?: string;
  avatar?: string;
  rating?: number;
  completedServices?: number;
  diasTrabalho?: string;
  bloqueios?: Employee['bloqueios'];
}

const normalizeAppointment = (appointment: BackendAppointment): Appointment => {
  const dateFromBackend = appointment.data ? new Date(appointment.data) : null;
  const brazilDate = dateFromBackend
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dateFromBackend)
    : '';
  const brazilTime = dateFromBackend
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(dateFromBackend)
    : '';

  const services = Array.isArray(appointment.services)
    ? appointment.services
    : Array.isArray(appointment.servicos)
      ? appointment.servicos.map((service) => typeof service === 'string' ? service : service.nome || '').filter(Boolean)
      : [];

  return {
    id: String(appointment.id),
    clientId: appointment.cliente?.id ? String(appointment.cliente.id) : undefined,
    clientName: appointment.clientName || appointment.cliente?.nome || '',
    contact: appointment.contact || appointment.cliente?.telefone || 'Não informado',
    cpf: appointment.cpf || appointment.cliente?.cpf || undefined,
    services,
    date: typeof appointment.date === 'string'
      ? appointment.date
      : brazilDate,
    time: appointment.time || brazilTime,
    guests: appointment.guests ?? 1,
    specialNeeds: appointment.specialNeeds ?? [],
    observation: appointment.observation ?? '',
    assignedEmployeeId: appointment.assignedEmployeeId || appointment.colaboradorId || '',
    status: appointment.status || 'scheduled',
  };
};

const normalizeEmployee = (employee: BackendEmployee): Employee => {
  const name = employee.name || employee.nome || 'Usuário';
  const specialty = employee.specialty || employee.especialidade || '';
  const role = employee.role || employee.papel || 'collaborator';

  return {
    id: String(employee.id),
    name,
    email: employee.email || '',
    role: role === 'supervisor' ? 'supervisor' : 'collaborator',
    specialty,
    avatar: employee.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}`,
    rating: Number(employee.rating) || 5,
    completedServices: Number(employee.completedServices) || 0,
    diasTrabalho: employee.diasTrabalho || '1,2,3,4,5,6',
    bloqueios: Array.isArray(employee.bloqueios) ? employee.bloqueios : [],
  };
};

// Tipos para os dados de mutação
type NewAppointmentPayload = Omit<Appointment, 'id' | 'status'>;
type EditAppointmentPayload = Partial<Appointment> & { id: string };
type NewEmployeePayload = Omit<Employee, 'id' | 'rating' | 'completedServices' | 'bloqueios' | 'avatar'> & { avatar?: string };
type EditEmployeePayload = Partial<Employee> & { id: string };
type NewServicePayload = Omit<Service, 'id'>;
type NewBloqueioPayload = Omit<Bloqueio, 'id'>;

// =======================
// AGENDAMENTOS
// =======================
export const useAppointments = (token: string | null) => useQuery({
  queryKey: ['appointments'],
  queryFn: async () => {
    const appointments = await fetchApi('/agendamentos', token);
    return Array.isArray(appointments) ? appointments.map(normalizeAppointment) : [];
  },
  enabled: !!token,
});

export const useAddAppointment = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewAppointmentPayload) => fetchApi('/agendamentos', token, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  });
};

export const useCompleteAppointment = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/agendamentos/${id}/concluir`, token, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  });
};

export const useReassignAppointment = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newEmployeeId }: { id: string, newEmployeeId: string }) => 
      fetchApi(`/agendamentos/${id}/reassign`, token, { method: 'PATCH', body: JSON.stringify({ newEmployeeId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  });
};

export const useEditAppointment = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EditAppointmentPayload) => fetchApi(`/agendamentos/${data.id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  });
};

export const useDeleteAppointment = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/agendamentos/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  });
};

// =======================
// COLABORADORES
// =======================
export const useEmployees = (token: string | null) => useQuery({
  queryKey: ['employees'],
  queryFn: async () => {
    const employees = await fetchApi('/colaboradores', token);
    return Array.isArray(employees) ? employees.map(normalizeEmployee) : [];
  },
  enabled: !!token,
});

export const useAddEmployee = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewEmployeePayload) =>
      fetchApi('/colaboradores', token, {
        method: 'POST',
        body: JSON.stringify({
          nome: data.name,
          email: data.email,
          especialidade: data.specialty,
          papel: data.role,
          diasTrabalho: data.diasTrabalho,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] })
  });
};

export const useDeleteEmployee = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reallocateToId }: { id: string, reallocateToId?: string }) => 
      fetchApi(`/colaboradores/${id}`, token, { method: 'DELETE', body: JSON.stringify({ reallocateToId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] })
  });
};

export const useEditEmployee = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EditEmployeePayload) =>
      fetchApi(`/colaboradores/${data.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          nome: data.name,
          email: data.email,
          especialidade: data.specialty,
          papel: data.role,
          diasTrabalho: data.diasTrabalho,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] })
  });
};

// =======================
// SERVIÇOS
// =======================
export const useServices = (token: string | null) => useQuery({
  queryKey: ['services'],
  queryFn: () => fetchApi('/servicos', token),
  enabled: !!token,
});

export const useAddService = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewServicePayload) => fetchApi('/servicos', token, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  });
};

export const useEditService = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Service) => fetchApi(`/servicos/${data.id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  });
};

export const useDeleteService = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/servicos/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] })
  });
};

// =======================
// CLIENTES E BLOQUEIOS
// =======================
export const useClients = (token: string | null) => useQuery({
  queryKey: ['clients'],
  queryFn: () => fetchApi('/clientes', token),
  enabled: !!token,
});

export const useEditClient = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Client> & { id: string }) => fetchApi(`/clientes/${data.id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
  });
};

export const useDeleteClient = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/clientes/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
  });
};

export const useAddBloqueio = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewBloqueioPayload) => fetchApi('/bloqueios', token, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }) // O bloqueio afeta o usuário, então atualizamos employees
  });
};

export const useDeleteBloqueio = (token: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchApi(`/bloqueios/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] })
  });
};