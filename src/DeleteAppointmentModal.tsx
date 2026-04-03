import React from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';

export interface DeleteAppointmentModalProps {
  appointmentId: string;
  onClose: () => void;
  onDeleteAppointment?: (id: string) => Promise<boolean | void> | void;
  setToastMessage: (msg: string | null) => void;
}

export function DeleteAppointmentModal({ appointmentId, onClose, onDeleteAppointment, setToastMessage }: DeleteAppointmentModalProps) {
  const handleConfirm = async () => {
    if(onDeleteAppointment) await onDeleteAppointment(appointmentId);
    setToastMessage('Cancelado!');
    setTimeout(() => setToastMessage(null), 3000);
    onClose();
  };

  return (
    <ConfirmDialog
      open={true}
      title="Cancelar Reserva?"
      confirmLabel="Cancelar"
      cancelLabel="Voltar"
      icon="event_busy"
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  );
}