import React from 'react';
import { motion } from 'motion/react';

interface SuccessViewProps {
  onReset: () => void;
}

export function SuccessView({ onReset }: SuccessViewProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-2xl w-full mx-auto text-center space-y-10 bg-surface-container-lowest p-12 md:p-20 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-outline-variant/10"
    >
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary">spa</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-4xl font-headline text-primary">Agradecemos sua <span className="italic">avaliação</span>.</h2>
        <p className="text-on-surface-variant text-lg font-body leading-relaxed">
          Seu feedback é fundamental para continuarmos oferecendo experiências de bem-estar inesquecíveis. Esperamos recebê-lo novamente em breve.
        </p>
      </div>

      <div className="pt-8 border-t border-outline-variant/20">
        <button 
          onClick={onReset}
          className="text-sm font-bold text-primary uppercase tracking-[0.2em] hover:text-primary-dim transition-colors"
        >
          Voltar para o Início
        </button>
      </div>
    </motion.div>
  );
}
