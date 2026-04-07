import { useCallback, useState } from 'react';
import { Appointment } from '../../../types';

interface UseScheduleModalsOptions {
  defaultEmployeeId?: string;
}

interface ScheduleModalsState {
  showNewBookingModal: boolean;
  showNewBlockModal: boolean;
  editingAppointment: Appointment | null;
  appointmentToDelete: string | null;
  initialBookTime: string;
  initialBookEmp: string;
}

export function useScheduleModals(options?: UseScheduleModalsOptions) {
  const defaultEmployeeId = options?.defaultEmployeeId || '';

  const [state, setState] = useState<ScheduleModalsState>({
    showNewBookingModal: false,
    showNewBlockModal: false,
    editingAppointment: null,
    appointmentToDelete: null,
    initialBookTime: '',
    initialBookEmp: defaultEmployeeId,
  });

  const openBookingModal = useCallback((time = '', empId = defaultEmployeeId) => {
    setState(prev => ({
      ...prev,
      showNewBookingModal: true,
      initialBookTime: time,
      initialBookEmp: empId,
    }));
  }, [defaultEmployeeId]);

  const closeBookingModal = useCallback(() => {
    setState(prev => ({ ...prev, showNewBookingModal: false }));
  }, []);

  const openBlockModal = useCallback((time = '', empId = defaultEmployeeId) => {
    setState(prev => ({
      ...prev,
      showNewBlockModal: true,
      initialBookTime: time,
      initialBookEmp: empId,
    }));
  }, [defaultEmployeeId]);

  const closeBlockModal = useCallback(() => {
    setState(prev => ({ ...prev, showNewBlockModal: false }));
  }, []);

  const openEditAppointmentModal = useCallback((appointment: Appointment) => {
    setState(prev => ({ ...prev, editingAppointment: appointment }));
  }, []);

  const closeEditAppointmentModal = useCallback(() => {
    setState(prev => ({ ...prev, editingAppointment: null }));
  }, []);

  const openDeleteAppointmentModal = useCallback((appointmentId: string) => {
    setState(prev => ({ ...prev, appointmentToDelete: appointmentId }));
  }, []);

  const closeDeleteAppointmentModal = useCallback(() => {
    setState(prev => ({ ...prev, appointmentToDelete: null }));
  }, []);

  return {
    state,
    openBookingModal,
    closeBookingModal,
    openBlockModal,
    closeBlockModal,
    openEditAppointmentModal,
    closeEditAppointmentModal,
    openDeleteAppointmentModal,
    closeDeleteAppointmentModal,
  };
}
