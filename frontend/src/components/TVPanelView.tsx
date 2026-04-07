import React, { useState, useEffect, useRef } from 'react';
import { Appointment, Employee } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface TVPanelViewProps {
  appointments: Appointment[];
  employees: Employee[];
  onExit: () => void;
}

export function TVPanelView({ appointments, employees, onExit }: TVPanelViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; description: string; icon: string } | null>(null);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Filtra e organiza os agendamentos de hoje
  const upcoming = appointments
    .filter(a => a.date === todayStr && a.status === 'scheduled')
    .sort((a, b) => a.time.localeCompare(b.time));

  // Busca o Clima automaticamente pela rede (Open-Meteo + IP-API)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current_weather=true`);
        const weatherData = await weatherRes.json();
        
        const temp = Math.round(weatherData.current_weather.temperature);
        const code = weatherData.current_weather.weathercode;
        
        let icon = 'routine'; let description = 'Limpo';
        if (code <= 1) { icon = 'sunny'; description = 'Ensolarado'; }
        else if (code <= 3) { icon = 'partly_cloudy_day'; description = 'Nublado'; }
        else if (code <= 69) { icon = 'rainy'; description = 'Chuvoso'; }
        else if (code <= 79) { icon = 'ac_unit'; description = 'Frio/Neve'; }
        else { icon = 'thunderstorm'; description = 'Tempestade'; }

        setWeather({ temp, description, icon });
      } catch (err) {
        console.error('Erro ao buscar clima:', err);
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000); // Atualiza a cada 30 min
    return () => clearInterval(weatherTimer);
  }, []);

  // Efeito para forçar o Modo Tela Cheia ao abrir
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("O navegador bloqueou a tela cheia automática.", err);
      }
    };
    
    enterFullscreen();

    // Limpeza: Sai da tela cheia quando o componente for fechado
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Escuta mudanças no modo tela cheia para atualizar o ícone do botão
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn("Erro ao tentar entrar em tela cheia:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Lógica para detectar novos agendamentos e tocar o som
  const isFirstRender = useRef(true);
  const prevCount = useRef(upcoming.length);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevCount.current = upcoming.length;
      return;
    }

    if (upcoming.length > prevCount.current) {
      // Toca um som suave de notificação elegante
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('O áudio não pôde ser reproduzido automaticamente:', e));
    }
    
    prevCount.current = upcoming.length;
  }, [upcoming.length]);

  return (
    <div className="min-h-screen bg-[#001410] text-white p-8 md:p-16 flex flex-col fixed inset-0 z-[200] antialiased">
      <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-8">
        <div className="flex items-center gap-6">
          <span className="material-symbols-outlined text-6xl text-[#afefdd]">spa</span>
          <h1 className="text-5xl font-serif italic text-[#afefdd]">Serenidade Spa</h1>
        </div>
        <div className="text-right flex items-center gap-6">
        {weather && (
          <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm mr-4">
            <span className="material-symbols-outlined text-4xl text-[#afefdd]">{weather.icon}</span>
            <div className="text-left">
              <p className="text-2xl font-bold leading-none">{weather.temp}°C</p>
              <p className="text-[10px] uppercase tracking-widest text-white/60 mt-1">{weather.description}</p>
            </div>
          </div>
        )}
        <button onClick={toggleFullscreen} className="opacity-20 hover:opacity-100 transition-opacity" title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}><span className="material-symbols-outlined text-4xl">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span></button>
          <button onClick={onExit} className="opacity-20 hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-4xl">close</span></button>
          <h2 className="text-6xl font-light tabular-nums">{currentTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</h2>
        </div>
      </div>
      
      <h3 className="text-2xl font-bold uppercase tracking-[0.2em] text-[#afefdd] mb-10">Próximos Atendimentos</h3>
      
      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {upcoming.slice(0, 5).map(app => {
            const emp = employees.find(e => e.id === app.assignedEmployeeId);
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
                key={app.id} 
                className="bg-white/5 border border-white/10 p-8 rounded-3xl flex justify-between items-center shadow-2xl"
              >
                <div className="flex items-center gap-10">
                  <div className="text-6xl font-bold text-[#afefdd] tabular-nums">{app.time}</div>
                  <div className="w-1.5 h-20 bg-[#afefdd]/30 rounded-full"></div>
                  <div>
                    <h4 className="text-4xl font-bold text-white mb-2">{app.clientName}</h4>
                    <p className="text-2xl text-white/60">{app.services.join(', ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-[#afefdd] uppercase tracking-widest">{emp?.name?.split(' ')[0] || 'Não atribuído'}</p>
                  <p className="text-xl text-white/50">{emp?.specialty}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {upcoming.length === 0 && (
          <div className="text-center py-32 opacity-50 flex flex-col items-center"><span className="material-symbols-outlined text-8xl mb-6">event_available</span><p className="text-4xl font-light">Nenhum atendimento no momento.</p></div>
        )}
      </div>
    </div>
  );
}