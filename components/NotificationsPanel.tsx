import React, { useEffect, useState } from 'react';
import { PlayerLeaderboardRow, RoundInfo, NotificationLog } from '../types';
import { 
  Bell, 
  Clock, 
  Megaphone, 
  Check, 
  Copy, 
  ShieldCheck, 
  ShieldAlert, 
  Wifi, 
  Terminal,
  FileSpreadsheet
} from 'lucide-react';

interface NotificationsPanelProps {
  currentRound: RoundInfo;
  nextRound: RoundInfo | null;
  currentStandings: PlayerLeaderboardRow[];
  previousStandings: PlayerLeaderboardRow[] | null;
  realTimeLogs?: NotificationLog[];
  syncHistoryLogs?: { id: string; timestamp: string; matchName: string; changeText: string; previousText: string }[];
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  currentRound,
  nextRound,
  currentStandings,
  previousStandings,
  realTimeLogs = [],
  syncHistoryLogs = [],
}) => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Notification API state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';

  // 1. Calculate and update Bolivian countdown timers for the next round
  useEffect(() => {
    const calculateCountdown = () => {
      const targetRound = nextRound || currentRound;
      const deadlineDate = new Date(targetRound.deadlineISO);
      const now = new Date();
      const diffMs = deadlineDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining('Fase Iniciada | Plazo Cerrado');
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      setTimeRemaining(`${days}d ${hours}h ${minutes}m para el envío de formularios`);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000);
    return () => clearInterval(interval);
  }, [currentRound, nextRound]);

  // 2. Load historical standings & feed changes
  useEffect(() => {
    if (!previousStandings || previousStandings.length === 0) return;

    const newLogs: NotificationLog[] = [];
    const timestamp = new Date().toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Detect if anyone shifted spots
    currentStandings.forEach((curr) => {
      const prevIndex = previousStandings.findIndex(p => p.playerId === curr.playerId);
      if (prevIndex === -1) return;

      const prevRank = previousStandings[prevIndex].rank;
      const currRank = curr.rank;

      if (currRank < prevRank && !curr.isEliminated) {
        newLogs.push({
          id: Math.random().toString(),
          timestamp,
          title: 'Cambio de Posición 📈',
          message: `¡Gran avance! ${curr.playerName} subió del puesto ${prevRank}º al ${currRank}º en el ranking en vivo.`,
          type: 'success',
        });
      } else if (currRank > prevRank && !curr.isEliminated) {
        newLogs.push({
          id: Math.random().toString(),
          timestamp,
          title: 'Desplazamiento 📉',
          message: `${curr.playerName} descendió al puesto ${currRank}º (puesto anterior: ${prevRank}º).`,
          type: 'warning',
        });
      }
    });

    if (newLogs.length > 0) {
      setLogs(prev => [...newLogs, ...prev].slice(0, 30));
    }
  }, [currentStandings]);

  // Initial logs setup
  useEffect(() => {
    const initialAlerts: NotificationLog[] = [
      {
        id: 'init-1',
        timestamp: '12:00:00',
        title: 'Alerta de Plazo Límite ⏰',
        message: 'Aviso de Entrega: Se aproxima el cierre para los formularios. Todo retraso anulará la puntuación.',
        type: 'error',
      },
      {
        id: 'init-2',
        timestamp: '15:15:00',
        title: 'Sincronizador Activo 🔄',
        message: 'Base de datos de respaldo vinculada con la planilla en Google Sheets. Carga veloz desde caché LocalStorage habilitada.',
        type: 'info',
      }
    ];

    setLogs(prev => {
      // Avoid duplicated initial logs
      if (prev.some(l => l.id.startsWith('init-'))) return prev;
      return [...initialAlerts, ...prev];
    });
  }, []);

  // Sync external realTimeLogs if provided
  useEffect(() => {
    if (realTimeLogs && realTimeLogs.length > 0) {
      setLogs(prev => {
        const filteredNew = realTimeLogs.filter(n => !prev.some(p => p.id === n.id));
        return [...filteredNew, ...prev].slice(0, 40);
      });
    }
  }, [realTimeLogs]);

  // Request Notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('La Notification API no es soportada en este navegador.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        new Notification('🔔 ¡Notificaciones de Escritorio Activas!', {
          body: 'A partir de ahora recibirás alertas del navegador al instante si se edita el Google Sheets de la Copa.',
          icon: '/favicon.ico'
        });
      }
    } catch (err) {
      console.error("Error solicitando permisos de notificación:", err);
    }
  };

  // Trigger a fast test system notification
  const triggerTestNotification = () => {
    if (notificationPermission !== 'granted') return;
    
    new Notification('⚽ Copa Extra 2026 - Prueba', {
      body: 'Esta es una notificación push nativa de prueba recibida en tiempo real desde la suite web.',
      icon: '/favicon.ico',
      tag: 'test-notification'
    });
  };



  return (
    <div className="space-y-6" id="notifications-and-logs">
      {/* 🔴 ROW 1: Alerts Countdown & Browser Notification API Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CountDown Limits Panel */}
        <div className="lg:col-span-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
              <Bell className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-swing" />
              <span className="font-bold text-xs uppercase tracking-wider font-mono">Próximo Plazo de Cierre</span>
            </div>

            <div className="mt-4">
              <h4 className="text-xl font-black text-rose-950 dark:text-rose-100 font-mono tracking-tight leading-none">
                {(nextRound || currentRound).name}
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-2 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                Límite: {(nextRound || currentRound).deadline} (Bolivia)
              </p>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 mt-3 leading-relaxed">
              Recordatorio del Reglamento: Todos los pronósticos se entregarán en un único bloque. Formulación parcial será inválida (0 puntos).
            </p>
          </div>

          <div className="mt-6 pt-3 border-t border-rose-200/50 dark:border-rose-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-rose-600/80 dark:text-rose-400/80">Cronómetro en vivo:</span>
            <span className="text-xs bg-rose-200 dark:bg-rose-900/40 text-rose-950 dark:text-rose-200 font-extrabold px-3 py-1.5 rounded-lg border border-rose-300/30 font-mono select-none">
              {timeRemaining}
            </span>
          </div>
        </div>

        {/* Browser Native Notifications (Notification API) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#110c2c] border border-slate-100 dark:border-[#221a48] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-indigo-700 dark:text-amber-400 font-mono flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                Notificaciones Push del Navegador (Notification API)
              </span>
              
              {notificationPermission === 'granted' ? (
                <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-[#00ff66] px-2 py-0.5 rounded-full border border-emerald-500/10 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Suscrito
                </span>
              ) : notificationPermission === 'denied' ? (
                <span className="text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 px-2 py-0.5 rounded-full border border-rose-500/10 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Bloqueado
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/10 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  No Autorizado
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
              Hemos implementado notificaciones push nativas utilizando el <strong className="text-slate-700 dark:text-slate-200">HTML5 Notification API</strong>. Al habilitar los permisos, el navegador te informará con alertas de sistema en tiempo real tan pronto como el administrador actualice los resultados en la suite Google Sheets.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-[#221a48]/40 flex flex-wrap gap-2.5">
            {notificationPermission !== 'granted' ? (
              <button
                onClick={requestNotificationPermission}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Permitir Notificaciones de Escritorio
              </button>
            ) : (
              <button
                onClick={triggerTestNotification}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#1a133d] dark:hover:bg-[#221a4c] text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200/50 dark:border-[#2b215c]/40"
              >
                <Bell className="w-4 h-4 text-indigo-500" />
                Probar Canal de Notificación Push
              </button>
            )}

            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1.5 ml-auto">
              <Wifi className="w-3.5 h-3.5 text-[#00ff66] animate-pulse" />
              Suscripción SSE activa en background
            </div>
          </div>
        </div>

      </div>



      {/* 🔵 NUEVO PANEL: Log de Sincronización (Últimos 5 cambios detectados en Google Sheets) */}
      <div className="bg-white dark:bg-[#110c2c] border border-slate-100 dark:border-[#221a48] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-[#221a48]/40 pb-3">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase font-mono">
              Log de Sincronización (Últimos Marcadores de Google Sheets)
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-[#00ff66] px-2.5 py-1 rounded-full border border-emerald-500/15">
            Auto-sincronizado
          </span>
        </div>

        <div className="space-y-3">
          {!syncHistoryLogs || syncHistoryLogs.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center font-mono bg-slate-50 dark:bg-slate-900/15 rounded-xl border border-dashed border-slate-200/50 dark:border-[#2b215c]/20">
              No se han registrado modificaciones recientes de resultados en Google Sheets. Esto recopila cambios reales detectados durante la sincronización de fondo.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {syncHistoryLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 animate-pulse" />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{log.matchName}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{log.changeText}</div>
                      <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{log.previousText}</div>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-150/40 dark:border-slate-800/40 shrink-0 select-none">
                    {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🔵 ROW 3: Dynamic Activity Logs and live Event stream feed */}
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-sm font-black tracking-tight font-sans text-slate-100">Consola de Notificaciones y Ranking en Vivo</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            Canal SSE Escuchando
          </span>
        </div>

        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="text-xs text-slate-400 py-10 text-center font-mono">
              Esperando simulaciones para reportar cambios en el ranking o actualizaciones...
            </div>
          ) : (
            logs.map((lg) => {
              let tagStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
              if (lg.type === 'success') tagStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
              if (lg.type === 'warning') tagStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
              if (lg.type === 'error') tagStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/30';

              return (
                <div key={lg.id} className="flex gap-3 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-800/70 animate-slide-in hover:bg-slate-800/60 transition-all">
                  <div className="text-slate-500 font-mono text-[10px] shrink-0 pt-0.5">{lg.timestamp}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] uppercase font-mono border font-bold ${tagStyle}`}>
                        {lg.title}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-normal text-xs">{lg.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
