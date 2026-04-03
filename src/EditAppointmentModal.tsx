import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Appointment, Employee, Service } from './types';
import { getBrazilCurrentTimeString, getLocalTodayString, hasOverlap } from './components/appointmentUtils';

export interface EditAppointmentModalProps {
  appointment: Appointment;
  employees: Employee[];
  services: Service[];
  appointments: Appointment[];
  onClose: () => void;
  onEditAppointment?: (id: string, appointment: Partial<Appointment>) => Promise<boolean | void> | void;
  setErrorMessage: (msg: string | null) => void;
  setToastMessage: (msg: string | null) => void;
}

export function EditAppointmentModal({ appointment, employees, services, appointments, onClose, onEditAppointment, setErrorMessage, setToastMessage }: EditAppointmentModalProps) {
  const [editingAppointment, setEditingAppointment] = useState<Appointment>(appointment);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAppointment.date < getLocalTodayString()) { setErrorMessage('Data no passado.'); return; }
    if (editingAppointment.date === getLocalTodayString() && editingAppointment.time < getBrazilCurrentTimeString()) {
      setErrorMessage('Horario anterior a linha vermelha.');
      return;
    }
    const isOccupied = hasOverlap(editingAppointment.date, editingAppointment.time, editingAppointment.assignedEmployeeId, editingAppointment.services, appointments, services, editingAppointment.id);
    if (isOccupied) { setErrorMessage('Conflito de Horário.'); return; }
    if (!onEditAppointment) return;
    const success = await onEditAppointment(editingAppointment.id, editingAppointment);
    if (success !== false) { onClose(); setToastMessage('Agendamento atualizado!'); setTimeout(() => setToastMessage(null), 3000); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl max-w-lg w-full border border-outline-variant/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-headline text-primary">Editar Agendamento</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-2">Cliente</label><input required type="text" value={editingAppointment.clientName} onChange={e => setEditingAppointment(p => p && ({...p, clientName: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm" /></div>
            <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-2">Telefone</label><input type="text" value={editingAppointment.contact} onChange={e => setEditingAppointment(p => p && ({...p, contact: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-2">Data</label><input required type="date" value={editingAppointment.date} onChange={e => setEditingAppointment(p => p && ({...p, date: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm" /></div>
            <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-2">Horário</label><input required type="time" value={editingAppointment.time} onChange={e => setEditingAppointment(p => p && ({...p, time: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm" /></div>
          </div>
          <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-2">Profissional</label><select value={editingAppointment.assignedEmployeeId} onChange={e => setEditingAppointment(p => p && ({...p, assignedEmployeeId: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm">{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-2">Serviços</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
              {services.map(s => (
                <div key={s.id} onClick={() => setEditingAppointment(p => p && ({...p, services: p.services.includes(s.nome) ? p.services.filter(item => item !== s.nome) : [...p.services, s.nome]}))} className={`p-2 rounded-xl border cursor-pointer ${editingAppointment.services.includes(s.nome) ? 'bg-primary/10 border-primary' : 'bg-surface-container border-outline-variant/30'}`}>
                  <span className="text-xs font-bold">{s.nome}</span>
                </div>
              ))}
            </div>
          </div>
          <div><label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-2">Detalhes</label><textarea rows={3} value={editingAppointment.observation || ''} onChange={e => setEditingAppointment(p => p && ({...p, observation: e.target.value}))} className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 text-sm resize-none" /></div>
          <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Salvar Alterações</button>
        </form>
      </motion.div>
    </div>
  );
}