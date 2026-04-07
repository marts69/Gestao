import { Appointment, Service } from '../../../types';
import { getBrazilCurrentTimeString, getDuration, getLocalTodayString, hasOverlap } from './appointmentCore';
import { SCHEDULE_CONFIG } from '../../../config/scheduleConfig';

type ServiceLike = Pick<Service, 'nome'> & Partial<Pick<Service, 'id' | 'duracao' | 'preco'>>;

interface ValidateAppointmentInput {
  date: string;
  time: string;
  employeeId: string;
  serviceNames: string[];
  appointments: Appointment[];
  services: ServiceLike[];
  ignoreAppointmentId?: string;
}

export function validateAppointmentScheduling(input: ValidateAppointmentInput): string | null {
  const {
    date,
    time,
    employeeId,
    serviceNames,
    appointments,
    services,
    ignoreAppointmentId,
  } = input;

  const minTime = `${String(SCHEDULE_CONFIG.START_HOUR).padStart(2, '0')}:00`;
  const maxTime = `${String(SCHEDULE_CONFIG.END_HOUR).padStart(2, '0')}:00`;

  const todayStr = getLocalTodayString();
  const currentTime = getBrazilCurrentTimeString();
  if (date < todayStr || (date === todayStr && time < currentTime)) {
    return 'Nao e permitido agendar no passado. Escolha uma data/horario futuro.';
  }

  if (time < minTime || time > maxTime) {
    return `Os agendamentos devem respeitar o horario comercial (${minTime} as ${maxTime}).`;
  }

  const [startHour, startMinute] = time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const durationMinutes = getDuration(serviceNames, services);
  const closingMinutes = SCHEDULE_CONFIG.END_HOUR * 60;

  if (startMinutes + durationMinutes > closingMinutes) {
    return `Este agendamento ultrapassa o fechamento as ${maxTime}.`;
  }

  const isOccupied = hasOverlap(
    date,
    time,
    employeeId,
    serviceNames,
    appointments,
    services,
    ignoreAppointmentId || null,
  );

  if (isOccupied) {
    return 'Conflito de Horario.';
  }

  return null;
}
