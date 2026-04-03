import React, { useState, useEffect, useRef } from 'react';
import { Role } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  userName: string;
  userRole: Role;
  activeView?: Role | 'tv';
  onViewChange?: (view: Role | 'tv') => void;
  onLogout: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export function Layout({ children, userName, userRole, activeView, onViewChange, onLogout, isDarkMode, toggleTheme }: LayoutProps) {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Se o menu estiver aberto e o clique não foi no menu nem no botão que o abre, fecha o menu
      if (
        showSettings &&
        settingsRef.current && !settingsRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettings]);

  // Função simples para manipular variáveis CSS caso você as use no Tailwind/CSS nativo
  const changePrimaryColor = (colorHex: string) => {
    // Caso não tenha mapeado variáveis customizadas, você pode fazer ajustes no seu index.css
    // adicionando :root { --color-primary: #006a5a; }
    document.documentElement.style.setProperty('--color-primary', colorHex);
    document.documentElement.style.setProperty('--color-primary-dim', colorHex + 'cc');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-body antialiased transition-colors duration-300">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-md font-headline text-on-surface sticky top-0 z-50 shadow-sm flex justify-between items-center w-full px-8 py-4 max-w-full">
        <div className="flex items-center gap-4">
          {/* Espaço para a sua Logo. Basta trocar o src pela sua imagem (ex: src="/logo.png") */}
          <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center overflow-hidden border border-primary/20 shrink-0 shadow-sm">
            {/* <img src="/logo.png" alt="Logo da Clínica" className="w-full h-full object-cover" /> */}
            <span className="material-symbols-outlined text-primary text-2xl">spa</span>
          </div>
          <span className="text-2xl font-serif italic text-primary hidden sm:block">Serenidade Spa</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-4 py-1 bg-surface-container rounded-full border border-outline-variant/30">
            <span className="material-symbols-outlined text-primary scale-75">badge</span>
            {userRole === 'supervisor' ? (
              <select 
                value={activeView} 
                onChange={(e) => onViewChange?.(e.target.value as Role | 'tv')}
                className="bg-transparent border-none text-xs font-semibold text-on-surface-variant uppercase tracking-tighter font-body focus:ring-0 cursor-pointer outline-none m-0 p-0"
              >
                <option value="supervisor">Portal da Supervisão</option>
                <option value="collaborator">Portal do Colaborador</option>
                <option value="tv">Painel de TV (Recepção)</option>
              </select>
            ) : (
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-tighter font-body">
                Portal do Colaborador
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 ml-2 pl-4 border-l border-outline-variant/30">
            {toggleTheme && (
              <button 
                onClick={toggleTheme} 
                className="text-on-surface-variant hover:bg-surface-container hover:text-primary w-10 h-10 flex items-center justify-center rounded-full transition-all" 
                title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span 
                    key={isDarkMode ? 'dark' : 'light'}
                    initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                    className="material-symbols-outlined block"
                  >
                    {isDarkMode ? 'light_mode' : 'dark_mode'}
                  </motion.span>
                </AnimatePresence>
              </button>
            )}
            {/* Exibe a paleta de cores APENAS se o usuário for Supervisor */}
            {userRole === 'supervisor' && (
              <button 
                ref={buttonRef}
                onClick={() => setShowSettings(!showSettings)} 
                className="text-on-surface-variant hover:bg-surface-container hover:text-primary w-10 h-10 flex items-center justify-center rounded-full transition-all" 
                title="Estilo e Cores"
              >
                <span className="material-symbols-outlined">palette</span>
              </button>
            )}
            <span className="text-sm font-bold text-primary hidden md:block">{userName}</span>
            <button 
              onClick={onLogout} 
              className="material-symbols-outlined text-on-surface-variant hover:bg-error-container/20 hover:text-error p-2 rounded-full transition-all" 
              title="Sair"
            >
              logout
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            ref={settingsRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface-container-low border-b border-outline-variant/20 px-8 py-5 flex flex-col sm:flex-row items-center gap-4 justify-between overflow-hidden"
          >
            <div className="text-left">
              <h4 className="text-sm font-bold text-primary uppercase tracking-widest">Estilo da Clínica</h4>
              <p className="text-xs text-on-surface-variant">Selecione o tom principal da sua marca.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {['#006a5a', '#b71c1c', '#0d47a1', '#e65100', '#4a148c', '#424242', '#0ea5e9', '#10b981', '#f43f5e', '#d946ef', '#8b5cf6', '#f59e0b'].map(color => (
                <button
                  key={color}
                  onClick={() => changePrimaryColor(color)}
                  className="w-10 h-10 rounded-full border-2 border-surface shadow-sm transition-transform hover:scale-110 focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: color }}
                  title={color}
                ></button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow flex flex-col items-center px-4 py-12 md:py-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-8 text-on-surface-variant text-[11px] font-medium uppercase tracking-widest border-t border-outline-variant/10 font-body">
        <div className="flex items-center gap-3">
          <span className="font-serif italic text-lg text-primary normal-case tracking-normal">Serenidade Spa & Resort</span>
          <span className="opacity-40">|</span>
          <span>Sistema Interno</span>
        </div>
        <div className="flex gap-10">
          <span className="text-outline-variant">Uso Exclusivo para Colaboradores</span>
        </div>
      </footer>
    </div>
  );
}
