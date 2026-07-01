import { useState, useEffect, useRef } from 'react';
import { ALL_DEFAULT_MATCHES } from './data/defaultMatches';
import { INITIAL_PLAYERS } from './data/playersSeed';
import { ROUNDS, calculateStandings } from './utils/rulesEngine';
import { syncFromGoogleSheets } from './utils/sheetsSync';
import { Match, Player, PlayerLeaderboardRow, RoundId, RoundInfo } from './types';
import { Leaderboard } from './components/Leaderboard';
import { MatchesList } from './components/MatchesList';
import { PhaseKings } from './components/PhaseKings';
import { RulesSection } from './components/RulesSection';
import { NotificationsPanel } from './components/NotificationsPanel';
import { ScenarioAnalyzer } from './components/ScenarioAnalyzer';
import { SmartFixture } from './components/SmartFixture';
import { PlayerComparison } from './components/PlayerComparison';
import { MySummaryModal } from './components/MySummaryModal';
import { AnimatePresence, motion } from 'motion/react';
import html2canvas from 'html2canvas';
import {
  Trophy,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Sparkles,
  Menu,
  X,
  Bell,
  ArrowRightLeft,
  Settings,
  Database,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  // --- STATE CORE DATA ---
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem('copa_extra_cached_matches2026');
      if (saved) {
        let parsed = JSON.parse(saved) as Match[];
        const hasPlaceholders = parsed.some(m => 
          m.round === 'dieciseisavos' && 
          (m.local.startsWith('Clasificado') || 
           m.local === 'Clasificado 1' || 
           m.local.includes('°') || 
           m.visitor.includes('°') || 
           m.visitor === '2J' || 
           m.visitor.includes('3E') || 
           m.visitor.includes('/') || 
           m.visitor.length <= 3)
        );
        if (hasPlaceholders) {
          const otherRounds = parsed.filter(m => m.round !== 'dieciseisavos');
          const freshDieciseisavos = ALL_DEFAULT_MATCHES.filter(m => m.round === 'dieciseisavos');
          parsed = [...otherRounds, ...freshDieciseisavos];
          localStorage.setItem('copa_extra_cached_matches2026', JSON.stringify(parsed));
        }
        return parsed;
      }
      return ALL_DEFAULT_MATCHES;
    } catch {
      return ALL_DEFAULT_MATCHES;
    }
  });
  // We make a deep copy of players seed to avoid mutations of imports
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('copa_extra_cached_players2026');
      return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    } catch {
      return JSON.parse(JSON.stringify(INITIAL_PLAYERS));
    }
  });
  
  // --- SELECTION STATE ---
  const [selectedRoundId, setSelectedRoundId] = useState<RoundId>('dieciseisavos');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tabla' | 'fixture' | 'simulador' | 'comparador' | 'reyes' | 'analizador' | 'reglamento' | 'notificaciones'>('tabla');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [summaryPlayerId, setSummaryPlayerId] = useState<string | null>(null);

  // --- DARK MODE STATE ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);
  
  // --- GOOGLE SHEETS SYNC STATE ---
  const [sheetId, setSheetId] = useState<string>(() => {
    return localStorage.getItem('copa_extra_sheet_id2026') || '1m9oic9sueHEMgskjnufT0aRhz1KEVYD6IjdKTaR8l3I';
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncResultMsg, setSyncResultMsg] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('copa_extra_last_sync_time2026') || '';
  });

  // --- INTERACTIVE RANKING NOTIFICATIONS TICKERS ---
  const [previousStandings, setPreviousStandings] = useState<PlayerLeaderboardRow[] | null>(null);
  
  // Real-time EventSource listener console logs (loaded dynamically)
  const [sseLogs, setSseLogs] = useState<{ id: string; timestamp: string; title: string; message: string; type: 'success' | 'warning' | 'info' | 'error' }[]>([]);

  // --- SYNC HISTORIC LOG OF SNAPSHOT CHANGES ---
  const [syncHistoryLogs, setSyncHistoryLogs] = useState<{ id: string; timestamp: string; matchName: string; changeText: string; previousText: string }[]>(() => {
    try {
      const saved = localStorage.getItem('copa_extra_score_sync_history2026');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- NATIVE NOTIFICATION PROMPT STATE ---
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('copa_extra_notif_banner_dismissed2026');
      if (dismissed === 'true') return false;
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default';
    } catch {
      return false;
    }
  });

  // --- STANDINGS CALCULATION ---
  const standingsByRound = calculateStandings(matches, players);
  const currentRoundInfo = ROUNDS.find(r => r.id === selectedRoundId)!;
  const currentRoundIndex = ROUNDS.findIndex(r => r.id === selectedRoundId);
  const nextRoundInfo = currentRoundIndex !== -1 && currentRoundIndex < ROUNDS.length - 1
    ? ROUNDS[currentRoundIndex + 1]
    : null;
  const currentStandings = standingsByRound[selectedRoundId] || [];

  const activeFocusPlayerId = selectedPlayerId && players.some(p => p.id === selectedPlayerId)
    ? selectedPlayerId
    : (players[0]?.id || '');
  const selectedPlayer = players.find(p => p.id === activeFocusPlayerId);

  // Capture standings before they change to show difference in loggingconsole
  const prevStandingsRef = useRef<Record<RoundId, PlayerLeaderboardRow[]>>(standingsByRound);

  // Trigger effect to let notifications know about ranking updates
  useEffect(() => {
    const historicalStandings = prevStandingsRef.current[selectedRoundId] || [];
    setPreviousStandings(historicalStandings);
    
    // Save current as ref for next change
    prevStandingsRef.current = standingsByRound;
  }, [matches, selectedRoundId]);

  // Register Service Worker for native push notification support, optimized for mobile (PWA readiness)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('[Service Worker] Registrado exitosamente con scope:', registration.scope);
        })
        .catch(error => {
          console.error('[Service Worker] Registro fallido:', error);
        });
    }
  }, []);

  // --- PERIODIC BACKGROUND REFRESH CON COMPROBACIÓN DE CACHÉ AGRESIVA ---
  useEffect(() => {
    // 1. Validar la versión de la caché de partidos contra el servidor de forma agresiva
    async function checkCacheValidityAndSync() {
      try {
        console.log('[Cache Engine] Verificando validez de la caché con el servidor...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds limit

        const res = await fetch('/api/sheet-version', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const versionData = await res.json();
          if (versionData.success) {
            const serverCachedAt = versionData.cachedAt;
            const localCachedAtStr = localStorage.getItem('copa_extra_cached_at_v2026');
            const localCachedAt = localCachedAtStr ? parseInt(localCachedAtStr, 10) : 0;

            console.log(`[Cache Engine] Server timestamp: ${serverCachedAt}, Local cached timestamp: ${localCachedAt}`);

            if (serverCachedAt === 0 || serverCachedAt > localCachedAt || !localCachedAt) {
              console.log('[Cache Engine] Caché antigua o nula detectada. Forzando sincronización agresiva y limpieza inmediata...');
              // Force background load bypassing memory cache
              await handleSyncGoogleSheet(true, true);
            } else {
              console.log('[Cache Engine] El almacenamiento local está completamente actualizado. Evitando sincronización costosa inicial.');
              // Soft background sync just to keep in sync
              await handleSyncGoogleSheet(true, false);
            }
          } else {
            await handleSyncGoogleSheet(true, false);
          }
        } else {
          await handleSyncGoogleSheet(true, false);
        }
      } catch (err) {
        console.warn('[Cache Engine] Error o timeout comprobando versión de planilla. Usando caché local y sincronizando suavemente:', err);
        await handleSyncGoogleSheet(true, false);
      }
    }

    checkCacheValidityAndSync();

    // Refrescar automáticamente cada 5 minutos de manera silenciosa (300000ms)
    const timer = setInterval(() => {
      console.log('Refrescando datos de Google Sheets de manera silenciosa...');
      handleSyncGoogleSheet(true, false);
    }, 300000);

    return () => clearInterval(timer);
  }, [sheetId]);

  // Stale closure shield: always store the latest sync handler in a mutable reference
  const syncRef = useRef(handleSyncGoogleSheet);
  useEffect(() => {
    syncRef.current = handleSyncGoogleSheet;
  }, [handleSyncGoogleSheet]);

  // --- SSE REAL-TIME PUSH NOTIFICATIONS LISTENER ---
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          console.log('[SSE Handshake Success]', data.message);
        } else if (data.type === 'sheet-updated') {
          console.log('[SSE Event Received] Planilla editada, disparando sincronización forzada...', data);
          
          // 1. Silent automatic sheet synchronization in background (forced update)
          if (syncRef.current) {
            syncRef.current(true, true);
          }
          
          // 2. Add real-time event logs
          const timestamp = new Date().toLocaleTimeString('es-BO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          const newLog = {
            id: Math.random().toString(),
            timestamp,
            title: '¡Sincronización Real! ⚡',
            message: 'La planilla de Google Sheets acaba de ser editada. Se ha forzado una actualización en segundo plano de todos los partidos y predicciones.',
            type: 'success' as const
          };
          
          setSseLogs(prev => [newLog, ...prev]);

          // 3. Dispatch native Service Worker Notification for background optimization
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: '⚽ Copa Extra 2026',
              body: 'La tabla de posiciones se ha actualizado en tiempo real con datos de Google Sheets.',
              tag: 'copa-extra-sheet-update'
            });
          } else if ('Notification' in window && Notification.permission === 'granted') {
            // Fallback for desktop standard Notification API
            new Notification('🏆 Copa Extra: ¡Tabla Actualizada!', {
              body: 'La tabla de posiciones se ha actualizado en tiempo real con datos de Google Sheets.',
              icon: '/favicon.ico',
              tag: 'copa-extra-sheet-update'
            });
          }
        }
      } catch (err) {
        console.error('Error procesando evento SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Conexión SSE errática, reestableciendo enlace...', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // --- ACTIONS ---
  
  /**
   * Updates an individual match result (simulated or synced) and recalculates standings.
   */
  const handleUpdateMatchResult = (
    matchId: string,
    localGoals: number | null,
    visitorGoals: number | null,
    advancingTeam?: string | null
  ) => {
    setMatches(prevMatches =>
      prevMatches.map(m => {
        if (m.id === matchId) {
          return {
            ...m,
            localGoals,
            visitorGoals,
            advancingTeam: advancingTeam || null
          };
        }
        return m;
      })
    );
  };

  /**
   * Syncs match results in real-time from the designated Google Sheet ID
   */
  async function handleSyncGoogleSheet(isSilent: boolean = false, force: boolean = false) {
    if (!sheetId.trim()) {
      if (!isSilent) {
        setSyncStatus('error');
        setSyncResultMsg('Por favor introduce un Spreadsheet ID válido.');
      }
      return;
    }

    if (!isSilent) {
      setSyncStatus('loading');
      setSyncResultMsg('');
    }

    try {
      const res = await syncFromGoogleSheets(sheetId, force);
      if (res.success && res.matches) {
        let updateCount = 0;
        const scoreChangesDetected: { id: string; timestamp: string; matchName: string; changeText: string; previousText: string }[] = [];
        const currentCheckTimestamp = new Date().toLocaleTimeString('es-BO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        const normalizeTeamName = (name: string): string => {
          if (!name) return '';
          let norm = name.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // removes accents
            .replace(/[^a-z0-9]/g, "")      // keeps only alphanumeric
            .trim();

          // Map common synonyms and spelling variations
          if (norm === 'arabiasaudita' || norm === 'arabiasaudi') return 'arabiasaudi';
          if (norm === 'republicacheca' || norm === 'chequia') return 'chequia';
          if (norm === 'estadosunidos' || norm === 'eeuu' || norm === 'usa') return 'estadosunidos';
          if (norm === 'paisesbajos' || norm === 'holanda') return 'paisesbajos';
          if (norm === 'coreadelsur' || norm === 'coreadesur') return 'coreadelsur';
          if (norm === 'sudafrica' || norm === 'africadelsur') return 'sudafrica';
          if (norm === 'costademarfil' || norm === 'marfil') return 'costademarfil';
          if (norm === 'nuevazelanda' || norm === 'nuevazelandia') return 'nuevazelanda';
          if (norm === 'caboverde' || norm === 'cabo') return 'caboverde';
          return norm;
        };

        setMatches(prevMatches => {
          const updated = prevMatches.map(m => {
            const mLocalNorm = normalizeTeamName(m.local);
            const mVisitorNorm = normalizeTeamName(m.visitor);

            // Soft-match corresponding row by home & visitor teams
            const syncedRow = res.matches!.find(s => {
              const sLocalNorm = normalizeTeamName(s.local || '');
              const sVisitorNorm = normalizeTeamName(s.visitor || '');
              return (sLocalNorm === mLocalNorm && sVisitorNorm === mVisitorNorm) ||
                     (sLocalNorm === mVisitorNorm && sVisitorNorm === mLocalNorm);
            });
            
            if (syncedRow) {
              const hasGoalsChanged = syncedRow.localGoals !== m.localGoals || syncedRow.visitorGoals !== m.visitorGoals;
              if (hasGoalsChanged) {
                updateCount++;
                const oldGoalsStr = (m.localGoals === null ? '-' : m.localGoals) + ' : ' + (m.visitorGoals === null ? '-' : m.visitorGoals);
                const newGoalsStr = (syncedRow.localGoals === null ? '-' : syncedRow.localGoals) + ' : ' + (syncedRow.visitorGoals === null ? '-' : syncedRow.visitorGoals);
                
                scoreChangesDetected.push({
                  id: Math.random().toString(),
                  timestamp: currentCheckTimestamp,
                  matchName: `${m.local} vs ${m.visitor}`,
                  changeText: `Marcador actualizado: ${newGoalsStr}`,
                  previousText: `Anterior: ${oldGoalsStr}`
                });
              }
              
              return {
                ...m,
                localGoals: syncedRow.localGoals,
                visitorGoals: syncedRow.visitorGoals,
                // propagate advancing if available
                advancingTeam: syncedRow.advancingTeam || m.advancingTeam
              };
            }
            return m;
          });

          // Core Persistence: save synced matches immediately to LocalStorage
          try {
            localStorage.setItem('copa_extra_cached_matches2026', JSON.stringify(updated));
          } catch (storageErr) {
            console.error("No se pudo guardar la caché de partidos:", storageErr);
          }
          return updated;
        });

        // Guardar timestamp de la caché para saber si está desactualizada en la sig carga
        if (typeof res.cachedAt === 'number') {
          try {
            localStorage.setItem('copa_extra_cached_at_v2026', String(res.cachedAt));
          } catch (storageErr) {
            console.error("No se pudo guardar versión de la caché:", storageErr);
          }
        }

        // Agregar al historial de cambios en bitácora de notificaciones
        if (scoreChangesDetected.length > 0) {
          setSyncHistoryLogs(prev => {
            const updatedLogs = [...scoreChangesDetected, ...prev].slice(0, 5);
            try {
              localStorage.setItem('copa_extra_score_sync_history2026', JSON.stringify(updatedLogs));
            } catch (storageErr) {
              console.error("No se pudo persistir historial de cambios:", storageErr);
            }
            return updatedLogs;
          });
        }

        if (res.players && res.players.length > 0) {
          setPlayers(res.players);
          try {
            localStorage.setItem('copa_extra_cached_players2026', JSON.stringify(res.players));
          } catch (storageErr) {
            console.error("No se pudo guardar la caché de jugadores:", storageErr);
          }
        }

        const timestamp = new Date().toLocaleTimeString('es-BO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        setLastSyncTime(timestamp);
        try {
          localStorage.setItem('copa_extra_last_sync_time2026', timestamp);
          localStorage.setItem('copa_extra_sheet_id2026', sheetId);
        } catch (storageErr) {
          console.error("No se pudo guardar los metadatos de sincronización:", storageErr);
        }

        if (!isSilent) {
          setSyncStatus('success');
          setSyncResultMsg(`Sincronización exitosa con Google Sheets (Fase de Grupos y Predicciones). Se actualizaron ${updateCount} marcadores y ${res.players?.length || 0} participantes.`);
          // Remove success banner after 6 sec
          setTimeout(() => setSyncStatus('idle'), 6000);
        }
      } else {
        if (!isSilent) {
          setSyncStatus('error');
          setSyncResultMsg(res.error || 'La hoja de cálculo no se encuentra o el ID es inválido.');
        }
      }
    } catch (err: any) {
      if (!isSilent) {
        setSyncStatus('error');
        setSyncResultMsg(err.message || String(err));
      }
    }
  };

  const handleRequestNativeNotification = async () => {
    if (!('Notification' in window)) {
      alert('Las notificaciones nativas no son soportadas en este navegador actual.');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const swReg = await navigator.serviceWorker.getRegistration();
        if (swReg) {
          swReg.showNotification('🏆 Copa Extra 2026', {
            body: '¡Notificaciones de escritorio y celular habilitadas con éxito!',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'copa-extra-registered'
          });
        } else {
          new Notification('🏆 Copa Extra 2026', {
            body: '¡Notificaciones de escritorio y celular habilitadas con éxito!',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'copa-extra-registered'
          });
        }
      }
      setShowNotificationBanner(false);
    } catch (err) {
      console.error("Error al habilitar notificaciones nativas:", err);
    }
  };

  const handleDismissNotificationBanner = () => {
    setShowNotificationBanner(false);
    try {
      localStorage.setItem('copa_extra_notif_banner_dismissed2026', 'true');
    } catch (err) {
      console.error(err);
    }
  };

  // --- STATS EXTRACTION ---
  const totalMatchesCount = matches.filter(m => m.round === selectedRoundId).length;
  const playedMatchesCount = matches.filter(m => m.round === selectedRoundId && m.localGoals !== null).length;
  const activePlayersCount = players.filter(p => {
    // A player is active if they are not marked eliminated in a round prior to or equal to current
    const row = currentStandings.find(r => r.playerId === p.id);
    return row ? !row.isEliminated : true;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07051e] text-slate-800 dark:text-slate-100 pb-16 font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-300">
       {/* ⚽🚀 PREMIUM FIFA WORLD CUP 2026 BRAND IDENTITY HEADER WITH INTEGRATED MENU */}
      <header className="bg-[#090724] bg-gradient-to-r from-[#040316] via-[#09072a] to-[#120e4f] border-b border-indigo-950 sticky top-0 z-30 shadow-xl" id="app-nav-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 min-h-[4.5rem] flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <div className="bg-gradient-to-tr from-[#00ff66] via-teal-500 to-[#0055ff] p-1.5 sm:p-2 rounded-xl shadow-lg shadow-emerald-500/10 text-white animate-pulse">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                <span className="text-[8px] sm:text-[9.5px] uppercase font-mono tracking-widest font-black text-[#00ff66] bg-emerald-500/15 border border-[#00ff66]/25 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                  MUNDIAL 2026
                </span>
                <span className="text-[8px] sm:text-[9.5px] uppercase font-mono tracking-widest font-black text-amber-300 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1 h-1 bg-[#00ff66] rounded-full animate-ping" />
                  OFICIAL
                </span>
              </div>
              <h1 className="text-xs sm:text-base font-black text-white tracking-tight flex items-center gap-1 mt-0.5 font-display uppercase">
                TORNEO DE PRONÓSTICOS
              </h1>
            </div>
          </div>

          {/* --- INTEGRATED DESKTOP NAVIGATION TABS (Shown only on Desktop md and up) --- */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-none py-1.5">
            
            <button
              id="tab-btn-positions"
              onClick={() => setActiveTab('tabla')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === 'tabla'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-[#00ff66] border border-[#00ff66]/35 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Trophy className="w-3 h-3" />
              TABLA
            </button>

            <button
              id="tab-btn-fixture"
              onClick={() => setActiveTab('fixture')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === 'fixture'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-[#00ff66] border border-[#00ff66]/35 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Calendar className="w-3 h-3" />
              FIXTURE
            </button>

            <button
              id="tab-btn-simulador"
              onClick={() => setActiveTab('simulador')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === 'simulador'
                  ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/35 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              PRONÓSTICOS
            </button>

            <button
              id="tab-btn-comparador"
              onClick={() => setActiveTab('comparador')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === 'comparador'
                  ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/35 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" />
              H2H
            </button>

            <button
              id="tab-btn-reyes"
              onClick={() => setActiveTab('reyes')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === 'reyes'
                  ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/35 shadow-xs'
                  : 'text-pink-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              REYES
            </button>

            <button
              id="tab-btn-analizador"
              onClick={() => setActiveTab('analizador')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === 'analizador'
                  ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/35 shadow-xs'
                  : 'text-indigo-200 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              ANALIZADOR
            </button>

            <button
              id="tab-btn-notificaciones"
              onClick={() => setActiveTab('notificaciones')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === 'notificaciones'
                  ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/35 shadow-xs'
                  : 'text-rose-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Bell className="w-3 h-3" />
              BITÁCORA
            </button>

            <button
              id="tab-btn-reglamento"
              onClick={() => setActiveTab('reglamento')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black tracking-wide font-mono transition-all shrink-0 cursor-pointer ${
                activeTab === 'reglamento'
                  ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/35 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <HelpCircle className="w-3 h-3" />
              REGLAS
            </button>

          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button (Desktop & Mobile visible) */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
              aria-label="Theme toggle"
              className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
            >
              {darkMode ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300" />
              )}
            </button>

            {/* --- C. INTEGRATED COLLAPSIBLE MENU TRIGGER (Shown only on Mobile/Tablet) --- */}
            <div className="block md:hidden relative font-mono">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#110c3f] text-white rounded-xl text-[10.5px] font-black tracking-wide font-mono transition-all border border-indigo-950 shadow-md cursor-pointer"
              >
              {activeTab === 'tabla' && <Trophy className="w-3.5 h-3.5 text-[#00ff66]" />}
              {activeTab === 'fixture' && <Calendar className="w-3.5 h-3.5 text-[#00ff66]" />}
              {activeTab === 'simulador' && <CheckCircle className="w-3.5 h-3.5 text-[#00ff66]" />}
              {activeTab === 'comparador' && <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />}
              {activeTab === 'reyes' && <Sparkles className="w-3.5 h-3.5 text-pink-350" />}
              {activeTab === 'analizador' && <TrendingUp className="w-3.5 h-3.5 text-emerald-450" />}
              {activeTab === 'notificaciones' && <Bell className="w-3.5 h-3.5 text-rose-450" />}
              {activeTab === 'reglamento' && <HelpCircle className="w-3.5 h-3.5 text-blue-300" />}
              <span className="uppercase text-slate-100">
                {
                  activeTab === 'tabla' ? 'Tabla' :
                  activeTab === 'fixture' ? 'Fixture' :
                  activeTab === 'simulador' ? 'Pronósticos' :
                  activeTab === 'comparador' ? 'Comparador' :
                  activeTab === 'reyes' ? 'Reyes' :
                  activeTab === 'analizador' ? 'Analizador' :
                  activeTab === 'notificaciones' ? 'Bitácora' :
                  'Reglas'
                }
              </span>
              {isMobileMenuOpen ? <X className="w-3.5 h-3.5 text-[#00ff66]" /> : <Menu className="w-3.5 h-3.5 text-slate-300" />}
            </button>

            {/* Collapsible dropdown menu panel for mobile */}
            {isMobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 p-2 bg-[#0b082e] border border-indigo-950 rounded-xl shadow-2xl z-50 flex flex-col gap-1 animate-fade-in text-right">
                <button
                  onClick={() => { setActiveTab('tabla'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[11px] font-bold font-mono transition-all cursor-pointer ${activeTab === 'tabla' ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> TABLA OFICIAL
                </button>
                <button
                  onClick={() => { setActiveTab('fixture'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[11px] font-bold font-mono transition-all cursor-pointer ${activeTab === 'fixture' ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                  <Calendar className="w-3.5 h-3.5 text-[#00ff66]" /> FIXTURE OFICIAL
                </button>
                <button
                  onClick={() => { setActiveTab('simulador'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[11px] font-bold font-mono transition-all cursor-pointer ${activeTab === 'simulador' ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400" /> SIMULADOR Y PRÓN.
                </button>
                <button
                  onClick={() => { setActiveTab('comparador'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[11px] font-bold font-mono transition-all cursor-pointer ${activeTab === 'comparador' ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" /> COMPARADOR H2H
                </button>
                <button
                  onClick={() => { setActiveTab('reyes'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[11px] font-bold font-mono transition-all cursor-pointer ${activeTab === 'reyes' ? 'bg-[#00ff66]/10 text-pink-300 border border-[#00ff66]/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-300" /> REYES DE FASE
                </button>
                <button
                  onClick={() => { setActiveTab('analizador'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[11px] font-bold font-mono transition-all cursor-pointer ${activeTab === 'analizador' ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20' : 'text-indigo-200 hover:bg-white/5 border border-transparent'}`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> ANALIZADOR
                </button>
                <button
                  onClick={() => { setActiveTab('notificaciones'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[11px] font-bold font-mono transition-all cursor-pointer ${activeTab === 'notificaciones' ? 'bg-[#00ff66]/10 text-rose-300 border border-[#00ff66]/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                  <Bell className="w-3.5 h-3.5 text-rose-450" /> BITÁCORA Y ALERTAS
                </button>
                <button
                  onClick={() => { setActiveTab('reglamento'); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-[11px] font-bold font-mono transition-all cursor-pointer ${activeTab === 'reglamento' ? 'bg-[#00ff66]/10 text-blue-300 border border-[#00ff66]/20' : 'text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-300" /> REGLAMENTO
                </button>
              </div>
            )}
          </div>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Banner de Solicitud de Notificaciones Push (Optimizado para Celulares PWA / Notificaciones de Escritorio) */}
        {showNotificationBanner && (
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-950 text-white rounded-2xl p-4 md:p-5 shadow-lg border border-indigo-600/50 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn" id="pwa-push-banner">
            <div className="flex items-start gap-3">
              <div className="bg-white/10 p-2.5 rounded-xl shrink-0 text-amber-400">
                <Bell className="w-5 h-5 animate-swing" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider font-mono text-amber-300">¿Habilitar Alertas Push en Vivo?</h4>
                <p className="text-xs text-indigo-100 mt-1 leading-relaxed max-w-3xl">
                  ¡No te pierdas de nada! Recibe notificaciones push nativas al celular o computador tan pronto como se actualicen los goles de la Copa en Google Sheets, ideal para seguir la tabla en vivo.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 font-mono">
              <button
                onClick={handleDismissNotificationBanner}
                className="px-3 py-1.5 hover:bg-white/10 text-indigo-200 hover:text-white font-mono font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer"
              >
                No, gracias
              </button>
              <button
                onClick={handleRequestNativeNotification}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-[#090725] font-black font-sans text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-95"
              >
                Habilitar Notificaciones
              </button>
            </div>
          </div>
        )}
        
        {/* --- 1. TABLA OFICIAL VIEW --- */}
        {activeTab === 'tabla' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* 🏅 Phase Selector Nav Tabs (Optimized: select dropdown on mobile, styled pills on desktop) */}
            <section className="bg-white rounded-2xl border border-slate-100 p-3 shadow-xs" id="round-selection-bar">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Mobile Round Selection Menu */}
                <div className="block sm:hidden w-full">
                  <span className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-wider block mb-1">
                    FASE DEL TORNEO
                  </span>
                  <select
                    id="round-select-mobile"
                    value={selectedRoundId}
                    onChange={(e) => setSelectedRoundId(e.target.value as RoundId)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-black border border-indigo-950 focus:ring-2 focus:ring-emerald-400 outline-none shadow-md"
                  >
                    {ROUNDS.map((r) => (
                      <option key={r.id} value={r.id} className="font-mono bg-slate-900 text-white">
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desktop Round Selection Buttons */}
                <div className="hidden sm:flex flex-wrap items-center gap-1">
                  {ROUNDS.map((r) => {
                    const isActive = selectedRoundId === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRoundId(r.id)}
                        className={`px-4 py-2 rounded-xl font-mono text-xs font-black transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-[#090724] text-[#00ff66] shadow-md border border-emerald-500/20'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>

                {lastSyncTime && (
                  <div className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1 self-start sm:self-center">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    Actualizado: {lastSyncTime} (UTC-4 Bolivia)
                  </div>
                )}
              </div>
            </section>

            {/* Leaderboard Table */}
            <div className="relative">
              <div className="absolute -top-3 left-4 bg-amber-400 text-amber-950 text-[10px] font-extrabold font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border-2 border-slate-50 shadow-sm z-10 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-950 animate-bounce" /> Tabla Oficial en Vivo
              </div>
              <Leaderboard 
                round={currentRoundInfo} 
                rows={currentStandings} 
                matches={matches}
                previousRows={previousStandings || undefined}
                selectedPlayerId={activeFocusPlayerId}
                onSelectPlayer={(id) => {
                  setSelectedPlayerId(id);
                }}
                onShowSummary={(id) => {
                  setSummaryPlayerId(id);
                }}
              />
            </div>

            {/* Quick Bento Stats Dashboard */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-bento-grid">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
                <div className="bg-amber-50 rounded-xl p-3 text-amber-600">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-slate-400 uppercase font-medium">Bote en juego</div>
                  <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">Bs. 550,00</div>
                  <div className="text-[10px] text-slate-500 font-medium">100% de aportes (11 jug.)</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
                <div className="bg-blue-50 rounded-xl p-3 text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-slate-400 uppercase font-medium">Jugadores Activos</div>
                  <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                    {activePlayersCount} / 11
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Se eliminan {currentRoundInfo.eliminatedCount} al final de ronda
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
                <div className="bg-emerald-50 rounded-xl p-3 text-[#00b33c]">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-slate-400 uppercase font-medium">Partidos Jugados</div>
                  <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                    {playedMatchesCount} / {totalMatchesCount}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Simulaciones incluidas
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
                <div className="bg-rose-50 rounded-xl p-3 text-rose-600">
                  <Clock className="w-6 h-6 animate-swing" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-slate-400 uppercase font-medium">Próximo Cierre</div>
                  {nextRoundInfo ? (
                    <div className="mt-0.5 leading-tight" title={`${nextRoundInfo.name}: ${nextRoundInfo.deadline}`}>
                      <span className="block text-[11px] font-extrabold text-rose-950 truncate">
                        {nextRoundInfo.name}
                      </span>
                      <span className="block text-[11px] font-bold text-[#e11d48] truncate mt-0.5">
                        {nextRoundInfo.deadline}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs font-extrabold text-[#e11d48] mt-0.5">
                      Torneo Finalizado
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Hora límite boliviana</div>
                </div>
              </div>
            </section>

            {/* 📸 DESCARGAR TABLA DE POSICIONES EN JPG */}
            <section className="bg-gradient-to-r from-[#090724] to-[#120e4f] rounded-2xl border border-indigo-950 p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center justify-center sm:justify-start gap-1.5 font-mono">
                  <FileSpreadsheet className="w-4 h-4 text-[#00ff66]" />
                  Compartir Clasificación en WhatsApp
                </h4>
                <p className="text-xs text-indigo-200">
                  Genera automáticamente un reporte en formato imagen PNG de alta resolución de la tabla de posiciones actual de esta fase para descargar y enviar a tus grupos.
                </p>
              </div>
              <button
                onClick={async () => {
                  const element = document.getElementById('leaderboard-section');
                  if (!element) return;

                  // 1. Get all style and link elements on the live page
                  const styleElements = Array.from(document.querySelectorAll('style'));
                  const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];

                  // 2. Backup their original contents and states
                  const styleBackups = styleElements.map(el => ({
                    el,
                    originalText: el.textContent || ''
                  }));
                  const linkBackups = linkElements.map(el => ({
                    el,
                    originalDisabled: el.disabled
                  }));

                  // 3. Keep track of original window.getComputedStyle
                  const originalGetComputedStyle = window.getComputedStyle;

                  try {
                    // Helper inside onClick to avoid cluttering module scope
                    const oklabToRgb = (L: number, a: number, b: number): [number, number, number] => {
                      const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
                      const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
                      const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

                      const l = l_ * l_ * l_;
                      const m = m_ * m_ * m_;
                      const s = s_ * s_ * s_;

                      const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
                      const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
                      const b_Result = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
                      
                      const rGamma = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
                      const gGamma = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
                      const bGamma = b_Result <= 0.0031308 ? 12.92 * b_Result : 1.055 * Math.pow(b_Result, 1 / 2.4) - 0.055;

                      const R = Math.max(0, Math.min(255, Math.round(rGamma * 255)));
                      const G = Math.max(0, Math.min(255, Math.round(gGamma * 255)));
                      const B = Math.max(0, Math.min(255, Math.round(bGamma * 255)));
                      return [R, G, B];
                    };

                    const convertCssString = (css: string): string => {
                      if (!css || typeof css !== 'string') return css;
                      
                      let result = css;
                      
                      try {
                        result = result.replace(/oklch\(([^)]+)\)/gi, (match, content) => {
                          try {
                            const parts = content.replace(/,/g, ' ').trim().split(/[\s/]+/).filter(Boolean);
                            let L = parseFloat(parts[0]) || 0;
                            if (parts[0]?.includes('%')) L /= 100;
                            let C = parseFloat(parts[1]) || 0;
                            if (parts[1]?.includes('%')) C /= 100;
                            let H = parseFloat(parts[2]) || 0;
                            if (parts[2]?.includes('deg')) H = parseFloat(parts[2]);
                            else if (parts[2]?.includes('rad')) H = (parseFloat(parts[2]) * 180) / Math.PI;
                            else if (parts[2]?.includes('turn')) H = parseFloat(parts[2]) * 360;
                            
                            let alpha = 1;
                            if (parts.length >= 4) {
                              alpha = parseFloat(parts[3]);
                              if (parts[3]?.includes('%')) alpha /= 100;
                            }
                            if (isNaN(alpha)) alpha = 1;

                            const hRad = (H * Math.PI) / 180;
                            const abcVal = C * Math.cos(hRad);
                            const bbcVal = C * Math.sin(hRad);
                            
                            const rgb = oklabToRgb(L, abcVal, bbcVal);
                            return alpha === 1 ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
                          } catch (e) {
                            return 'rgb(0, 255, 102)';
                          }
                        });
                      } catch (e) {}

                      try {
                        result = result.replace(/oklab\(([^)]+)\)/gi, (match, content) => {
                          try {
                            const parts = content.replace(/,/g, ' ').trim().split(/[\s/]+/).filter(Boolean);
                            let L = parseFloat(parts[0]) || 0;
                            if (parts[0]?.includes('%')) L /= 100;
                            let a = parseFloat(parts[1]) || 0;
                            if (parts[1]?.includes('%')) a /= 100;
                            let b = parseFloat(parts[2]) || 0;
                            if (parts[2]?.includes('%')) b /= 100;
                            
                            let alpha = 1;
                            if (parts.length >= 4) {
                              alpha = parseFloat(parts[3]);
                              if (parts[3]?.includes('%')) alpha /= 100;
                            }
                            if (isNaN(alpha)) alpha = 1;

                            const rgb = oklabToRgb(L, a, b);
                            return alpha === 1 ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
                          } catch (e) {
                            return 'rgb(0, 255, 102)';
                          }
                        });
                      } catch (e) {}

                      try {
                        result = result.replace(/color\((oklab|oklch)\s+([^)]+)\)/gi, (match, space, content) => {
                          try {
                            const parts = content.replace(/,/g, ' ').trim().split(/[\s/]+/).filter(Boolean);
                            let L = parseFloat(parts[0]) || 0;
                            if (parts[0]?.includes('%')) L /= 100;
                            let cOrA = parseFloat(parts[1]) || 0;
                            if (parts[1]?.includes('%')) cOrA /= 100;
                            let hOrB = parseFloat(parts[2]) || 0;
                            if (parts[2]?.includes('%')) hOrB /= 100;
                            
                            let alpha = 1;
                            if (parts.length >= 4) {
                              alpha = parseFloat(parts[3]);
                              if (parts[3]?.includes('%')) alpha /= 100;
                            }
                            if (isNaN(alpha)) alpha = 1;

                            if (space.toLowerCase() === 'oklch') {
                              const hRad = (hOrB * Math.PI) / 180;
                              const a = cOrA * Math.cos(hRad);
                              const b = cOrA * Math.sin(hRad);
                              const rgb = oklabToRgb(L, a, b);
                              return alpha === 1 ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
                            } else {
                              const rgb = oklabToRgb(L, cOrA, hOrB);
                              return alpha === 1 ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
                            }
                          } catch (e) {
                            return 'rgb(0, 255, 102)';
                          }
                        });
                      } catch (e) {}

                      // --- ULTRA DEFENSIVE FALLBACK ---
                      if (result.includes('oklch') || result.includes('oklab')) {
                        result = result.replace(/okl(ch|ab)\([^)]+\)/gi, '#00ff66');
                        result = result.replace(/color\(okl(ch|ab)[^)]+\)/gi, '#00ff66');
                      }

                      return result;
                    };

                    // 4. Temporarily sanitize live stylesheet text contents
                    styleElements.forEach(el => {
                      const text = el.textContent || '';
                      if (text.includes('oklch') || text.includes('oklab') || text.includes('color(')) {
                        el.textContent = convertCssString(text);
                      }
                    });

                    // 5. Temporarily disable active link stylesheets
                    linkElements.forEach(el => {
                      el.disabled = true;
                    });

                    // 6. Override global window.getComputedStyle on parent window for html2canvas to fetch safe rgb
                    window.getComputedStyle = function (el, pseudo) {
                      const style = originalGetComputedStyle.call(this, el, pseudo);
                      return new Proxy(style, {
                        get(target, prop) {
                          if (prop === 'getPropertyValue') {
                            return (property: string) => {
                              try {
                                return convertCssString(target.getPropertyValue(property));
                              } catch (e) {
                                return '';
                              }
                            };
                          }
                          try {
                            const val = target[prop as any];
                            if (typeof val === 'function') {
                              return val.bind(target);
                            }
                            if (typeof val === 'string') {
                              return convertCssString(val);
                            }
                            return val;
                          } catch (e) {
                            return (target as any)[prop];
                          }
                        }
                      });
                    };

                    // 7. Run html2canvas
                    const canvas = await html2canvas(element, {
                      scale: 2,
                      useCORS: true,
                      backgroundColor: '#110c3f',
                      onclone: (clonedDoc) => {
                        const win = clonedDoc.defaultView || window;
                        win.getComputedStyle = function (el, pseudo) {
                          const style = originalGetComputedStyle.call(this, el, pseudo);
                          return new Proxy(style, {
                            get(target, prop) {
                              if (prop === 'getPropertyValue') {
                                return (property: string) => {
                                  try {
                                    return convertCssString(target.getPropertyValue(property));
                                  } catch (e) {
                                    return '';
                                  }
                                };
                              }
                              try {
                                const val = target[prop as any];
                                if (typeof val === 'function') {
                                  return val.bind(target);
                                }
                                if (typeof val === 'string') {
                                  return convertCssString(val);
                                }
                                return val;
                              } catch (e) {
                                return (target as any)[prop];
                              }
                            }
                          });
                        };

                        // Clean inline styles of cloned elements
                        const allElements = clonedDoc.getElementsByTagName('*');
                        for (let i = 0; i < allElements.length; i++) {
                          const el = allElements[i] as HTMLElement;
                          if (el.style) {
                            for (let j = 0; j < el.style.length; j++) {
                              const key = el.style[j];
                              const val = el.style.getPropertyValue(key);
                              if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
                                el.style.setProperty(key, convertCssString(val));
                              }
                            }
                          }
                        }

                        // Combine stylesheets
                        let combinedCss = '';
                        Array.from(document.styleSheets).forEach(sheet => {
                          try {
                            if (!sheet.cssRules) return;
                            Array.from(sheet.cssRules).forEach(rule => {
                              combinedCss += rule.cssText + '\n';
                            });
                          } catch (e) {
                            // ignore cross-origin sheet
                          }
                        });

                        const convertedCss = convertCssString(combinedCss);

                        Array.from(clonedDoc.getElementsByTagName('link')).forEach(link => {
                          if (link.rel === 'stylesheet') {
                            const href = link.getAttribute('href');
                            if (!href || href.startsWith('/') || href.includes(window.location.host)) {
                              link.parentNode?.removeChild(link);
                            }
                          }
                        });

                        Array.from(clonedDoc.getElementsByTagName('style')).forEach(style => {
                          style.parentNode?.removeChild(style);
                        });

                        const head = clonedDoc.head || clonedDoc.getElementsByTagName('head')[0];
                        if (head) {
                          const styleTag = clonedDoc.createElement('style');
                          styleTag.type = 'text/css';
                          styleTag.appendChild(clonedDoc.createTextNode(convertedCss));
                          head.appendChild(styleTag);
                        }
                      }
                    });

                    // Download image as high-resolution PNG
                    const image = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.download = `clasificacion_mundial_${selectedRoundId}.png`;
                    link.href = image;
                    link.click();
                  } catch (err: any) {
                    console.error('Error generando imagen:', err);
                  } finally {
                    // Restore original getComputedStyle globally on window
                    window.getComputedStyle = originalGetComputedStyle;
                    // ALWAYS restore original contents and styles
                    styleBackups.forEach(backup => {
                      backup.el.textContent = backup.originalText;
                    });
                    linkBackups.forEach(backup => {
                      backup.el.disabled = backup.originalDisabled;
                    });
                  }
                }}
                className="w-full sm:w-auto px-5 py-3 cursor-pointer rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider hover:opacity-90 shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                Descargar Tabla (PNG)
              </button>
            </section>

          </div>
        )}

        {/* --- 1.5. FIXTURE INTELIGENTE VIEW --- */}
        {activeTab === 'fixture' && (
          <div className="space-y-6 animate-fadeIn">
            <SmartFixture 
              matches={matches} 
              selectedRoundId={selectedRoundId}
              onRoundChange={setSelectedRoundId}
              onUpdateMatchResult={handleUpdateMatchResult}
            />
          </div>
        )}

        {/* --- 2. RESULTADOS Y PRONÓSTICOS VIEW --- */}
        {activeTab === 'simulador' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-[#090724] to-[#1a134d] text-white p-5 rounded-2xl border border-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-black tracking-tight flex items-center gap-1.5 text-white">
                  <Calendar className="w-5 h-5 text-[#00ff66]" />
                  Simulador de Partidos y Pronósticos de Participantes
                </h2>
                <p className="text-indigo-200 text-xs">
                  Establece marcadores reales o experimentales en los partidos para observar dinámicamente cómo cambian los puntajes de cada jugador según el reglamento oficial de aciertos, triples o dobles.
                </p>
              </div>
            </div>

            <MatchesList
              matches={matches}
              players={players}
              selectedRoundId={selectedRoundId}
              currentStandings={currentStandings}
              onUpdateMatchResult={handleUpdateMatchResult}
              selectedPlayerId={activeFocusPlayerId}
              onSelectPlayer={setSelectedPlayerId}
              onRoundChange={setSelectedRoundId}
            />
          </div>
        )}

        {/* --- 2.5. COMPARADOR H2H VIEW --- */}
        {activeTab === 'comparador' && (
          <div className="space-y-6 animate-fadeIn">
            <PlayerComparison 
              players={players} 
              matches={matches} 
              selectedRoundId={selectedRoundId}
              standingsByRound={standingsByRound}
            />
          </div>
        )}

        {/* --- 3. REYES DE FASE VIEW --- */}
        {activeTab === 'reyes' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-1.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-fuchsia-500 animate-bounce" />
                Reyes de Fase & Distribución de Premiación
              </h2>
              <p className="text-slate-500 text-xs">
                Aquí se identifican automáticamente los ganadores máximos de cada fase independiente (Fase de Grupos, Octavos, Cuartos, etc.) junto con la escala del bote total de aportación.
              </p>
            </div>
            <PhaseKings standingsByRound={standingsByRound} totalPlayersCount={players.length} matches={matches} />
          </div>
        )}

        {/* --- 4. ANALIZADOR DE ESCENARIOS VIEW --- */}
        {activeTab === 'analizador' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950 flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Asistente Inteligente de Recorridos para {selectedPlayer ? selectedPlayer.name : 'Participante'}
                </h3>
                <p className="text-slate-500 text-xs">
                  Analiza la línea temporal e histórica partido a partido para comprender la estabilidad clasificatoria y encontrar mejores escenarios matemáticos.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                <label className="text-[11px] font-mono text-slate-500 font-bold uppercase whitespace-nowrap">Analizar Participante:</label>
                <select
                  value={activeFocusPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-800 bg-white"
                >
                  {players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isEliminated ? '(Eliminado)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPlayer ? (
              <ScenarioAnalyzer
                selectedPlayer={selectedPlayer}
                players={players}
                matches={matches}
                selectedRoundId={selectedRoundId}
                currentStandings={currentStandings}
                standingsByRound={standingsByRound}
              />
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 font-mono text-xs">
                Por favor selecciona un participante para inicializar el asistente inteligente.
              </div>
            )}
          </div>
        )}

        {/* --- 5. REGLAMENTO VIEW --- */}
        {activeTab === 'reglamento' && (
          <div className="animate-fadeIn space-y-6">
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-indigo-950/60 flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-[#00ff66] shrink-0" />
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Reglamento Oficial de Puntuaciones</h2>
                <p className="text-indigo-200 text-xs mt-0.5">Normas del juego, tiebreakers del desempate y detalles de eliminación de fases.</p>
              </div>
            </div>
            <RulesSection />
          </div>
        )}

        {/* --- 6. BITÁCORA Y ALERTAS VIEW --- */}
        {activeTab === 'notificaciones' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-[#0e0a35] text-white p-5 rounded-2xl border border-indigo-950 flex items-center gap-3 shadow-lg">
              <Bell className="w-6 h-6 text-rose-500 animate-swing shrink-0" />
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Consola de Alertas & Bitácora de Posiciones</h2>
                <p className="text-indigo-200 text-xs mt-0.5">Seguimiento en vivo, histórico de cambios y plazos oficiales de entrega para formularios.</p>
              </div>
            </div>
            <NotificationsPanel
              currentRound={currentRoundInfo}
              nextRound={nextRoundInfo}
              currentStandings={currentStandings}
              previousStandings={previousStandings}
              realTimeLogs={sseLogs}
              syncHistoryLogs={syncHistoryLogs}
            />
          </div>
        )}

      </main>

      {/* 🔄 FOOTER PANEL DE CONFIGURACIÓN Y SINCRONIZACIÓN AUTOMÁTICA */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-8 pb-12">
        <section className="bg-slate-900 border border-indigo-950 rounded-2xl p-5 sm:p-6 shadow-xl text-left" id="footer-sync-controls">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest font-[#00ff66] font-black text-[#00ff66] bg-emerald-500/15 border border-[#00ff66]/25 px-2 py-0.5 rounded-md">
                Motor de Datos Sheets
              </span>
              <h3 className="text-white text-sm font-black uppercase tracking-tight flex items-center gap-1.5 mt-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                CONEXIÓN EN VIVO Y CONTROL DE ACTUALIZACIÓN
              </h3>
              <p className="text-indigo-200 text-xs max-w-2xl leading-relaxed">
                Esta aplicación sincroniza las predicciones directamente con una planilla oficial de Google Sheets de Bolivia. Auto-sync habilitado en segundo plano de manera segura cada 5 minutos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full lg:w-auto shrink-0">
              <div className="flex flex-col text-left sm:text-right font-mono text-[10px] text-indigo-200 bg-indigo-950/40 px-4 py-2 border border-indigo-950/60 rounded-xl">
                <span className="flex items-center gap-1.5 font-bold text-[#00ff66]">
                  <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-ping" />
                  AUTO-SYNC: 5 MIN
                </span>
                <span className="text-[9px] text-indigo-300 font-semibold mt-0.5">Sincronizado: {lastSyncTime || 'Conectando...'}</span>
              </div>

              <button
                onClick={() => handleSyncGoogleSheet(false, true)}
                disabled={syncStatus === 'loading'}
                className="cursor-pointer text-xs text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:opacity-90 font-mono font-black flex items-center justify-center gap-2 px-5 py-3 rounded-xl shadow-md transition-all disabled:opacity-50 min-h-[44px]"
                title="Sincronizar manual con Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} />
                {syncStatus === 'loading' ? 'Sincronizando...' : 'Sincronizar Sheets'}
              </button>
            </div>
          </div>

          {/* Manual URL/ID Configuration */}
          <div className="mt-4 pt-4 border-t border-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
            <div>
              <span className="font-bold text-slate-300">Planilla de origen:</span> 1D6s_Yv_RWeepS-86iVncl4P6o2U3g7fW89H1_Boliva
            </div>
            {syncStatus === 'success' && (
              <div className="text-[#00ff66] font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Sincronización Exitosa
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="text-rose-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Error: {syncResultMsg}
              </div>
            )}
          </div>
        </section>

        {/* Decorative Brand Footer */}
        <div className="text-center text-xs text-slate-400 font-sans leading-relaxed pt-4 border-t border-slate-200">
          <p>&copy; 2026 Copa del Mundo FIFA™ Torneo de Pronósticos Privado. Todos los derechos reservados.</p>
          <p className="mt-1 font-mono text-[10px]">Estructura de backend con cuenta de servicio segura integrada con Google Sheets API v4.</p>
        </div>
      </footer>

      {/* 🏅 DETAILED 'MI RESUMEN' STATS MODAL PANEL */}
      {summaryPlayerId && players.some(p => p.id === summaryPlayerId) && (
        <MySummaryModal
          isOpen={true}
          onClose={() => setSummaryPlayerId(null)}
          player={players.find(p => p.id === summaryPlayerId)!}
          players={players}
          matches={matches}
          selectedRoundId={selectedRoundId}
          standingsRow={currentStandings.find(r => r.playerId === summaryPlayerId)}
        />
      )}
    </div>
  );
}
