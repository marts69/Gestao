import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Employee } from './types';
import { getApiUrl } from './config/api';

const TOKEN_STORAGE_KEY = 'spa_token';
const USER_STORAGE_KEY = 'spa_user';

const parseStoredUser = (): Employee | null => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const role = parsed.role === 'supervisor' ? 'supervisor' : parsed.role === 'collaborator' ? 'collaborator' : null;
    if (!role || !parsed.id) return null;

    return {
      id: String(parsed.id),
      name: typeof parsed.name === 'string' ? parsed.name : 'Usuário',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      role,
      specialty: typeof parsed.specialty === 'string' ? parsed.specialty : '',
      avatar: typeof parsed.avatar === 'string'
        ? parsed.avatar
        : `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(typeof parsed.name === 'string' ? parsed.name : 'usuario')}`,
      rating: typeof parsed.rating === 'number' ? parsed.rating : 5,
      completedServices: typeof parsed.completedServices === 'number' ? parsed.completedServices : 0,
      diasTrabalho: typeof parsed.diasTrabalho === 'string' ? parsed.diasTrabalho : '1,2,3,4,5,6',
      bloqueios: Array.isArray(parsed.bloqueios) ? parsed.bloqueios : [],
      cargo: typeof parsed.cargo === 'string' ? parsed.cargo : undefined,
      tipoEscala: typeof parsed.tipoEscala === 'string' ? parsed.tipoEscala : undefined,
      folgasDomingoNoMes: typeof parsed.folgasDomingoNoMes === 'number' ? parsed.folgasDomingoNoMes : undefined,
      cargaHorariaSemanal: typeof parsed.cargaHorariaSemanal === 'number' ? parsed.cargaHorariaSemanal : undefined,
      habilidades: Array.isArray(parsed.habilidades) ? parsed.habilidades : undefined,
    };
  } catch {
    return null;
  }
};

const decodeUserFromToken = (token: string | null): Employee | null => {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));

    const id = payload?.id ? String(payload.id) : '';
    if (!id) return null;

    const role = payload?.papel === 'supervisor' ? 'supervisor' : 'collaborator';
    const name = role === 'supervisor' ? 'Supervisor' : 'Colaborador';

    return {
      id,
      name,
      email: '',
      role,
      specialty: '',
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}`,
      rating: 5,
      completedServices: 0,
      diasTrabalho: '1,2,3,4,5,6',
      bloqueios: [],
    };
  } catch {
    return null;
  }
};

interface AuthContextType {
  currentUser: Employee | null;
  token: string | null;
  loginError: string | null;
  handleLogin: (email: string, pass: string) => Promise<void>;
  handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const storedUser = parseStoredUser();
    if (storedUser) return storedUser;
    return decodeUserFromToken(localStorage.getItem(TOKEN_STORAGE_KEY));
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
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
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token); // Mantém logado ao dar F5
      
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
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
      setLoginError(null);
    } catch (err) {
      console.error("Falha na requisição de login:", err);
      setLoginError('E-mail ou senha incorretos.');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
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