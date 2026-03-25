import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Layout } from './components/Layout';
import { CollaboratorView } from './components/CollaboratorView';
import { SupervisorView } from './components/SupervisorView';
import { ReceptionistView } from './components/Recepcionista';
import { LoginView } from './components/LoginView';
import { TVPanelView } from './components/TVPanelView';
import io from 'socket.io-client';
import { Employee, Appointment } from './types';

const ADMIN_USER: Employee = {
  id: 'admin',
  name: 'Diretoria',
  email: 'admin@serenidade.com',
  role: 'supervisor',
  specialty: 'Gestão',
  avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Diretoria',
  rating: 5.0,
  completedServices: 0
};

// Usa dinamicamente o mesmo IP de onde a página está sendo acessada na rede local.
const API_URL = `http://${window.location.hostname}:3333`; 

export default function App() {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([ADMIN_USER]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeRoleView, setActiveRoleView] = useState<'supervisor' | 'collaborator' | 'receptionist' | 'tv'>('collaborator');
  const [token, setToken] = useState<string | null>(localStorage.getItem('spa_token'));
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

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

  // FUNÇÃO ÚNICA PARA BUSCAR TODOS OS DADOS EM TEMPO REAL
  const loadAllData = useCallback(async () => {
    if (!token) return; // Só busca dados se estiver logado com token

    
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // Adicionando um fallback (.catch) individual para impedir que uma falha de rede derrube todo o carregamento
      const [colabRes, agenRes, servRes, cliRes] = await Promise.all([
        fetch(`${API_URL}/api/colaboradores`, { cache: 'no-store', headers }).catch(() => null),
        fetch(`${API_URL}/api/agendamentos`, { cache: 'no-store', headers }).catch(() => null),
        fetch(`${API_URL}/api/servicos`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/clientes`, { headers }).catch(() => null)
      ]);

      if (colabRes && colabRes.ok) {
        const data = await colabRes.json();
        const formatados = data.map((colab: any) => ({
          id: String(colab.id),
          name: colab.nome || 'Usuário',
          email: colab.email || `${(colab.nome || 'usuario').toLowerCase().split(' ')[0]}@serenidade.com`,
          role: colab.papel || 'collaborator',
          specialty: colab.especialidade,
          avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${colab.nome || 'usuario'}`,
          rating: 5.0,
          completedServices: 0
        }));
        setEmployees([ADMIN_USER, ...formatados]);
      }

      if (agenRes && agenRes.ok) {
        const data = await agenRes.json();
        const formatados = data.map((ag: any) => {
          let dateStr = new Date().toISOString().split('T')[0];
          let timeStr = '12:00';
          const dataObj = new Date(ag.data);
          if (!isNaN(dataObj.getTime())) { // Proteção contra datas inválidas no banco
            dateStr = dataObj.toISOString().split('T')[0];
            timeStr = dataObj.toISOString().split('T')[1].substring(0, 5);
          }
          return {
            id: String(ag.id),
            clientName: ag.cliente?.nome || 'Cliente não encontrado',
            contact: ag.cliente?.telefone || 'Não informado',
            services: ag.servicos ? ag.servicos.map((s: any) => s.nome) : ['Serviço Padrão'],
            date: dateStr,
            time: timeStr,
            guests: 1,
            specialNeeds: [],
            assignedEmployeeId: String(ag.colaboradorId),
            status: ag.status || 'scheduled'
          };
        });
        setAppointments(formatados);
      }

      if (servRes && servRes.ok) setServices(await servRes.json());
      if (cliRes && cliRes.ok) setClients(await cliRes.json());
      
    } catch (err) {
      console.error("Erro ao realizar sincronização no banco:", err);
    }
  }, [token]);

  // ATIVA AS BUSCAS INICIAIS E O WEBSOCKET
  useEffect(() => {
    loadAllData();
    const socket = io(API_URL);
    socket.on('db_updated', () => loadAllData()); 
    return () => { socket.disconnect(); };
  }, [token, loadAllData]); // loadAllData adicionado para evitar stale closures

  // 3. FUNÇÃO DE LOGIN
  const handleLogin = useCallback(async (email: string, pass: string) => {
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: pass })
      });

      if (!response.ok) throw new Error("Credenciais inválidas");

      const data = await response.json();
      
      setToken(data.token);
      localStorage.setItem('spa_token', data.token); // Mantém logado ao dar F5
      
      const loggedUser = {
        id: String(data.usuario.id),
        name: data.usuario.nome || 'Usuário',
        email: data.usuario.email || email,
        role: data.usuario.papel as 'supervisor' | 'collaborator' | 'receptionist',
        specialty: data.usuario.especialidade,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${data.usuario.nome || 'usuario'}`,
        rating: 5.0,
        completedServices: 0
      };
      
      setCurrentUser(loggedUser);
      setActiveRoleView(loggedUser.role);
      setLoginError(null);
    } catch (err) {
      console.error("Falha na requisição de login:", err);
      setLoginError('E-mail ou senha incorretos.');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('spa_token');
  }, []);

  // 4. FUNÇÃO DE AGENDAMENTO (Agora via IP de rede)
  const handleAddAppointment = useCallback(async (newApp: any) => {
    try {
      // O 'Z' força o UTC, impedindo que o JavaScript some +3 horas na hora de enviar pro banco
      const parsedDate = new Date(`${newApp.date}T${newApp.time || '12:00'}:00Z`);
      const dataISO = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString();

      const response = await fetch(`${API_URL}/api/agendamentos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          clientName: newApp.clientName,
          contact: newApp.contact,
          collaboratorId: newApp.assignedEmployeeId,
          date: dataISO, // Agora enviamos o momento exato em formato Universal (UTC)
          serviceNames: newApp.services
        })
      });

      if (!response.ok) throw new Error("Erro ao salvar no banco");

      const ag = await response.json();
      
      let dateStr = newApp.date;
      let timeStr = newApp.time || '12:00';
      const dataObj = new Date(ag.data);
      if (!isNaN(dataObj.getTime())) {
        dateStr = dataObj.toISOString().split('T')[0];
        timeStr = dataObj.toISOString().split('T')[1].substring(0, 5);
      }
      
      // Formatamos o agendamento recém-criado para o padrão do Front-end
      const novoAgendamentoFormatado = {
        id: String(ag.id),
        clientName: ag.cliente?.nome || newApp.clientName,
        contact: newApp.contact || 'Não informado',
        services: ag.servicos ? ag.servicos.map((s: any) => s.nome) : newApp.services,
        date: dateStr,
        time: timeStr,
        guests: newApp.guests || 1,
        specialNeeds: newApp.specialNeeds || [],
        assignedEmployeeId: String(ag.colaboradorId),
        status: ag.status || 'scheduled'
      };

      setAppointments(prev => [...prev, novoAgendamentoFormatado]);
      return true; // Retorna sucesso
    } catch (error) {
      console.error("Erro:", error);
      alert("Não foi possível salvar o agendamento.");
      return false; // Retorna falha
    }
  }, [token]);

  // Atualizando o agendamento para concluído no banco de dados e na interface
  const handleCompleteAppointment = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/agendamentos/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!response.ok) throw new Error("Erro ao atualizar o banco de dados");

      // Atualiza localmente a interface para refletir a mudança sem precisar dar refresh
      setAppointments(prev => 
        prev.map(app => app.id === id ? { ...app, status: 'completed' } : app)
      );
    } catch (error) {
      console.error("Erro:", error);
      alert("Não foi possível concluir o agendamento.");
    }
  }, [token]);

  // 4.5 FUNÇÃO PARA REALOCAR AGENDAMENTO
  const handleReassign = useCallback(async (appointmentId: string, newEmployeeId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/agendamentos/${appointmentId}/colaborador`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ colaboradorId: newEmployeeId })
      });

      if (!response.ok) throw new Error("Erro ao atualizar o banco de dados");

      // Atualiza localmente a interface para o card "pular" para a outra coluna
      setAppointments(prev => 
        prev.map(app => app.id === appointmentId ? { ...app, assignedEmployeeId: newEmployeeId } : app)
      );
    } catch (error) {
      console.error("Erro:", error);
      alert("Não foi possível realocar o agendamento.");
    }
  }, [token]);

  // 4.6 FUNÇÃO PARA EDITAR DADOS DO AGENDAMENTO (Hora, Data, Cliente, etc)
  const handleEditAppointment = useCallback(async (id: string, updatedData: any) => {
    try {
      let dataISO = undefined;
      if (updatedData.date && updatedData.time) {
        const parsedDate = new Date(`${updatedData.date}T${updatedData.time}:00Z`);
        if (!isNaN(parsedDate.getTime())) dataISO = parsedDate.toISOString();
      }

      const response = await fetch(`${API_URL}/api/agendamentos/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          clientName: updatedData.clientName,
          contact: updatedData.contact,
          colaboradorId: updatedData.assignedEmployeeId,
          date: dataISO,
          serviceNames: updatedData.services
        })
      });

      if (!response.ok) throw new Error("Erro ao atualizar o banco de dados");

      const ag = await response.json();
      const dataObj = new Date(ag.data);

      setAppointments(prev => prev.map(app => app.id === id ? {
        ...app,
        clientName: ag.cliente?.nome || updatedData.clientName,
        contact: ag.cliente?.telefone || updatedData.contact || 'Não informado',
        services: ag.servicos ? ag.servicos.map((s: any) => s.nome) : updatedData.services,
        date: dataObj.toISOString().split('T')[0],
        time: dataObj.toISOString().split('T')[1].substring(0, 5),
        assignedEmployeeId: String(ag.colaboradorId),
      } : app));
      
      return true;
    } catch (error) {
      console.error("Erro:", error);
      alert("Não foi possível editar o agendamento.");
      return false;
    }
  }, [token]);

  // 4.6 FUNÇÃO PARA EXCLUIR (CANCELAR) AGENDAMENTO
  const handleDeleteAppointment = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/agendamentos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Erro ao excluir do banco");
      
      setAppointments(prev => prev.filter(app => app.id !== id));
      return true;
    } catch (error) {
      console.error("Erro:", error);
      alert("Não foi possível cancelar o agendamento.");
      return false;
    }
  }, [token]);

  // 5. FUNÇÃO PARA ADICIONAR COLABORADOR
  const handleAddEmployee = useCallback(async (newEmp: any) => {
    try {
      const response = await fetch(`${API_URL}/api/colaboradores`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          nome: newEmp.name,
          email: newEmp.email,
          especialidade: newEmp.specialty,
          papel: newEmp.role
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.erro || "Não foi possível adicionar o colaborador.");
      }

      const colab = await response.json();
      
      const novoColaboradorFormatado = {
        id: String(colab.id),
        name: colab.nome,
        email: colab.email || newEmp.email,
        role: (colab.papel as 'supervisor' | 'collaborator' | 'receptionist') || 'collaborator',
        specialty: colab.especialidade,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${colab.nome}`,
        rating: 5.0,
        completedServices: 0
      };

      setEmployees(prev => [...prev, novoColaboradorFormatado]);
      return true; // Retorna sucesso para o front-end
    } catch (error: any) {
      console.error("Erro:", error);
      return error.message; // Retorna a string de erro para o painel mostrar no modal
    }
  }, [token]);

  // 6. FUNÇÃO PARA EXCLUIR COLABORADOR
  const handleDeleteEmployee = useCallback(async (id: string, reallocateToId?: string) => {
    try {
      const url = reallocateToId 
        ? `${API_URL}/api/colaboradores/${id}?reallocateTo=${reallocateToId}` 
        : `${API_URL}/api/colaboradores/${id}`;
        
      const response = await fetch(url, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Erro ao excluir do banco");
      
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      
      if (reallocateToId) {
        setAppointments(prev => prev.map(app => app.assignedEmployeeId === id ? { ...app, assignedEmployeeId: reallocateToId } : app));
      } else {
        setAppointments(prev => prev.filter(app => app.assignedEmployeeId !== id));
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Não foi possível excluir o colaborador.");
    }
  }, [token]);

  // 7. FUNÇÃO PARA EDITAR COLABORADOR
  const handleEditEmployee = useCallback(async (id: string, updatedEmp: any) => {
    try {
      const response = await fetch(`${API_URL}/api/colaboradores/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          nome: updatedEmp.name,
          email: updatedEmp.email,
          especialidade: updatedEmp.specialty,
          papel: updatedEmp.role
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.erro || "Erro ao atualizar no banco.");
      }

      const colab = await response.json();
      
      setEmployees(prev => prev.map(emp => emp.id === id ? { 
        ...emp, name: colab.nome, email: colab.email, specialty: colab.especialidade, 
        role: colab.papel, avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${colab.nome}` 
      } : emp));
      return true;
    } catch (error: any) {
      console.error("Erro:", error);
      return error.message; // Retorna string de erro
    }
  }, [token]);

  // 8. FUNÇÕES DE SERVIÇOS
  const handleAddService = useCallback(async (serviceData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/servicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(serviceData)
      });
      if (!response.ok) throw new Error("Erro");
      const novo = await response.json();
      setServices(prev => [...prev, novo]);
      return true;
    } catch (err) {
      alert("Não foi possível salvar o serviço. Verifique se o nome já existe!");
      return false;
    }
  }, [token]);

  const handleEditService = useCallback(async (id: string, serviceData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/servicos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(serviceData)
      });
      if (!response.ok) throw new Error("Erro");
      const updated = await response.json();
      setServices(prev => prev.map(s => s.id === id ? updated : s));
      return true;
    } catch (error) {
      alert("Não foi possível editar o serviço. Verifique se o nome já existe.");
      return false;
    }
  }, [token]);

  const handleDeleteService = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/servicos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setServices(prev => prev.filter(s => s.id !== id));
    } catch (err) { console.error(err); }
  }, [token]);

  // 9. FUNÇÃO PARA EDITAR CLIENTE
  const handleEditClient = useCallback(async (id: string, updatedData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updatedData)
      });
      if (!response.ok) throw new Error("Erro");
      const updated = await response.json();
      setClients(prev => prev.map(c => c.id === id ? updated : c));
      setAppointments(prev => prev.map(app => 
        app.clientName === updatedData.oldName ? { ...app, clientName: updated.nome, contact: updated.telefone || 'Não informado' } : app
      ));
      return true;
    } catch (error) {
      console.error(error);
      alert("Não foi possível atualizar o cliente.");
      return false;
    }
  }, [token]);

  // 10. FUNÇÃO PARA EXCLUIR CLIENTE
  const handleDeleteClient = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/clientes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Erro");
      
      setClients(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir o cliente.");
      return false;
    }
  }, [token]);

  const staff = useMemo(() => {
    // Repassa todos (Colab e Super) para aparecerem, exceto o admin virtual
    return employees.filter(e => e.id !== 'admin').map(emp => ({
      ...emp,
      completedServices: appointments.filter(
        a => a.assignedEmployeeId === emp.id && a.status === 'completed'
      ).length
    }));
  }, [employees, appointments]);

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} error={loginError} />;
  }

  // Se o Modo TV estiver ativo, renderiza ele em tela cheia (sem Layout de fundo)
  if (activeRoleView === 'tv') {
    return <TVPanelView appointments={appointments} employees={staff} onExit={() => setActiveRoleView(currentUser.role as any)} />;
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
          services={services}
          clients={clients}
          onReassign={handleReassign}
          onAddEmployee={handleAddEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onEditEmployee={handleEditEmployee}
          onAddService={handleAddService}
          onEditService={handleEditService}
          onDeleteService={handleDeleteService}
          onAddAppointment={handleAddAppointment}
          onDeleteAppointment={handleDeleteAppointment}
          onEditAppointment={handleEditAppointment}
          onCompleteAppointment={handleCompleteAppointment}
        />
      ) : activeRoleView === 'receptionist' || currentUser.role === 'receptionist' ? (
        <ReceptionistView 
          currentUser={currentUser}
          employees={staff}
          appointments={appointments}
          services={services}
          clients={clients}
          onAddAppointment={handleAddAppointment}
          onReassign={handleReassign}
          onDeleteAppointment={handleDeleteAppointment}
          onEditAppointment={handleEditAppointment}
          onEditClient={handleEditClient}
          onDeleteClient={handleDeleteClient}
          onCompleteAppointment={handleCompleteAppointment}
        />
      ) : (
        <CollaboratorView 
          currentUser={currentUser}
          employees={staff}
          appointments={appointments}
          services={services}
          clients={clients}
          onAddAppointment={handleAddAppointment}
          onCompleteAppointment={handleCompleteAppointment}
        />
      )}
    </Layout>
  );
}