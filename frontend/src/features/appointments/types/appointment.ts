import { Appointment } from '../../../types';

export type AppointmentStatus = Appointment['status'];

// Payload usado no create/update de agendamento no dominio atual da aplicacao.
export interface AppointmentFormData {
  clientName: string;
  contact: string;
  services: string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  guests: number;
  specialNeeds: string[];
  observation?: string;
  assignedEmployeeId: string;
  cpf?: string;
  clientId?: string;
  clientObservation?: string;
}

export interface AppointmentResponse extends AppointmentFormData {
  id: string;
  status: AppointmentStatus;
  createdAt?: string;
  updatedAt?: string;
}
