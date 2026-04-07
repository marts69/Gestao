import React, { useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { isApiError } from '../../../api';

export interface DeleteAppointmentModalProps {
  appointmentId: string;
  onClose: () => void;
  onDeleteAppointment?: (id: string) => Promise<boolean | void> | void;
  setToastMessage: (msg: string | null) => void;
  setErrorMessage?: (msg: string | null) => void;
}

export function DeleteAppointmentModal({ appointmentId, onClose, onDeleteAppointment, setToastMessage, setErrorMessage }: DeleteAppointmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (onDeleteAppointment) await onDeleteAppointment(appointmentId);
      setToastMessage('Cancelado!');
      setTimeout(() => setToastMessage(null), 3000);
      onClose();
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        setToastMessage('Este agendamento sofreu atualizacao recente e nao existe mais.');
        setTimeout(() => setToastMessage(null), 3500);
        onClose();
        return;
      }

      setErrorMessage?.(error instanceof Error ? error.message : 'Nao foi possivel cancelar o agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConfirmDialog
      open={true}
      title="Cancelar Reserva?"
      confirmLabel="Cancelar"
      confirmingLabel="Cancelando..."
      cancelLabel="Voltar"
      icon="event_busy"
      isSubmitting={isSubmitting}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  );
}