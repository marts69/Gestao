export type Role = 'collaborator' | 'supervisor' | 'receptionist';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialty: string;
  avatar: string;
  rating: number;
  completedServices: number;
}

export interface Appointment {
  id: string;
  clientName: string;
  contact: string;
  services: string[];
  date: string;
  time: string;
  guests: number;
  specialNeeds: string[];
  observation?: string;
  assignedEmployeeId: string;
  status: 'scheduled' | 'completed';
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
  'Gravidez',
  'Pressão Alta',
  'Alergias',
  'Mobilidade Reduzida'
];
