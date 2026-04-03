import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Layout } from './components/Layout';
import { useQueryClient } from '@tanstack/react-query';
import { CollaboratorView } from './components/CollaboratorView';
import { useAuth } from './AuthContext';
import { SupervisorView } from './components/SupervisorView';
import { LoginView } from './components/LoginView';
import { TVPanelView } from './components/TVPanelView';
import io from 'socket.io-client';
import { getSocketUrl } from './config/api';
import { Employee, Appointment, Service, Client } from './types'; // Tipos mais fortes
import {
  useAppointments, useAddAppointment, useCompleteAppointment, useReassignAppointment, useEditAppointment, useDeleteAppointment,
  useEmployees, useAddEmployee, useDeleteEmployee, useEditEmployee,
  useServices, useAddService, useEditService, useDeleteService,
  useClients, useEditClient, useDeleteClient,
  useAddBloqueio, useDeleteBloqueio
} from './api'; // Importando os novos hooks

const ADMIN_USER: Employee = {
  id: 'admin',
  name: 'Diretoria',
  email: 'admin@serenidade.com',
  role: 'supervisor',
  specialty: 'Gestão',
  avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Diretoria',
  rating: 5.0,
  completedServices: 0,
  diasTrabalho: '1,2,3,4,5,6',
  bloqueios: []
};

export default function App() {
  const { currentUser, token, loginError, handleLogin, handleLogout } = useAuth();
  const queryClient = useQueryClient();
  const [isPublicTVMode, setIsPublicTVMode] = useState(false);

  // 1. SUBSTITUIÇÃO DOS ESTADOS MANUAIS PELOS HOOKS DO REACT QUERY
  // Os dados, loading e erros agora são gerenciados automaticamente.
  const { data: employeesData, isLoading: loadingEmployees, isError: errorEmployees } = useEmployees(token);
  const { data: appointmentsData, isLoading: loadingAppointments, isError: errorAppointments } = useAppointments(token);
  const { data: services, isLoading: loadingServices, isError: errorServices } = useServices(token);
  const { data: clients, isLoading: loadingClients, isError: errorClients } = useClients(token);

  // Adicionamos o usuário admin manualmente à lista vinda da API
  const employees = useMemo(() => (employeesData ? [ADMIN_USER, ...employeesData] : [ADMIN_USER]), [employeesData]);
  const appointments = useMemo(() => appointmentsData || [], [appointmentsData]);

  const [activeRoleView, setActiveRoleView] = useState<'supervisor' | 'collaborator' | 'tv'>('collaborator');

  // Atualiza a View de segurança baseada no cargo toda vez que o currentUser mudar
  useEffect(() => { if (currentUser) setActiveRoleView(currentUser.role); }, [currentUser]);

  // Estado do Tema (Modo Escuro/Claro) com persistência no navegador
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('spa_theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Efeito apenas para a carga inicial (quando o site abre)
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []); // Executa apenas uma vez no carregamento

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    
    const updateDOM = () => {
      // Atualiza o estado do React (muda o ícone de Sol/Lua)
      flushSync(() => setIsDarkMode(newTheme));
      
      // Atualiza o HTML e o Cache IMEDIATAMENTE para a animação capturar certo
      if (newTheme) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('spa_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('spa_theme', 'light');
      }
    };

    if (!document.startViewTransition) {
      updateDOM();
    } else {
      document.startViewTransition(() => {
        updateDOM();
      });
    }
  };

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      console.error('[FRONTEND][UNCAUGHT_ERROR]', {
        message: event.message,
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[FRONTEND][UNHANDLED_REJECTION]', {
        reason: event.reason,
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // ATIVA AS BUSCAS INICIAIS E O WEBSOCKET
  useEffect(() => {
    // Só conecta o socket e busca dados caso o usuário tenha um token (esteja logado)
    if (!token) return;

    const socket = io(getSocketUrl());
    // Agora, o WebSocket apenas notifica o React Query para invalidar os caches.
    // Ele se encarrega de refazer as buscas necessárias de forma otimizada.
    socket.on('db_updated', () => {
      console.log('🔄 WebSocket: Invalidação de cache recebida.');
      queryClient.invalidateQueries(); // Invalida TODOS os caches
    }); 
    
    return () => { socket.disconnect(); };
  }, [token, queryClient]);

  // 2. SUBSTITUIÇÃO DAS FUNÇÕES DE CALLBACK PELAS MUTAÇÕES DO REACT QUERY
  // A lógica de 'fetch', 'try/catch', e 'setEstado' é abstraída para dentro dos hooks.
  // O componente apenas chama a função 'mutateAsync'. O 'onSuccess' nos hooks cuida da atualização da UI.
  const { mutateAsync: addAppointment, isPending: isAddingAppointment } = useAddAppointment(token);
  const { mutateAsync: completeAppointment } = useCompleteAppointment(token);
  const { mutateAsync: reassignAppointment } = useReassignAppointment(token);
  const { mutateAsync: editAppointment } = useEditAppointment(token);
  const { mutateAsync: deleteAppointment } = useDeleteAppointment(token);
  const { mutateAsync: addEmployee } = useAddEmployee(token);
  const { mutateAsync: deleteEmployee } = useDeleteEmployee(token);
  const { mutateAsync: editEmployee } = useEditEmployee(token);
  const { mutateAsync: addService } = useAddService(token);
  const { mutateAsync: editService } = useEditService(token);
  const { mutateAsync: deleteService } = useDeleteService(token);
  const { mutateAsync: editClient } = useEditClient(token);
  const { mutateAsync: deleteClient } = useDeleteClient(token);
  const { mutateAsync: addBloqueio } = useAddBloqueio(token);
  const { mutateAsync: deleteBloqueio } = useDeleteBloqueio(token);

  const handleReassign = (appointmentId: string, newEmployeeId: string) => {
    return reassignAppointment({ id: appointmentId, newEmployeeId });
  };

  const handleDeleteEmployee = (id: string, reallocateToId?: string) => {
    return deleteEmployee({ id, reallocateToId });
  };

  const handleEditEmployee = (id: string, employee: Partial<Employee>) => {
    return editEmployee({ id, ...employee });
  };

  const handleEditService = (id: string, service: Partial<Service>) => {
    return editService({ id, ...service } as Service);
  };

  const handleEditAppointment = (id: string, appointment: Partial<Appointment>) => {
    return editAppointment({ id, ...appointment });
  };

  const handleEditClient = (id: string, clientData: Partial<Client>) => {
    return editClient({ id, ...clientData });
  };

  const staff = useMemo(() => {
    // Repassa todos (Colab e Super) para aparecerem, exceto o admin virtual
    return employees.filter(e => e.id !== 'admin').map(emp => ({
      ...emp,
      completedServices: appointments.filter(
        a => a.assignedEmployeeId === emp.id && a.status === 'completed'
      ).length
    }));
  }, [employees, appointments]);

  if (!currentUser && isPublicTVMode) {
    return <TVPanelView appointments={appointments} employees={staff} onExit={() => setIsPublicTVMode(false)} />;
  }

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} onOpenTVPanel={() => setIsPublicTVMode(true)} error={loginError} />;
  }

  // 3. ESTADOS GLOBAIS DE CARREGAMENTO E ERRO
  // Combina os status para garantir que a interface só renderize com tudo pronto
  const isGlobalLoading = loadingEmployees || loadingAppointments || loadingServices || loadingClients;
  const isGlobalError = errorEmployees || errorAppointments || errorServices || errorClients;

  if (isGlobalLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)]">
        <span className="material-symbols-outlined text-6xl text-[var(--color-primary)] animate-spin mb-4">
          progress_activity
        </span>
        <p className="text-xl font-serif text-[var(--color-on-background)] animate-pulse">
          Carregando dados do sistema...
        </p>
      </div>
    );
  }

  if (isGlobalError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] p-4">
        <div className="bg-[var(--color-error-container)] p-8 rounded-3xl max-w-md text-center shadow-lg border border-[var(--color-error)]">
          <span className="material-symbols-outlined text-5xl text-[var(--color-on-error-container)] mb-4">cloud_off</span>
          <h2 className="text-2xl font-bold text-[var(--color-on-error-container)] mb-2">Falha na Conexão</h2>
          <p className="text-[var(--color-on-error-container)] opacity-80 mb-6">Não foi possível carregar as informações essenciais. Verifique sua conexão com o servidor.</p>
          <button onClick={() => window.location.reload()} className="bg-[var(--color-error)] text-[var(--color-on-error)] px-6 py-2 rounded-xl font-bold uppercase tracking-wider transition-colors hover:bg-[var(--color-error-dim)]">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  // Se o Modo TV estiver ativo, renderiza ele em tela cheia (sem Layout de fundo)
  if (activeRoleView === 'tv') {
    return <TVPanelView appointments={appointments} employees={staff} onExit={() => setActiveRoleView(currentUser.role)} />;
  }

  return (
    <Layout 
      userName={currentUser.name} 
      userRole={currentUser.role} 
      activeView={activeRoleView} 
      onViewChange={(view) => {
        // Trava de segurança: impede mudança de estado se não for supervisor
        if (currentUser.role === 'supervisor') setActiveRoleView(view);
      }} 
      onLogout={handleLogout}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
    >
      {/* Trava de segurança final: exige que a função (role) real do banco seja supervisor */}
      {currentUser.role === 'supervisor' && activeRoleView === 'supervisor' ? (
        <SupervisorView 
          employees={staff}
          appointments={appointments}
          services={services || []}
          clients={clients || []}
          onReassign={handleReassign}
          onAddEmployee={addEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onEditEmployee={handleEditEmployee}
          onAddService={addService}
          onEditService={handleEditService}
          onDeleteService={deleteService}
          onAddAppointment={addAppointment}
          isAddingAppointment={isAddingAppointment}
          onDeleteAppointment={deleteAppointment}
          onEditAppointment={handleEditAppointment}
          onCompleteAppointment={completeAppointment}
          onEditClient={handleEditClient}
          onDeleteClient={deleteClient}
          onAddBloqueio={addBloqueio}
          onDeleteBloqueio={deleteBloqueio}
        />
      ) : (
        <CollaboratorView 
          currentUser={currentUser}
          employees={staff}
          appointments={appointments}
          services={services || []}
          clients={clients || []}
          onAddAppointment={addAppointment}
          isAddingAppointment={isAddingAppointment}
          onEditAppointment={handleEditAppointment}
          onDeleteAppointment={deleteAppointment}
          onEditClient={handleEditClient}
          onDeleteClient={deleteClient}
          onCompleteAppointment={completeAppointment}
          onAddBloqueio={addBloqueio}
          onDeleteBloqueio={deleteBloqueio}
        />
      )}
    </Layout>
  );
}