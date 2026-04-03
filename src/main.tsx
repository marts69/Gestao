import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import './index.css';

const SENTRY_DSN = "SUA_DSN_DO_SENTRY_AQUI"; // Insira a chave fornecida pelo painel do Sentry

if (SENTRY_DSN && SENTRY_DSN !== "SUA_DSN_DO_SENTRY_AQUI") {
  // Inicialize o Sentry antes de renderizar a aplicação
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const queryClient = new QueryClient();

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;

  public state: ErrorBoundaryState = { 
    hasError: false, 
    errorMsg: '' 
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMsg: error.message || 'Um erro inesperado ocorreu.' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro React Capturado:', error, errorInfo);
    
    // Registra o erro e a árvore de componentes onde ele ocorreu
    if (SENTRY_DSN && SENTRY_DSN !== "SUA_DSN_DO_SENTRY_AQUI") {
      Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4fdf8] p-4 font-sans">
          <div className="bg-red-50 p-8 rounded-3xl max-w-lg text-center border border-red-200 shadow-xl">
            <h1 className="text-2xl font-serif italic text-red-600 mb-2">Ops! A interface quebrou.</h1>
            <p className="text-gray-600 mb-4">Um dado inesperado do banco de dados causou uma falha na tela:</p>
            <code className="block bg-white p-4 rounded-xl text-red-500 text-xs text-left overflow-auto border border-red-100">
              {this.state.errorMsg}
            </code>
            <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold uppercase tracking-wider transition-colors">
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
