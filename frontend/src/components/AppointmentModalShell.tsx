import React from 'react';
import { motion } from 'motion/react';

interface AppointmentModalShellProps {
  title: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  submitLabel: string;
  submitDisabled?: boolean;
  isSubmitting?: boolean;
  submittingLabel?: string;
  showSubmitButton?: boolean;
  infoBanner?: React.ReactNode;
  alertBanner?: React.ReactNode;
}

export function AppointmentModalShell({
  title,
  onClose,
  onSubmit,
  children,
  submitLabel,
  submitDisabled = false,
  isSubmitting = false,
  submittingLabel = 'Salvando...',
  showSubmitButton = true,
  infoBanner,
  alertBanner,
}: AppointmentModalShellProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onMouseDown={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-lg w-full border border-outline-variant/20 max-h-[90vh] overflow-y-auto"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline text-primary">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant" type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {infoBanner}
        {alertBanner}
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          {showSubmitButton && (
            <button
              disabled={submitDisabled || isSubmitting}
              type="submit"
              className={`w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all ${(submitDisabled || isSubmitting) ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
}