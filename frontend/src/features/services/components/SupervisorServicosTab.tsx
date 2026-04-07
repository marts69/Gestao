import React from 'react';
import { motion } from 'motion/react';
import { Service, ServiceEligibilityMode } from '../../../types';

interface SupervisorServicosTabProps {
  services: Service[];
  filteredServices: Service[];
  serviceSearchTerm: string;
  setServiceSearchTerm: (value: string) => void;
  editingServiceId: string | null;
  cancelServiceEdit: () => void;
  handleServiceSubmit: (e: React.FormEvent) => void;
  formatDuration: (minutes: number) => string;
  getEligibilitySummary: (service: Service) => string;
  onEditServiceCard: (service: Service) => void;
  onDeleteServiceCard: (serviceId: string) => void;
  serviceIcons: string[];
  newServiceIcon: string;
  setNewServiceIcon: (value: string) => void;
  newServiceName: string;
  setNewServiceName: (value: string) => void;
  newServicePrice: string;
  setNewServicePrice: (value: string) => void;
  newServiceDuration: string;
  setNewServiceDuration: (value: string) => void;
  serviceEligibilityMode: ServiceEligibilityMode;
  setServiceEligibilityMode: (value: ServiceEligibilityMode) => void;
  serviceAllowedCargosInput: string;
  setServiceAllowedCargosInput: React.Dispatch<React.SetStateAction<string>>;
  serviceAllowedSkillsInput: string;
  setServiceAllowedSkillsInput: React.Dispatch<React.SetStateAction<string>>;
  availableCargos: string[];
  availableSkills: string[];
  appendRuleToken: (currentValue: string, nextToken: string) => string;
  newServiceDescription: string;
  setNewServiceDescription: (value: string) => void;
}

export function SupervisorServicosTab({
  services,
  filteredServices,
  serviceSearchTerm,
  setServiceSearchTerm,
  editingServiceId,
  cancelServiceEdit,
  handleServiceSubmit,
  formatDuration,
  getEligibilitySummary,
  onEditServiceCard,
  onDeleteServiceCard,
  serviceIcons,
  newServiceIcon,
  setNewServiceIcon,
  newServiceName,
  setNewServiceName,
  newServicePrice,
  setNewServicePrice,
  newServiceDuration,
  setNewServiceDuration,
  serviceEligibilityMode,
  setServiceEligibilityMode,
  serviceAllowedCargosInput,
  setServiceAllowedCargosInput,
  serviceAllowedSkillsInput,
  setServiceAllowedSkillsInput,
  availableCargos,
  availableSkills,
  appendRuleToken,
  newServiceDescription,
  setNewServiceDescription,
}: SupervisorServicosTabProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      <div className="xl:col-span-7 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4 border-b border-outline-variant/20 pb-4">
          <div>
            <h3 className="text-2xl font-headline text-primary">Menu de Servicos</h3>
            <p className="text-sm text-on-surface-variant">Gerencie tratamentos, duracoes e valores.</p>
            <p className="mt-1 text-xs text-on-surface-variant/80">
              {filteredServices.length} de {services.length} servicos visiveis
            </p>
          </div>
          <div className="relative w-full md:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar servico..."
              value={serviceSearchTerm}
              onChange={e => setServiceSearchTerm(e.target.value)}
              aria-label="Buscar servico"
              className="w-full pl-10 pr-10 py-2 bg-surface-container-low border border-outline-variant/30 text-sm rounded-xl focus:ring-1 focus:ring-primary text-on-surface"
            />
            {serviceSearchTerm && (
              <button
                type="button"
                onClick={() => setServiceSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                aria-label="Limpar busca de servicos"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredServices.map((srv) => {
            const eligibilityModeLabel = srv.modoElegibilidade === 'cargo'
              ? 'Por cargo'
              : srv.modoElegibilidade === 'habilidade'
                ? 'Por habilidade'
                : 'Livre';

            return (
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <span className="material-symbols-outlined text-[14px]">verified_user</span>
                        {eligibilityModeLabel}
                      </span>
                    </div>
                    {srv.descricao && (
                      <p className="text-xs text-on-surface-variant mt-2 line-clamp-2 italic">
                        {srv.descricao}
                      </p>
                    )}
                    <p className="text-[10px] text-on-surface-variant mt-1 line-clamp-2">
                      {getEligibilitySummary(srv)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end border-t border-outline-variant/10 pt-3 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEditServiceCard(srv)} className="p-2 text-on-surface-variant hover:bg-primary-container/20 hover:text-primary rounded-full transition-colors"><span className="material-symbols-outlined text-[22px]">edit</span></button>
                  <button onClick={() => onDeleteServiceCard(srv.id)} className="p-2 text-on-surface-variant hover:bg-error-container/20 hover:text-error rounded-full transition-colors"><span className="material-symbols-outlined text-[22px]">delete</span></button>
                </div>
              </div>
            );
          })}
          {filteredServices.length === 0 && <p className="text-center py-8 text-on-surface-variant">Nenhum servico encontrado.</p>}
        </div>
      </div>

      <div className="xl:col-span-5 bg-surface-container-low p-8 rounded-3xl border border-outline-variant/20 h-fit sticky top-24">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-headline text-primary flex items-center gap-2"><span className="material-symbols-outlined">{editingServiceId ? 'edit' : 'add_circle'}</span> {editingServiceId ? 'Editar Servico' : 'Adicionar Novo Servico'}</h3>
          {editingServiceId && <button onClick={cancelServiceEdit} className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Cancelar</button>}
        </div>
        <form onSubmit={handleServiceSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Icone de Identificacao</label>
            <div className="flex gap-2 mb-4">
              {serviceIcons.map(icon => (
                <button key={icon} type="button" onClick={() => setNewServiceIcon(icon)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${newServiceIcon === icon ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20 hover:border-primary/50'}`}>
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Nome do Tratamento</label>
            <input required type="text" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Ex: Massagem com Pedras" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Preco (R$)</label>
              <input required type="number" step="0.01" value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Ex: 150.00" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Duracao (Min)</label>
              <input required type="number" value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all" placeholder="Ex: 60" />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Elegibilidade do Servico</label>
              <select
                value={serviceEligibilityMode}
                onChange={(e) => setServiceEligibilityMode(e.target.value as ServiceEligibilityMode)}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm"
              >
                <option value="livre">Livre (qualquer profissional)</option>
                <option value="cargo">Restrito por cargo</option>
                <option value="habilidade">Restrito por habilidade</option>
              </select>
              <p className="text-[10px] text-on-surface-variant mt-2">
                Defina quem pode executar este servico. No modo livre, todos os profissionais ficam disponiveis.
              </p>
            </div>

            {serviceEligibilityMode === 'cargo' && (
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Cargos Permitidos</label>
                <input
                  type="text"
                  value={serviceAllowedCargosInput}
                  onChange={(e) => setServiceAllowedCargosInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm"
                  placeholder="Ex: Massoterapeuta, Esteticista"
                />
                {availableCargos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableCargos.slice(0, 10).map((cargo) => (
                      <button
                        key={cargo}
                        type="button"
                        onClick={() => setServiceAllowedCargosInput((prev) => appendRuleToken(prev, cargo))}
                        className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-widest hover:bg-primary/20"
                      >
                        + {cargo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {serviceEligibilityMode === 'habilidade' && (
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Habilidades Permitidas</label>
                <input
                  type="text"
                  value={serviceAllowedSkillsInput}
                  onChange={(e) => setServiceAllowedSkillsInput(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm"
                  placeholder="Ex: Drenagem, Microagulhamento"
                />
                {availableSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableSkills.slice(0, 12).map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => setServiceAllowedSkillsInput((prev) => appendRuleToken(prev, skill))}
                        className="text-[10px] px-2 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container font-bold uppercase tracking-widest hover:bg-secondary-container"
                      >
                        + {skill}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant tracking-[0.15em] uppercase mb-2">Detalhes / Produtos Utilizados (Opcional)</label>
            <textarea value={newServiceDescription} onChange={e => setNewServiceDescription(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 focus:ring-1 focus:ring-primary text-sm transition-all resize-none min-h-[80px]" placeholder="Ex: Utiliza oleos essenciais relaxantes, pedras aquecidas e toalhas quentes..." />
          </div>
          <button type="submit" className="w-full mt-4 bg-primary text-on-primary py-3 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-primary-dim transition-all active:scale-[0.98]">{editingServiceId ? 'Salvar Alteracoes' : 'Salvar Servico'}</button>
        </form>
      </div>
    </motion.div>
  );
}
