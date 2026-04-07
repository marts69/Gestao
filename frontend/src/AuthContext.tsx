import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Employee } from './types';
import { getApiUrl } from './config/api';

interface AuthContextType {
  currentUser: Employee | null;
  token: string | null;
  loginError: string | null;
  handleLogin: (email: string, pass: string) => Promise<void>;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('spa_token'));
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = useCallback(async (email: string, pass: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: pass })
      });

      if (!response.ok) throw new Error("Credenciais inválidas");

      const data = await response.json();
      
      setToken(data.token);
      localStorage.setItem('spa_token', data.token); // Mantém logado ao dar F5
      
      const loggedUser: Employee = {
        id: String(data.usuario.id),
        name: data.usuario.nome || 'Usuário',
        email: data.usuario.email || email,
        role: data.usuario.papel as 'supervisor' | 'collaborator',
        specialty: data.usuario.especialidade,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${data.usuario.nome || 'usuario'}`,
        rating: 5.0,
        completedServices: 0,
        diasTrabalho: data.usuario.diasTrabalho ?? '1,2,3,4,5,6',
        bloqueios: []
      };
      
      setCurrentUser(loggedUser);
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

  return (
    <AuthContext.Provider value={{ currentUser, token, loginError, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook customizado para facilitar o uso nos componentes
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}