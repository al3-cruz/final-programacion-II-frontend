import React, { useState, useMemo } from 'react';
import { Match, RoundId } from '../types';
import { Flag } from './Flag';
import { calculateGroupStandings, calculateBestThirds, TEAM_STATS } from '../utils/tournamentEngine';
import { ROUNDS } from '../utils/rulesEngine';
import { 
  Calendar, 
  Search, 
  Trophy, 
  Clock, 
  Activity, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  Flame, 
  ChevronRight, 
  Users, 
  Edit2, 
  MapPin, 
  Bookmark, 
  ChevronDown, 
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';

interface SmartFixtureProps {
  matches: Match[];
  selectedRoundId: RoundId;
  onRoundChange: (roundId: RoundId) => void;
  onUpdateMatchResult?: (matchId: string, localGoals: number | null, visitorGoals: number | null, advancingTeam?: string | null) => void;
}

const KO_METADATA: Record<string, { num: number, defaultLocal: string, defaultVisitor: string, date: string, time: string, venue: string }> = {
  '16avos-1': { num: 73, defaultLocal: 'Sudáfrica', defaultVisitor: 'Canadá', date: 'Dom 28 Jun', time: '15:00 BOT', venue: 'SoFi Stadium, LA' },
  '16avos-2': { num: 74, defaultLocal: 'Brasil', defaultVisitor: 'Japón', date: 'Lun 29 Jun', time: '13:00 BOT', venue: 'Hard Rock, Miami' },
  '16avos-3': { num: 75, defaultLocal: 'Alemania', defaultVisitor: 'Paraguay', date: 'Lun 29 Jun', time: '16:30 BOT', venue: 'Estadio BBVA, Monterrey' },
  '16avos-4': { num: 76, defaultLocal: 'Países Bajos', defaultVisitor: 'Marruecos', date: 'Lun 29 Jun', time: '21:00 BOT', venue: 'NRG Stadium, Houston' },
  '16avos-5': { num: 77, defaultLocal: 'Costa de Marfil', defaultVisitor: 'Noruega', date: 'Mar 30 Jun', time: '13:00 BOT', venue: 'MetLife Stadium' },
  '16avos-6': { num: 78, defaultLocal: 'Francia', defaultVisitor: 'Suecia', date: 'Mar 30 Jun', time: '17:00 BOT', venue: 'AT&T Stadium, Arlington' },
  '16avos-7': { num: 79, defaultLocal: 'México', defaultVisitor: 'Ecuador', date: 'Mar 30 Jun', time: '21:00 BOT', venue: 'Estadio Azteca, CDMX' },
  '16avos-8': { num: 80, defaultLocal: 'Inglaterra', defaultVisitor: 'RD Congo', date: 'Mié 1 Jul', time: '12:00 BOT', venue: 'Mercedes-Benz, Atlanta' },
  '16avos-9': { num: 81, defaultLocal: 'Bélgica', defaultVisitor: 'Senegal', date: 'Mié 1 Jul', time: '16:00 BOT', venue: 'Levi\'s Stadium' },
  '16avos-10': { num: 82, defaultLocal: 'Estados Unidos', defaultVisitor: 'BiH', date: 'Mié 1 Jul', time: '20:00 BOT', venue: 'Lumen Field, Seattle' },
  '16avos-11': { num: 83, defaultLocal: 'España', defaultVisitor: 'Austria', date: 'Jue 2 Jul', time: '15:00 BOT', venue: 'BMO Field, Toronto' },
  '16avos-12': { num: 84, defaultLocal: 'Portugal', defaultVisitor: 'Croacia', date: 'Jue 2 Jul', time: '19:00 BOT', venue: 'SoFi Stadium, LA' },
  '16avos-13': { num: 85, defaultLocal: 'Suiza', defaultVisitor: 'Argelia', date: 'Jue 2 Jul', time: '23:00 BOT', venue: 'BC Place, Vancouver' },
  '16avos-14': { num: 86, defaultLocal: 'Australia', defaultVisitor: 'Egipto', date: 'Vie 3 Jul', time: '14:00 BOT', venue: 'Hard Rock, Miami' },
  '16avos-15': { num: 87, defaultLocal: 'Argentina', defaultVisitor: 'Cabo Verde', date: 'Vie 3 Jul', time: '18:00 BOT', venue: 'Arrowhead, Kansas City' },
  '16avos-16': { num: 88, defaultLocal: 'Colombia', defaultVisitor: 'Ghana', date: 'Vie 3 Jul', time: '21:30 BOT', venue: 'AT&T Stadium, Arlington' },

  'octavos-1': { num: 89, defaultLocal: 'G.74', defaultVisitor: 'G.77', date: 'Sáb 4 Jul', time: '17:00 BOT', venue: 'Lincoln Financial, Philly' },
  'octavos-2': { num: 90, defaultLocal: 'G.73', defaultVisitor: 'G.75', date: 'Sáb 4 Jul', time: '13:00 BOT', venue: 'NRG Houston' },
  'octavos-3': { num: 91, defaultLocal: 'G.76', defaultVisitor: 'G.78', date: 'Dom 5 Jul', time: '16:00 BOT', venue: 'MetLife' },
  'octavos-4': { num: 92, defaultLocal: 'G.79', defaultVisitor: 'G.80', date: 'Dom 5 Jul', time: '20:00 BOT', venue: 'Estadio Azteca, CDMX' },
  'octavos-5': { num: 93, defaultLocal: 'G.83', defaultVisitor: 'G.84', date: 'Lun 6 Jul', time: '15:00 BOT', venue: 'AT&T Stadium, Arlington' },
  'octavos-6': { num: 94, defaultLocal: 'G.81', defaultVisitor: 'G.82', date: 'Lun 6 Jul', time: '20:00 BOT', venue: 'Lumen Field, Seattle' },
  'octavos-7': { num: 95, defaultLocal: 'G.86', defaultVisitor: 'G.88', date: 'Mar 7 Jul', time: '12:00 BOT', venue: 'Mercedes-Benz, Atlanta' },
  'octavos-8': { num: 96, defaultLocal: 'G.85', defaultVisitor: 'G.87', date: 'Mar 7 Jul', time: '16:00 BOT', venue: 'BC Place, Vancouver' },

  'cuartos-1': { num: 97, defaultLocal: 'G.89', defaultVisitor: 'G.90', date: 'Jue 9 Jul', time: '16:00 BOT', venue: 'Gillette Stadium' },
  'cuartos-2': { num: 98, defaultLocal: 'G.93', defaultVisitor: 'G.94', date: 'Vie 10 Jul', time: '15:00 BOT', venue: 'SoFi Stadium, LA' },
  'cuartos-3': { num: 99, defaultLocal: 'G.91', defaultVisitor: 'G.92', date: 'Sáb 11 Jul', time: '17:00 BOT', venue: 'Hard Rock, Miami' },
  'cuartos-4': { num: 100, defaultLocal: 'G.95', defaultVisitor: 'G.96', date: 'Sáb 11 Jul', time: '21:00 BOT', venue: 'Arrowhead, Kansas City' },

  'semis-1': { num: 101, defaultLocal: 'G.97', defaultVisitor: 'G.98', date: 'Mar 14 Jul', time: '15:00 BOT', venue: 'AT&T Stadium, Arlington' },
  'semis-2': { num: 102, defaultLocal: 'G.99', defaultVisitor: 'G.100', date: 'Mié 15 Jul', time: '15:00 BOT', venue: 'Mercedes-Benz, Atlanta' },

  '3er-puesto-1': { num: 103, defaultLocal: 'Perdedor 101', defaultVisitor: 'Perdedor 102', date: 'Sáb 18 Jul', time: '17:00 BOT', venue: 'Hard Rock, Miami' },
  'final-1': { num: 104, defaultLocal: 'Ganador 101', defaultVisitor: 'Ganador 102', date: 'Dom 19 Jul', time: '15:00 BOT', venue: 'MetLife Stadium' }
};

export const SmartFixture: React.FC<SmartFixtureProps> = ({
  matches,
  selectedRoundId,
  onRoundChange,
  onUpdateMatchResult
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'calendario' | 'tablas' | 'cruces'>('calendario');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'played' | 'pending'>('all');
  const [selectedGroupCollapse, setSelectedGroupCollapse] = useState<string | null>(null);

  // Simulation Modal states
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [simLocalGoals, setSimLocalGoals] = useState('');
  const [simVisitorGoals, setSimVisitorGoals] = useState('');
  const [simAdvancing, setSimAdvancing] = useState('');

  // 1. Calculate Group Standings & Best Thirds
  const groupStandings = useMemo(() => calculateGroupStandings(matches), [matches]);
  const bestThirds = useMemo(() => calculateBestThirds(groupStandings), [groupStandings]);

  // Map qualified teams helper 
  const qualifiedTeams = useMemo(() => {
    const qualified = new Set<string>();
    
    // Top 2 of each group
    Object.values(groupStandings).forEach(rows => {
      if (rows[0]) qualified.add(rows[0].team);
      if (rows[1]) qualified.add(rows[1].team);
    });

    // Top 8 of best thirds
    bestThirds.slice(0, 8).forEach(t => {
      qualified.add(t.team);
    });

    return qualified;
  }, [groupStandings, bestThirds]);

  // Dynamic KO Team Names Resolution
  const resolveKOInfo = (mId: string): { local: string, visitor: string, localFlag?: string, visitorFlag?: string } => {
    const meta = KO_METADATA[mId];
    if (!meta) return { local: 'N/A', visitor: 'N/A' };

    let local = meta.defaultLocal;
    let visitor = meta.defaultVisitor;

    const getStandingTeam = (code: string) => {
      const pos = parseInt(code.substring(0, 1), 10);
      const grp = code.substring(2, 3);
      const rows = groupStandings[grp];
      if (rows && rows[pos - 1]) return rows[pos - 1].team;
      return null;
    };

    if (mId.startsWith('16avos-')) {
      if (meta.defaultLocal.includes('°')) {
        const team = getStandingTeam(meta.defaultLocal);
        if (team) local = team;
      }
      if (meta.defaultVisitor.includes('°')) {
        const team = getStandingTeam(meta.defaultVisitor);
        if (team) visitor = team;
      }
      
      const thirdIndexMap: Record<string, number> = {
        '16avos-2': 0, '16avos-5': 1, '16avos-7': 2, '16avos-8': 3,
        '16avos-9': 4, '16avos-10': 5, '16avos-13': 6, '16avos-15': 7,
      };

      if (mId === '16avos-7') {
        const team = getStandingTeam('1°A');
        if (team) local = team;
      } else if (mId === '16avos-9') {
        const team = getStandingTeam('1°D');
        if (team) local = team;
      }

      if (thirdIndexMap[mId] !== undefined) {
        const idx = thirdIndexMap[mId];
        if (bestThirds[idx]) visitor = bestThirds[idx].team;
      }
    } else {
      const getWinnerOfId = (id: string) => {
        const matchInfo = matches.find(m => m.id === id);
        if (matchInfo && matchInfo.advancingTeam) return matchInfo.advancingTeam;
        return null;
      };
      
      const getLoserOfId = (id: string) => {
        const matchInfo = matches.find(m => m.id === id);
        if (matchInfo && matchInfo.localGoals !== null && matchInfo.visitorGoals !== null) {
          const winner = matchInfo.advancingTeam || (matchInfo.localGoals > matchInfo.visitorGoals ? matchInfo.local : matchInfo.visitor);
          return matchInfo.local === winner ? matchInfo.visitor : matchInfo.local;
        }
        return null;
      };

      if (mId === 'octavos-1') {
        local = getWinnerOfId('16avos-2') || 'Ganador G.74';
        visitor = getWinnerOfId('16avos-5') || 'Ganador G.77';
      } else if (mId === 'octavos-2') {
        local = getWinnerOfId('16avos-1') || 'Ganador G.73';
        visitor = getWinnerOfId('16avos-3') || 'Ganador G.75';
      } else if (mId === 'octavos-3') {
        local = getWinnerOfId('16avos-4') || 'Ganador G.76';
        visitor = getWinnerOfId('16avos-6') || 'Ganador G.78';
      } else if (mId === 'octavos-4') {
        local = getWinnerOfId('16avos-7') || 'Ganador G.79';
        visitor = getWinnerOfId('16avos-8') || 'Ganador G.80';
      } else if (mId === 'octavos-5') {
        local = getWinnerOfId('16avos-11') || 'Ganador G.83';
        visitor = getWinnerOfId('16avos-12') || 'Ganador G.84';
      } else if (mId === 'octavos-6') {
        local = getWinnerOfId('16avos-9') || 'Ganador G.81';
        visitor = getWinnerOfId('16avos-10') || 'Ganador G.82';
      } else if (mId === 'octavos-7') {
        local = getWinnerOfId('16avos-14') || 'Ganador G.86';
        visitor = getWinnerOfId('16avos-16') || 'Ganador G.88';
      } else if (mId === 'octavos-8') {
        local = getWinnerOfId('16avos-13') || 'Ganador G.85';
        visitor = getWinnerOfId('16avos-15') || 'Ganador G.87';
      } else if (mId === 'cuartos-1') {
        local = getWinnerOfId('octavos-1') || 'Ganador G.89';
        visitor = getWinnerOfId('octavos-2') || 'Ganador G.90';
      } else if (mId === 'cuartos-2') {
        local = getWinnerOfId('octavos-5') || 'Ganador G.93';
        visitor = getWinnerOfId('octavos-6') || 'Ganador G.94';
      } else if (mId === 'cuartos-3') {
        local = getWinnerOfId('octavos-3') || 'Ganador G.91';
        visitor = getWinnerOfId('octavos-4') || 'Ganador G.92';
      } else if (mId === 'cuartos-4') {
        local = getWinnerOfId('octavos-7') || 'Ganador G.95';
        visitor = getWinnerOfId('octavos-8') || 'Ganador G.96';
      } else if (mId === 'semis-1') {
        local = getWinnerOfId('cuartos-1') || 'Ganador G.97';
        visitor = getWinnerOfId('cuartos-2') || 'Ganador G.98';
      } else if (mId === 'semis-2') {
        local = getWinnerOfId('cuartos-3') || 'Ganador G.99';
        visitor = getWinnerOfId('cuartos-4') || 'Ganador G.100';
      } else if (mId === '3er-puesto-1') {
        local = getLoserOfId('semis-1') || 'Perdedor G.101';
        visitor = getLoserOfId('semis-2') || 'Perdedor G.102';
      } else if (mId === 'final-1') {
        local = getWinnerOfId('semis-1') || 'Ganador G.101';
        visitor = getWinnerOfId('semis-2') || 'Ganador G.102';
      }
    }

    const localFlag = TEAM_STATS[local]?.flag;
    const visitorFlag = TEAM_STATS[visitor]?.flag;

    return { local, visitor, localFlag, visitorFlag };
  };

  // Group Matches rendering
  const roundMatches = matches.filter(m => m.round === selectedRoundId);

  const parsedScoreMatch = (m: Match) => {
    if (m.round === 'grupos') {
      return { local: m.local, visitor: m.visitor, localFlag: TEAM_STATS[m.local]?.flag, visitorFlag: TEAM_STATS[m.visitor]?.flag };
    }
    const isPlaceholder = (name: string) => {
      if (!name) return true;
      const n = name.toLowerCase();
      return n.includes('clasificado') || 
             n.includes('ganador') || 
             n.includes('perdedor') || 
             n.includes('°') || 
             /^[1-4][a-j]$/.test(n) || 
             n.includes('/') || 
             n.includes('vs') || 
             n.length <= 3;
    };
    if (m.local && m.visitor && !isPlaceholder(m.local) && !isPlaceholder(m.visitor)) {
      return {
        local: m.local,
        visitor: m.visitor,
        localFlag: TEAM_STATS[m.local]?.flag || '🏳️',
        visitorFlag: TEAM_STATS[m.visitor]?.flag || '🏳️'
      };
    }
    const res = resolveKOInfo(m.id);
    return res;
  };

  // Sorting matches chronologically
  const sortedMatches = [...roundMatches].sort((a, b) => {
    const [dA, mA, yA] = a.date.split('/').map(Number);
    const [dB, mB, yB] = b.date.split('/').map(Number);
    const dateA = new Date(yA, mA - 1, dA).getTime();
    const dateB = new Date(yB, mB - 1, dB).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return a.time.localeCompare(b.time);
  });

  const normalizeText = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const filteredMatches = sortedMatches.filter(m => {
    const q = normalizeText(searchQuery);
    const names = parsedScoreMatch(m);
    const localNorm = normalizeText(names.local);
    const visitorNorm = normalizeText(names.visitor);
    const grpValue = m.group ? `grupo ${normalizeText(m.group)}` : '';

    const matchesSearch = !q || localNorm.includes(q) || visitorNorm.includes(q) || grpValue.includes(q);

    const isPlayed = m.localGoals !== null && m.visitorGoals !== null;
    const matchesStatus = statusFilter === 'all' ? true :
                         statusFilter === 'played' ? isPlayed : !isPlayed;

    return matchesSearch && matchesStatus;
  });

  // Open modal simulation
  const handleOpenSimulation = (match: Match) => {
    const namesInfo = parsedScoreMatch(match);
    const richMatch = {
      ...match,
      local: namesInfo.local,
      visitor: namesInfo.visitor
    };
    setEditingMatch(richMatch);
    setSimLocalGoals(match.localGoals !== null ? match.localGoals.toString() : '');
    setSimVisitorGoals(match.visitorGoals !== null ? match.visitorGoals.toString() : '');
    setSimAdvancing(match.advancingTeam || '');
  };

  const handleSaveSimulation = () => {
    if (!editingMatch || !onUpdateMatchResult) return;
    const lG = simLocalGoals.trim() === '' ? null : parseInt(simLocalGoals, 10);
    const vG = simVisitorGoals.trim() === '' ? null : parseInt(simVisitorGoals, 10);
    const adv = simAdvancing.trim() === '' ? null : simAdvancing;
    onUpdateMatchResult(editingMatch.id, isNaN(lG as any) ? null : lG, isNaN(vG as any) ? null : vG, adv);
    setEditingMatch(null);
  };

  const handleClearSimulation = () => {
    if (!editingMatch || !onUpdateMatchResult) return;
    onUpdateMatchResult(editingMatch.id, null, null, null);
    setEditingMatch(null);
  };

  const totalMatchesCount = roundMatches.length;
  const playedMatchesCount = roundMatches.filter(m => m.localGoals !== null && m.visitorGoals !== null).length;

  return (
    <div className="space-y-6 animate-fadeIn" id="smart-fixture-container">
      
      {/* 🌟 HERO WIDGET */}
      <div className="bg-[#0e0c38] text-white p-6 rounded-3xl border border-indigo-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-[#00ff66]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="bg-[#00ff66]/15 p-2.5 rounded-2xl text-[#00ff66] shrink-0">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono font-black tracking-widest text-[#00ff66] bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-[#00ff66]/15">
              RESULTADOS OFICIALES EN VIVO
            </span>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight mt-1">
              Fixture y Resultados: {ROUNDS.find(r => r.id === selectedRoundId)?.name || selectedRoundId}
            </h2>
            <p className="text-xs text-indigo-200 mt-1">
              Recalcula los grupos de la Copa Mundial, comprueba los mejores terceros y devela los cruces eliminatorios a la hora boliviana.
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex flex-col justify-center text-center">
          <span className="text-[9px] text-[#00ff66] font-mono font-black tracking-wider uppercase">Progreso de Ronda</span>
          <span className="text-sm font-black text-white mt-1">
            {playedMatchesCount} / {totalMatchesCount} <span className="text-zinc-400 font-normal text-xs">Partidos</span>
          </span>
        </div>
      </div>

      {/* 🧭 COHESIVE INTERACTIVE SUB-TABS */}
      <div className="flex bg-[#0a082c] p-1.5 border border-indigo-950/40 rounded-2xl gap-1">
        <button
          onClick={() => setActiveSubTab('calendario')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'calendario' 
              ? 'bg-[#1b1756] text-[#00ff66] shadow border border-[#00ff66]/15' 
              : 'text-indigo-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendario y Simulador
        </button>
        <button
          onClick={() => setActiveSubTab('tablas')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'tablas' 
              ? 'bg-[#1b1756] text-[#00ff66] shadow border border-[#00ff66]/15' 
              : 'text-indigo-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Tablas de Grupos
        </button>
        <button
          onClick={() => setActiveSubTab('cruces')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'cruces' 
              ? 'bg-[#1b1756] text-[#00ff66] shadow border border-[#00ff66]/15' 
              : 'text-indigo-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Árbol de Eliminatorias (BOT)
        </button>
      </div>

      {/* VIEW PANEL 1: CALENDAR */}
      {activeSubTab === 'calendario' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-3xs">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 font-semibold focus:outline-none placeholder-slate-400 bg-slate-50 text-slate-800"
                placeholder="Buscar por equipo o Grupo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-1">
                {(['all', 'played', 'pending'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight font-mono transition-all cursor-pointer ${
                      statusFilter === f ? 'bg-[#090724] text-[#00ff66]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'played' ? 'Jugados' : 'Pendientes'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-black text-slate-400">Ronda:</span>
                <select
                  value={selectedRoundId}
                  onChange={(e) => onRoundChange(e.target.value as RoundId)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800 outline-none"
                >
                  {ROUNDS.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Calendario list */}
          {selectedRoundId === 'dieciseisavos' ? (
            <div className="space-y-6">
              {/* World Cup Header Banner */}
              <div className="bg-gradient-to-r from-[#0d092d] via-[#1a114d] to-[#0d092d] border border-[#2b216d]/50 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none select-none">
                  <Trophy className="w-64 h-64 text-emerald-400 rotate-12 translate-y-16 translate-x-12" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/35 text-amber-300 rounded-full text-xs font-mono font-bold uppercase mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      Fase Eliminatoria de Elite
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-sans">
                      Dieciseisavos de Final
                    </h2>
                    <p className="text-xs sm:text-sm text-indigo-200 mt-2 max-w-xl font-medium">
                      El verdadero mundial empieza aquí. 32 países se enfrentan a partido único por el pase a Octavos. El margen de error es cero: empate lleva a tiempo extra y penales. ¡Haz tu simulación en vivo!
                    </p>
                  </div>
                  <div className="flex flex-col items-center bg-[#09051d]/60 border border-[#2c226e]/60 rounded-2xl px-5 py-4 min-w-[160px] text-center backdrop-blur-xs shadow-inner">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#00ff66] font-bold">Total Partidos</span>
                    <span className="text-3xl font-black font-mono text-white mt-1">16</span>
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">16 clasificados a octavos</span>
                  </div>
                </div>
              </div>

              {/* Grouping matches by date */}
              {filteredMatches.length === 0 ? (
                <div className="py-16 text-center bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-450 text-xs font-mono">No se encontraron cotejos que coincidan con los criterios.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(
                    filteredMatches.reduce<Record<string, Match[]>>((acc, m) => {
                      const kmeta = KO_METADATA[m.id];
                      const dateStr = kmeta ? kmeta.date : m.date;
                      if (!acc[dateStr]) acc[dateStr] = [];
                      acc[dateStr].push(m);
                      return acc;
                    }, {})
                  ).map(([dateLabel, dateMatches]) => (
                    <div key={dateLabel} className="space-y-4">
                      {/* Date Header */}
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#090724] text-[#00ff66] rounded-xl border border-indigo-950/40 text-xs font-black font-mono tracking-wider shadow-sm uppercase">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {dateLabel}
                        </span>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-indigo-950/20 to-transparent dark:from-indigo-500/10 animate-pulse" />
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-widest">
                          {dateMatches.length} {dateMatches.length === 1 ? 'partido' : 'partidos'}
                        </span>
                      </div>

                      {/* Matches Bento Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dateMatches.map(m => {
                          const items = parsedScoreMatch(m);
                          const isPlayed = m.localGoals !== null && m.visitorGoals !== null;
                          const kmeta = KO_METADATA[m.id];
                          const displayTime = kmeta ? kmeta.time : `${m.time} BOT`;
                          const displaySede = kmeta ? kmeta.venue : 'Sede Oficial';

                          return (
                            <div
                              key={m.id}
                              onClick={() => handleOpenSimulation(m)}
                              className="bg-[#0b0728] text-white border border-[#1b154a] hover:border-[#00ff66]/40 hover:shadow-[0_0_15px_rgba(0,255,102,0.05)] rounded-2xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
                            >
                              {/* Background Glow */}
                              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-[#00ff66] to-purple-500 opacity-60" />

                              {/* Top meta info */}
                              <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase font-mono font-black tracking-widest bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                                    P.{kmeta?.num || m.id.replace('16avos-', '')}
                                  </span>
                                  <span className="text-[9px] uppercase font-mono font-black tracking-widest bg-[#00ff66]/10 border border-[#00ff66]/20 text-[#00ff66] px-2 py-0.5 rounded-md">
                                    KO ROUND
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-indigo-300/85 font-mono font-bold">
                                  <MapPin className="w-3 h-3 text-[#00ff66]" />
                                  <span>{displaySede}</span>
                                </div>
                              </div>

                              {/* Duel Block */}
                              <div className="flex items-center justify-between gap-4 py-2">
                                {/* Local Team */}
                                <div className="w-[38%] flex flex-col items-center text-center">
                                  <div className="w-12 h-12 bg-[#140f3b] border border-[#271e69] rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-105 duration-300 overflow-hidden">
                                    <Flag teamName={items.local} className="w-full h-full rounded-full" variant="circle" />
                                  </div>
                                  <span className="text-xs sm:text-xs font-black tracking-tight text-white mt-2.5 truncate max-w-full">
                                    {items.local}
                                  </span>
                                  <span className="text-[8.5px] uppercase font-mono tracking-wider text-slate-400 mt-0.5 leading-none">LOCAL</span>
                                </div>

                                {/* SCORE / STATUS CONTAINER */}
                                <div className="flex-1 flex flex-col items-center justify-center px-1">
                                  {isPlayed ? (
                                    <div className="flex flex-col items-center">
                                      <div className="bg-[#040212] border border-[#241c61] rounded-2xl px-4 py-2 font-mono font-black text-xl text-[#00ff66] shadow-inner tracking-widest flex items-center gap-2">
                                        <span>{m.localGoals}</span>
                                        <span className="text-indigo-400 text-sm font-sans font-normal">&ndash;</span>
                                        <span>{m.visitorGoals}</span>
                                      </div>
                                      <span className="text-[8px] uppercase font-mono font-black text-emerald-400 mt-1.5 tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                        Terminado
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <div className="bg-[#040212] border border-[#1e1753] rounded-2xl px-3 py-1.5 font-mono font-black text-xs text-white shadow-sm flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        <span>{displayTime}</span>
                                      </div>
                                      <span className="text-[8px] uppercase font-mono font-black text-amber-400 mt-1.5 tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                        Pendiente
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Visitor Team */}
                                <div className="w-[38%] flex flex-col items-center text-center">
                                  <div className="w-12 h-12 bg-[#140f3b] border border-[#271e69] rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-105 duration-300 overflow-hidden">
                                    <Flag teamName={items.visitor} className="w-full h-full rounded-full" variant="circle" />
                                  </div>
                                  <span className="text-xs sm:text-xs font-black tracking-tight text-white mt-2.5 truncate max-w-full">
                                    {items.visitor}
                                  </span>
                                  <span className="text-[8.5px] uppercase font-mono tracking-wider text-slate-400 mt-0.5 leading-none">VISITANTE</span>
                                </div>
                              </div>

                              {/* Card Bottom / Action */}
                              <div className="border-t border-[#1a144f] mt-4 pt-3 flex items-center justify-between">
                                {isPlayed ? (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[9px] font-mono text-slate-400">Marcador Simulado</span>
                                    {m.advancingTeam && (
                                      <span className="text-[9.5px] font-mono text-[#00ff66] bg-[#00ff66]/10 border border-[#00ff66]/20 px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                                        🏆 Pasa: <strong className="text-white">{m.advancingTeam === 'Local' ? items.local : items.visitor}</strong>
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between w-full text-xs font-bold text-indigo-300 group-hover:text-[#00ff66] transition-colors">
                                    <span className="text-[9.5px] font-mono text-indigo-400">Clic para simular</span>
                                    <div className="flex items-center gap-0.5 text-[9.5px] font-mono">
                                      <span>Pronosticar</span>
                                      <ChevronRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {filteredMatches.length === 0 ? (
                <div className="py-16 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-450 text-xs font-mono">No se encontraron cotejos que coincidan con los criterios.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredMatches.map(m => {
                    const items = parsedScoreMatch(m);
                    const isPlayed = m.localGoals !== null && m.visitorGoals !== null;
                    const kmeta = KO_METADATA[m.id];
                    const displayTime = kmeta ? kmeta.time : `${m.time} BOT`;
                    const displaySede = kmeta ? kmeta.venue : 'Sede Oficial';

                    return (
                      <div 
                        key={m.id} 
                        onClick={() => handleOpenSimulation(m)}
                        className="p-4 sm:p-5 hover:bg-slate-50/70 transition-all flex flex-col md:grid md:grid-cols-12 gap-3 items-center cursor-pointer group"
                        title="Haz clic para simular o editar marcador en vivo"
                      >
                        {/* Left Block */}
                        <div className="md:col-span-3 w-full flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center gap-1">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-extrabold">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{kmeta ? kmeta.date : m.date}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-rose-600">{displayTime}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {kmeta ? (
                              <span className="text-[9px] uppercase font-mono font-black tracking-wider px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100">
                                P.{kmeta.num} KO
                              </span>
                            ) : m.group ? (
                              <span className="text-[9px] uppercase font-mono font-black tracking-wider px-2 py-0.5 bg-slate-900 text-[#00ff66] rounded border border-slate-800">
                                Grupo {m.group}
                              </span>
                            ) : null}
                            <span className="text-[9.5px] font-mono text-slate-400">{displaySede}</span>
                          </div>
                        </div>

                        {/* Middle Score Match Frame */}
                        <div className="md:col-span-6 w-full flex items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-100/60 rounded-2xl group-hover:bg-slate-100/40 transition-colors">
                          <div className="w-[37%] text-right font-black text-slate-800 text-xs sm:text-xs truncate flex items-center justify-end gap-1.5">
                            <span>{items.local}</span>
                            <span className="text-sm select-none">{items.localFlag || '🏳️'}</span>
                          </div>

                          <div className="flex items-center justify-center bg-[#090724] border border-indigo-950 rounded-xl px-4 py-1.5 text-white min-w-[70px] shadow-sm font-mono relative">
                            {isPlayed ? (
                              <span className="text-xs sm:text-xs font-black text-[#00ff66]">
                                {m.localGoals} &ndash; {m.visitorGoals}
                              </span>
                            ) : (
                              <span className="text-[9.5px] uppercase font-black text-zinc-400 tracking-wider">
                                No jugado
                              </span>
                            )}
                            <Edit2 className="w-2.5 h-2.5 text-[#00ff66] absolute right-1.5 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          <div className="w-[37%] text-left font-black text-slate-800 text-xs sm:text-xs truncate flex items-center gap-1.5">
                            <span className="text-sm select-none">{items.visitorFlag || '🏳️'}</span>
                            <span>{items.visitor}</span>
                          </div>
                        </div>

                        {/* Right Status */}
                        <div className="md:col-span-3 w-full flex justify-end">
                          {isPlayed ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] uppercase font-black font-mono px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Simulado
                              </span>
                              {m.advancingTeam && (
                                <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-extrabold mt-0.5">
                                  Clasifica: {m.advancingTeam}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] uppercase font-black font-mono px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW PANEL 2: GROUP STANDINGS */}
      {activeSubTab === 'tablas' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Bento grid of the 12 groups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(groupStandings).map(([groupName, groupRowList]) => {
              const rows = groupRowList as any[];
              const isCollapsed = selectedGroupCollapse === groupName;
              
              return (
                <div 
                  key={groupName} 
                  className="bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden transition-all"
                >
                  {/* Header tab */}
                  <div className="bg-slate-900 border-b border-indigo-950 p-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black font-mono bg-[#00ff66]/10 border border-[#00ff66]/20 text-[#00ff66] px-2 py-0.5 rounded">
                        GRUPO {groupName}
                      </span>
                      <span className="text-[9.5px] uppercase font-mono tracking-widest text-[#00ff66]">Fase de Grupos</span>
                    </div>
                    <span className="text-[10px] text-indigo-200 font-mono">15:00 UTC-4 BOT</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">
                          <th className="py-3 px-3 text-center w-8">#</th>
                          <th className="py-3 px-3">Equipos</th>
                          <th className="py-3 px-2 text-center w-8">P</th>
                          <th className="py-3 px-2 text-center w-8">W</th>
                          <th className="py-3 px-2 text-center w-8">D</th>
                          <th className="py-3 px-2 text-center w-8">L</th>
                          <th className="py-3 px-2 text-center w-12">DIFF</th>
                          <th className="py-3 px-2 text-center w-12">GLS</th>
                          <th className="py-3 px-3 text-center w-28">Últimas 5</th>
                          <th className="py-3 px-3 text-center w-12 text-[#00b400]">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((row, rIdx) => {
                          const isGroupQualified = rIdx < 2 || qualifiedTeams.has(row.team);
                          
                          return (
                            <tr 
                              key={row.team} 
                              className={`text-slate-800 hover:bg-slate-50/50 transition-colors ${
                                isGroupQualified 
                                  ? 'bg-emerald-500/[0.02]' 
                                  : rIdx === 2 ? 'bg-amber-500/[0.01]' : 'bg-rose-500/[0.01]'
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10.5px] font-black font-mono leading-none ${
                                  rIdx < 2 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : rIdx === 2
                                      ? 'bg-amber-100 text-amber-850'
                                      : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {rIdx + 1}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-xs flex items-center gap-2">
                                <Flag teamName={row.team} variant="circle" />
                                <div className="truncate">
                                  <span className={`block truncate ${isGroupQualified ? 'font-black text-emerald-950' : 'font-semibold'}`}>
                                    {row.team}
                                  </span>
                                  {isGroupQualified && (
                                    <span className="text-[8px] font-bold text-emerald-600 block leading-tight tracking-wider uppercase font-mono">
                                      {rIdx < 2 ? 'Fase Final (Top 2)' : 'Fase Final (Mejor 3°)'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center font-mono text-xs text-slate-500">{row.p}</td>
                              <td className="py-3 px-2 text-center font-mono text-xs text-slate-500">{row.w}</td>
                              <td className="py-3 px-2 text-center font-mono text-xs text-slate-500">{row.d}</td>
                              <td className="py-3 px-2 text-center font-mono text-xs text-slate-500">{row.l}</td>
                              <td className="py-3 px-2 text-center font-mono text-xs font-bold text-slate-600">
                                {row.gd > 0 ? `+${row.gd}` : row.gd}
                              </td>
                              <td className="py-3 px-2 text-center font-mono text-xs text-slate-500">{row.gs}</td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {row.lastFive.map((item: any, oIdx: number) => {
                                    const isPending = item.outcome === 'P';
                                    const outcomeChar = isPending ? '-' : item.outcome;
                                    const colorClass = item.outcome === 'W' 
                                      ? 'bg-[#00b33c]' 
                                      : item.outcome === 'D' 
                                        ? 'bg-slate-400' 
                                        : item.outcome === 'L' 
                                          ? 'bg-rose-500' 
                                          : 'bg-slate-200 border border-slate-300 text-slate-500';
                                    const tooltipText = isPending
                                      ? `${item.local} vs ${item.visitor} - Partido pendiente`
                                      : `${item.local} ${item.localGoals} - ${item.visitorGoals} ${item.visitor}`;

                                    return (
                                      <span 
                                        key={oIdx} 
                                        className={`w-4 h-4 rounded-full text-[9px] font-black font-mono flex items-center justify-center text-white cursor-help ${colorClass}`}
                                        title={tooltipText}
                                      >
                                        {outcomeChar}
                                      </span>
                                    );
                                  })}
                                  {row.lastFive.length === 0 && (
                                    <span className="text-[10px] text-slate-400 italic">No jugados</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-black text-xs text-slate-900 bg-slate-50/40">
                                {row.pts}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* MEJORES TERCEROS */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 font-mono">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Clasificación de los Mejores Terceros
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  De los 12 equipos que ocupan el 3er puesto, los 8 mejores clasifican a los 16avos de final.
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono font-black px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded">
                8 Clasifican
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-3 text-center w-8">#</th>
                    <th className="py-3 px-3">Equipo (Grupo)</th>
                    <th className="py-3 px-2 text-center w-8">P</th>
                    <th className="py-3 px-2 text-center w-8">W</th>
                    <th className="py-3 px-2 text-center w-8">D</th>
                    <th className="py-3 px-2 text-center w-8">L</th>
                    <th className="py-3 px-2 text-center w-12">DIFF</th>
                    <th className="py-3 px-2 text-center w-12">GLS</th>
                    <th className="py-3 px-3 text-center w-12 font-bold text-slate-800">Pts</th>
                    <th className="py-3 px-3 text-center w-28">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {bestThirds.map((row, idx) => {
                    const isPassed = idx < 8;
                    return (
                      <tr key={row.team} className={`${isPassed ? 'bg-emerald-500/[0.01]' : 'bg-rose-500/[0.01]'}`}>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10.5px] font-black ${
                            isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-2 font-sans">
                          <Flag teamName={row.team} variant="circle" />
                          <div>
                            <span className="font-bold">{row.team}</span>
                            <span className="text-[10px] font-mono text-indigo-600 ml-1.5 font-bold">
                              [Grupo {row.group}]
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-500">{row.p}</td>
                        <td className="py-3 px-2 text-center text-slate-500">{row.w}</td>
                        <td className="py-3 px-2 text-center text-slate-500">{row.d}</td>
                        <td className="py-3 px-2 text-center text-slate-500">{row.l}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-600">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                        <td className="py-3 px-2 text-center text-slate-500">{row.gs}</td>
                        <td className="py-3 px-3 text-center font-black text-slate-900 bg-slate-50/20">{row.pts}</td>
                        <td className="py-3 px-3 text-center font-sans font-bold">
                          {isPassed ? (
                            <span className="text-[9.5px] uppercase font-mono border border-emerald-200 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                              🟢 Clasificado
                            </span>
                          ) : (
                            <span className="text-[9.5px] uppercase font-mono border border-rose-200 bg-rose-50 text-rose-800 px-2 py-0.5 rounded">
                              🔴 Eliminado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PANEL 3: KNOCKOUT PLAYOFF TREE */}
      {activeSubTab === 'cruces' && (
        <div className="space-y-6 animate-fadeIn">
          <section className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <h4 className="font-extrabold text-slate-900 uppercase font-mono flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-indigo-500" />
                Play-Offs de Clasificación Directa
              </h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Todos los horarios están convertidos y mostrados en la zona de **Hora Bolivia (BOT / UTC-4)**.
              </p>
            </div>
            <span className="bg-slate-900 text-white font-mono text-[10px] px-3 py-1.5 rounded-lg border border-slate-800 font-extrabold shadow-3xs shrink-0">
              G.x: Ganador del Partido x
            </span>
          </section>

          {/* Tree-style dynamic layouts */}
          <div className="space-y-12">
            
            {/* Round 1: 16avos */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <span className="text-xs uppercase font-mono font-black text-indigo-950 tracking-wider">
                  Dieciseisavos de Final (28 de Junio - 3 de Julio)
                </span>
                <span className="text-[9.5px] font-mono text-slate-450">16 enfrentamientos</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 16 }).map((_, i) => {
                  const mId = `16avos-${i + 1}`;
                  const m = matches.find(item => item.id === mId);
                  const meta = KO_METADATA[mId];
                  const info = resolveKOInfo(mId);
                  if (!m || !meta) return null;

                  return (
                    <div 
                      key={mId}
                      onClick={() => handleOpenSimulation(m)}
                      className="bg-white border hover:border-indigo-400 group border-slate-150 p-4 rounded-2xl shadow-3xs cursor-pointer hover:shadow-2xs transition-all relative"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mb-2">
                        <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-white font-black text-[9px]">
                          P.{meta.num}
                        </span>
                        <span className="text-[#e11d48] font-bold">{meta.time}</span>
                      </div>

                      <div className="space-y-2">
                        {/* Local */}
                        <div className="flex items-center justify-between text-xs font-black">
                          <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                            <span>{info.localFlag || '🏳️'}</span>
                            <span className="truncate">{info.local}</span>
                          </div>
                          <span className="font-mono text-slate-500 font-bold">
                            {m.localGoals !== null ? m.localGoals : '-'}
                          </span>
                        </div>
                        {/* Visitor */}
                        <div className="flex items-center justify-between text-xs font-black">
                          <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                            <span>{info.visitorFlag || '🏳️'}</span>
                            <span className="truncate">{info.visitor}</span>
                          </div>
                          <span className="font-mono text-slate-500 font-bold">
                            {m.visitorGoals !== null ? m.visitorGoals : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 mt-2.5 pt-2 flex items-center justify-between text-[8.5px] font-mono text-slate-405">
                        <span className="truncate max-w-[55%]">{meta.venue}</span>
                        <span>{meta.date}</span>
                      </div>

                      {m.advancingTeam && (
                        <div className="bg-indigo-50 border border-indigo-150 rounded text-[9px] text-center font-bold font-mono text-indigo-700 py-0.5 mt-2">
                          Clasifica: {m.advancingTeam}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Render Octavos, Cuartos, Semis, Final side-by-side or stacked cleanly */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Octavos COLUMN */}
              <div className="space-y-4">
                <div className="border-b border-slate-150 pb-2 text-[11px] font-mono font-black uppercase text-indigo-950 tracking-wider">
                  Octavos de Final
                </div>
                {Array.from({ length: 8 }).map((_, i) => {
                  const mId = `octavos-${i + 1}`;
                  const m = matches.find(item => item.id === mId);
                  const meta = KO_METADATA[mId];
                  const info = resolveKOInfo(mId);
                  if (!m || !meta) return null;

                  return (
                    <div 
                      key={mId}
                      onClick={() => handleOpenSimulation(m)}
                      className="bg-[#fafbff] border border-blue-500/10 hover:border-indigo-500 transition-all p-3.5 rounded-2xl shadow-3xs cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono font-black mb-1.5">
                        <span className="bg-[#1e1a6c] text-[#00ff66] px-1 rounded-sm text-[8px]">P.{meta.num}</span>
                        <span className="text-slate-450">{meta.date} - {meta.time}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-black">
                          <span>{info.localFlag || '🏳️'} {info.local}</span>
                          <span className="font-mono text-slate-500">{m.localGoals !== null ? m.localGoals : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black">
                          <span>{info.visitorFlag || '🏳️'} {info.visitor}</span>
                          <span className="font-mono text-slate-500">{m.visitorGoals !== null ? m.visitorGoals : '-'}</span>
                        </div>
                      </div>
                      {m.advancingTeam && (
                        <div className="text-[8px] uppercase tracking-wide bg-indigo-50 text-indigo-800 py-0.5 px-1.5 rounded mt-1.5 text-center font-extrabold">
                          Pasa: {m.advancingTeam}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cuartos COLUMN */}
              <div className="space-y-4">
                <div className="border-b border-slate-150 pb-2 text-[11px] font-mono font-black uppercase text-indigo-950 tracking-wider">
                  Cuartos de Final
                </div>
                {Array.from({ length: 4 }).map((_, i) => {
                  const mId = `cuartos-${i + 1}`;
                  const m = matches.find(item => item.id === mId);
                  const meta = KO_METADATA[mId];
                  const info = resolveKOInfo(mId);
                  if (!m || !meta) return null;

                  return (
                    <div 
                      key={mId}
                      onClick={() => handleOpenSimulation(m)}
                      className="bg-indigo-50/[0.2] border border-indigo-500/10 hover:border-indigo-550 transition-all p-4 rounded-2xl shadow-3xs cursor-pointer lg:mt-6"
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono font-black mb-1.5">
                        <span className="bg-indigo-900 text-white px-1 rounded-sm text-[8px]">P.{meta.num}</span>
                        <span className="text-slate-450">{meta.date} - {meta.time}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-black">
                          <span>{info.localFlag || '🏳️'} {info.local}</span>
                          <span className="font-mono text-slate-500">{m.localGoals !== null ? m.localGoals : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black">
                          <span>{info.visitorFlag || '🏳️'} {info.visitor}</span>
                          <span className="font-mono text-slate-500">{m.visitorGoals !== null ? m.visitorGoals : '-'}</span>
                        </div>
                      </div>
                      {m.advancingTeam && (
                        <div className="text-[8px] bg-indigo-500 text-white py-0.5 px-1.5 rounded mt-1.5 text-center font-extrabold">
                          Pasa: {m.advancingTeam}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Semifinales COLUMN */}
              <div className="space-y-4">
                <div className="border-b border-slate-150 pb-2 text-[11px] font-mono font-black uppercase text-indigo-950 tracking-wider">
                  Semifinales
                </div>
                {Array.from({ length: 2 }).map((_, i) => {
                  const mId = `semis-${i + 1}`;
                  const m = matches.find(item => item.id === mId);
                  const meta = KO_METADATA[mId];
                  const info = resolveKOInfo(mId);
                  if (!m || !meta) return null;

                  return (
                    <div 
                      key={mId}
                      onClick={() => handleOpenSimulation(m)}
                      className="bg-[#fff9fa] border border-[#f43f5e]/10 hover:border-rose-450 transition-all p-4 rounded-2xl shadow-3xs cursor-pointer lg:mt-16"
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono font-black mb-1.5">
                        <span className="bg-rose-600 text-white px-1 rounded-sm text-[8px]">P.{meta.num}</span>
                        <span className="text-rose-500">{meta.date} - {meta.time}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-black">
                          <span>{info.localFlag || '🏳️'} {info.local}</span>
                          <span className="font-mono text-slate-500">{m.localGoals !== null ? m.localGoals : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-black">
                          <span>{info.visitorFlag || '🏳️'} {info.visitor}</span>
                          <span className="font-mono text-slate-500">{m.visitorGoals !== null ? m.visitorGoals : '-'}</span>
                        </div>
                      </div>
                      {m.advancingTeam && (
                        <div className="text-[8px] bg-rose-600 text-white py-0.5 px-1.5 rounded mt-1.5 text-center font-extrabold">
                          Pasa: {m.advancingTeam}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Final & 3er COLUMN */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="border-b border-amber-300 pb-2 text-[11px] font-mono font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    Gran Final
                  </div>
                  {(() => {
                    const mId = 'final-1';
                    const m = matches.find(item => item.id === mId);
                    const meta = KO_METADATA[mId];
                    const info = resolveKOInfo(mId);
                    if (!m || !meta) return null;

                    return (
                      <div 
                        onClick={() => handleOpenSimulation(m)}
                        className="bg-amber-500/10 border-2 border-amber-500/40 hover:border-amber-500 transition-all p-4.5 rounded-3xl shadow-sm cursor-pointer relative"
                      >
                        <div className="absolute top-1 text-[8px] font-black uppercase tracking-widest text-amber-800 bg-amber-500/25 px-2 rounded right-1">
                          CAMPEÓN DE COPA
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono font-black mb-1.5 mt-2">
                          <span className="bg-amber-600 text-white px-1 rounded-sm text-[8px]">P.{meta.num}</span>
                          <span className="text-amber-800">{meta.date} - {meta.time}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-black text-amber-950">
                            <span>{info.localFlag || '🏳️'} {info.local}</span>
                            <span className="font-mono text-amber-950 font-extrabold bg-white px-1.5 py-0.5 rounded shadow-3xs">{m.localGoals !== null ? m.localGoals : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-black text-amber-950">
                            <span>{info.visitorFlag || '🏳️'} {info.visitor}</span>
                            <span className="font-mono text-amber-950 font-extrabold bg-white px-1.5 py-0.5 rounded shadow-3xs">{m.visitorGoals !== null ? m.visitorGoals : '-'}</span>
                          </div>
                        </div>
                        {m.advancingTeam && (
                          <div className="text-[10px] bg-amber-500 border border-amber-600 text-slate-950 py-1 px-2.5 rounded-xl mt-3 text-center font-black uppercase tracking-wider shadow-sm animate-bounce">
                            🏆 ¡ {m.advancingTeam} ! 🏆
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* 3er Puesto */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-mono font-black uppercase text-slate-500 tracking-wider">
                    Tercer Puesto
                  </div>
                  {(() => {
                    const mId = '3er-puesto-1';
                    const m = matches.find(item => item.id === mId);
                    const meta = KO_METADATA[mId];
                    const info = resolveKOInfo(mId);
                    if (!m || !meta) return null;

                    return (
                      <div 
                        onClick={() => handleOpenSimulation(m)}
                        className="bg-slate-50 border hover:border-slate-400 transition-all p-3.5 rounded-2xl shadow-3xs cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono font-black mb-1.5">
                          <span className="bg-slate-600 text-white px-1 rounded-sm text-[8px]">P.103</span>
                          <span className="text-slate-500">{meta.date} - {meta.time}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-black">
                            <span>{info.localFlag || '🏳️'} {info.local}</span>
                            <span className="font-mono text-slate-500">{m.localGoals !== null ? m.localGoals : '-'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-black">
                            <span>{info.visitorFlag || '🏳️'} {info.visitor}</span>
                            <span className="font-mono text-slate-500">{m.visitorGoals !== null ? m.visitorGoals : '-'}</span>
                          </div>
                        </div>
                        {m.advancingTeam && (
                          <div className="text-[8px] bg-slate-600 text-white py-0.5 px-1.5 rounded mt-1.5 text-center font-extrabold">
                            Bronce: {m.advancingTeam}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🔮 ELEGANT SIMULATION MODAL */}
      {editingMatch && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col relative space-y-4 animate-scaleUp">
            
            {/* Close Button */}
            <button 
              onClick={() => setEditingMatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Heading */}
            <div className="text-center">
              <span className="text-[10px] font-black uppercase font-mono tracking-widest text-indigo-600 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                Simulador del Cotejo
              </span>
              <h3 className="text-sm font-black text-slate-900 uppercase mt-2">
                Simular Marcador Oficial
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Modifica los goles para recalcular instantáneamente la tabla de posiciones, los últimos 5 y el cuadro final.
              </p>
            </div>

            {/* Teams display & inputs */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between gap-2.5">
                <div className="w-[42%] text-center space-y-1">
                  <div className="w-8 h-8 mx-auto flex items-center justify-center overflow-hidden rounded-full"><Flag teamName={editingMatch.local} className="w-full h-full rounded-full" variant="circle" /></div>
                  <div className="text-xs font-black truncate text-slate-900" title={editingMatch.local}>{editingMatch.local}</div>
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={simLocalGoals}
                    onChange={(e) => setSimLocalGoals(e.target.value)}
                    className="w-11 h-11 text-center font-mono font-black text-base bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl shadow-xs"
                  />
                  <span className="text-slate-400 font-extrabold">:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={simVisitorGoals}
                    onChange={(e) => setSimVisitorGoals(e.target.value)}
                    className="w-11 h-11 text-center font-mono font-black text-base bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 rounded-xl shadow-xs"
                  />
                </div>

                <div className="w-[42%] text-center space-y-1">
                  <div className="w-8 h-8 mx-auto flex items-center justify-center overflow-hidden rounded-full"><Flag teamName={editingMatch.visitor} className="w-full h-full rounded-full" variant="circle" /></div>
                  <div className="text-xs font-black truncate text-slate-900" title={editingMatch.visitor}>{editingMatch.visitor}</div>
                </div>
              </div>

              {/* Advancing team selector for KO rounds */}
              {editingMatch.round !== 'grupos' && (
                <div className="space-y-1 mt-2">
                  <label className="text-[10px] font-mono font-black text-slate-450 uppercase tracking-widest block">
                    Equipo que Clasifica (Bono Penal/Prórroga)
                  </label>
                  <select
                    value={simAdvancing}
                    onChange={(e) => setSimAdvancing(e.target.value)}
                    className="w-full text-xs font-bold py-2 bg-white border border-slate-200 px-3 outline-none focus:ring-1 focus:ring-indigo-300 rounded-xl text-slate-800"
                  >
                    <option value="">Selecciona clasificado...</option>
                    <option value={editingMatch.local}>{editingMatch.local}</option>
                    <option value={editingMatch.visitor}>{editingMatch.visitor}</option>
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSaveSimulation}
                className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs tracking-tight rounded-xl cursor-pointer transition-all text-center"
              >
                GUARDAR SIMULACIÓN
              </button>
              <button
                onClick={handleClearSimulation}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs tracking-tight rounded-xl cursor-pointer transition-all text-center"
              >
                LIMPIAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
