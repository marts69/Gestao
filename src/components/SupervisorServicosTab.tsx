import React, { useState } from 'react';
import { motion } from 'motion/react';
import { formatDuration } from '../utils/formatters';
import { Service } from '../types';
import { useSearch } from '../hooks/useSearch';
import { ConfirmDialog } from './ConfirmDialog';

type ServiceInput = Partial<Service> & { icone?: string };

interface SupervisorServicosTabProps {
  services: Array<Service & { icone?: string }>;
  onAddService: (service: ServiceInput) => Promise<boolean>;
  onEditService: (id: string, service: ServiceInput) => Promise<boolean>;
  onDeleteService: (id: string) => void;
  setToastMessage: (msg: string | null) => void;
}

export function SupervisorServicosTab({ services, onAddService, onEditService, onDeleteService, setToastMessage }: SupervisorServicosTabProps) {
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('60');
  const SERVICE_ICONS = [
    'self_improvement',
    'spa',
    'face',
    'water_drop',
    'waves',
    'air',
    'psychology',
    'healing',
    'favorite',
    'local_florist',
    'shower',
    'bedtime',
    'accessibility_new',
    'emoji_nature',
    'wb_sunny',
    'nights_stay',
  ];
  const [newServiceIcon, setNewServiceIcon] = useState(SERVICE_ICONS[0]);
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const filteredServices = useSearch(services, serviceSearchTerm, (service) => [service.nome, service.descricao, service.icone]);

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let success;
    if (editingServiceId) {
      success = await onEditService(editingServiceId, { nome: newServiceName, preco: newServicePrice, duracao: newServiceDuration, icone: newServiceIcon, descricao: newServiceDescription });
      if (success) setToastMessage('Serviço atualizado com sucesso!');
    } else {
      success = await onAddService({ nome: newServiceName, preco: newServicePrice, duracao: newServiceDuration, icone: newServiceIcon, descricao: newServiceDescription });
      if (success) setToastMessage('Serviço adicionado ao menu!');
    }
    
    if (success) {
      cancelServiceEdit();
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const cancelServiceEdit = () => {
    setEditingServiceId(null);
    setNewServiceName(''); setNewServicePrice(''); setNewServiceDuration('60'); setNewServiceIcon(SERVICE_ICONS[0]); setNewServiceDescription('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      <div className="xl:col-span-7 space-y-6">
        <div className="flex justify-between items-end mb-4 border-b border-outline-variant/20 pb-4">
          <div>
            <h3 className="text-2xl font-headline text-primary">Menu de Serviços</h3>
            <p className="text-sm text-on-surface-variant">Gerencie tratamentos, durações e valores.</p>
          </div>
          <div className="relative w-full max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar serviço..."
              value={serviceSearchTerm}
              onChange={e => setServiceSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 text-sm rounded-xl focus:ring-1 focus:ring-primary text-on-surface"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {filteredServices.map((srv) => (
            <div key={srv.id} className="bg-surface-container-lowest p-5 rounded-3xl flex flex-col gap-4 transition-all hover:bg-surface-container-low group relative overflow-hidden border border-outline-variant/10 shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/80"></div>
              <div className="flex items-center gap-4 pl-2 min-w-0">
                <div className="w-12 h-12 bg-primary-container/20 rounded-full flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">{srv.icone || 'spa'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-headline text-lg text-on-surface truncate">{srv.nome}</h4>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-on-surface-variant">
                    <span className="flex items-center gap-1 shrink-0"><span className="material-symbols-outlined text-[14px]">schedule</span> {formatDuration(Number(srv.duracao || 60))}</span>
                    <span className="flex items-center gap-1 shrink-0"><span className="material-symbols-outlined text-[14px]">payments</span> R$ {Number(srv.preco).toFixed(2)}</span>
                  </div>
                  {srv.descricao && (
                    <p className="text-xs text-on-surface-variant mt-2 line-clamp-2 italic">{srv.descricao}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end border-t border-outline-variant/10 pt-3 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button onClick={() => {
                  setEditingServiceId(srv.id); setNewServiceName(srv.nome); setNewServicePrice(String(srv.preco));
                  setNewServiceDuration(String(srv.duracao || 60)); setNewServiceIcon(srv.icone || SERVICE_ICONS[0]);
                  setNewServiceDescription(srv.descricao || '');
                }} className="p-2 text-on-surface-variant hover:bg-primary-container/20 hover:text-primary rounded-full transition-colors"><span className="material-symbols-outlined text-[22px]">edit</span></button>
                <button onClick={() => setServiceToDelete(srv.id)} className="p-2 text-on-surface-variant hover:bg-error-container/20 hover:text-error rounded-full transition-colors"><span className="material-symbols-outlined text-[22px]">delete</span></button>
              </div>
            </div>
          ))}
          {filteredServices.length === 0 && <p className="text-center py-8 text-on-surface-variant">Nenhum serviço encontrado.</p>}
        </div>
      </div>

      <div className="xl:col-span-5 bg-surface-container-low p-8 rounded-3xl border border-outline-variant/20 h-fit sticky top-24">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-headline text-primary flex items-center gap-2"><span className="material-symbols-outlined">{editingServiceId ? 'edit' : 'add_circle'}</span> {editingServiceId ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h3>
          {editingServiceId && <button onClick={cancelServiceEdit} className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Cancelar</button>}
        </div>
        <form onSubmit={handleServiceSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Nome</label>
            <input
              required
              type="text"
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary"
              placeholder="Ex: Massagem Relaxante"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Preço</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={newServicePrice}
                onChange={e => setNewServicePrice(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary"
                placeholder="120.00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Duração (min)</label>
              <input
                required
                type="number"
                min="5"
                step="5"
                value={newServiceDuration}
                onChange={e => setNewServiceDuration(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary"
                placeholder="60"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Ícone</label>
            <div className="flex gap-2 flex-wrap max-h-28 overflow-y-auto pr-1 custom-scrollbar">
              {SERVICE_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewServiceIcon(icon)}
                  className={`w-10 h-10 shrink-0 rounded-xl border transition-colors ${newServiceIcon === icon ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/40'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Descrição</label>
            <textarea
              rows={3}
              value={newServiceDescription}
              onChange={e => setNewServiceDescription(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary resize-none"
              placeholder="Detalhes, benefícios e observações do serviço"
            />
          </div>
          <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all">
            {editingServiceId ? 'Salvar Alterações' : 'Adicionar Serviço'}
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={Boolean(serviceToDelete)}
        title="Excluir Serviço?"
        description="Esta ação removerá o serviço do menu."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        icon="delete"
        onClose={() => setServiceToDelete(null)}
        onConfirm={() => {
          if (!serviceToDelete) return;
          onDeleteService(serviceToDelete);
          setToastMessage('Serviço removido!');
          setTimeout(() => setToastMessage(null), 3000);
          setServiceToDelete(null);
        }}
      />
    </motion.div>
  );
}