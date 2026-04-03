export type Role = 'collaborator' | 'supervisor';

export interface Bloqueio {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  motivo: string;
  colaboradorId: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialty: string;
  avatar: string;
  rating: number;
  completedServices: number;
  diasTrabalho?: string;
  bloqueios?: Bloqueio[];
}

export interface Appointment {
  id: string;
  clientId?: string;
  clientName: string;
  contact: string;
  cpf?: string;
  services: string[];
  date: string;
  time: string;
  guests: number;
  specialNeeds: string[];
  observation?: string;
  assignedEmployeeId: string;
  status: 'scheduled' | 'completed';
}

export interface Service {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  icone?: string;
  descricao?: string;
}

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  cpf?: string;
  observacao?: string;
}


export const AVAILABLE_SERVICES = [
  'Massagem Relaxante',
  'Massagem Terapêutica',
  'Limpeza de Pele',
  'Drenagem Linfática',
  'Sessão de Yoga',
  'Aromaterapia'
];

export const SERVICE_DURATIONS: Record<string, number> = {
  'Massagem Relaxante': 60,
  'Massagem Terapêutica': 90,
  'Limpeza de Pele': 45,
  'Drenagem Linfática': 60,
  'Sessão de Yoga': 60,
  'Aromaterapia': 30
};

export const SPECIAL_NEEDS_OPTIONS = [
  'Mobilidade Reduzida'
];
