import React, { useState, useMemo } from 'react';
import { Match, Player, RoundId, PlayerLeaderboardRow, Prediction } from '../types';
import { Flag } from './Flag';
import { calculatePredictionScore, ROUNDS } from '../utils/rulesEngine';
import { TEAM_STATS } from '../utils/tournamentEngine';
import { 
  ShieldCheck, 
  Flame, 
  CircleAlert, 
  Eye, 
  Trophy, 
  Calendar, 
  CheckCircle, 
  Search, 
  Edit2,
  Users,
  Filter,
  Activity,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Info,
  X,
  UserCheck
} from 'lucide-react';

interface MatchesListProps {
  matches: Match[];
  players: Player[];
  selectedRoundId: RoundId;
  currentStandings?: PlayerLeaderboardRow[];
  onUpdateMatchResult: (matchId: string, localGoals: number | null, visitorGoals: number | null, advancingTeam?: string | null) => void;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
  onRoundChange?: (roundId: RoundId) => void;
}

export const MatchesList: React.FC<MatchesListProps> = ({
  matches,
  players,
  selectedRoundId,
  currentStandings = [],
  onUpdateMatchResult,
  selectedPlayerId = '',
  onSelectPlayer,
  onRoundChange
}) => {
  // Top level views: 'comparativa' (all matches compared) or 'auditor' (individual player details)
  const [activeTab, setActiveTab] = useState<'comparativa' | 'auditor'>('comparativa');
  
  // Grouping choices in Comparativa view
  const [groupBy, setGroupBy] = useState<'grupo' | 'fecha' | 'pais' | 'estado'>('grupo');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected player search inside individual auditor
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState<boolean>(false);

  // Auditor checkboxes
  const [filterOnlyHits, setFilterOnlyHits] = useState<boolean>(false);
  const [filterOnlyMisses, setFilterOnlyMisses] = useState<boolean>(false);

  // Match comparison modal
  const [selectedComparisonMatch, setSelectedComparisonMatch] = useState<Match | null>(null);

  // Fallback selected player handling
  const currentPlayerId = selectedPlayerId && players.some(p => p.id === selectedPlayerId)
    ? selectedPlayerId 
    : (players[0]?.id || '');
  const selectedPlayer = players.find(p => p.id === currentPlayerId);

  const currentRoundMatches = useMemo(() => {
    return matches.filter(m => m.round === selectedRoundId);
  }, [matches, selectedRoundId]);

  // Normalize text for search matchings
  const normalizeForSearch = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Chronologically sorting round matches
  const chronoMatches = useMemo(() => {
    return [...currentRoundMatches].sort((a, b) => {
      const [dA, mA, yA] = a.date.split('/').map(Number);
      const [dB, mB, yB] = b.date.split('/').map(Number);
      const tA = new Date(yA, mA - 1, dA).getTime();
      const tB = new Date(yB, mB - 1, dB).getTime();
      if (tA !== tB) return tA - tB;
      return a.time.localeCompare(b.time);
    });
  }, [currentRoundMatches]);

  // Unique list of teams in the current round for selection
  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    currentRoundMatches.forEach(m => {
      teams.add(m.local);
      teams.add(m.visitor);
    });
    return Array.from(teams).sort();
  }, [currentRoundMatches]);

  // List of players filtered by user search query in Auditor tab
  const filteredPlayersSelect = useMemo(() => {
    const q = normalizeForSearch(playerSearchQuery);
    if (!q) return players;
    return players.filter(p => normalizeForSearch(p.name).includes(q));
  }, [players, playerSearchQuery]);

  // Calculated stats summary card for selectedPlayer in selected round
  const selectedPlayerStats = useMemo(() => {
    if (!selectedPlayer) return null;
    let exacts = 0;
    let winnerCorrect = 0;
    let totalPoints = 0;

    currentRoundMatches.forEach(m => {
      const pred = selectedPlayer.predictions[m.id];
      if (pred) {
        const { score, isExact } = calculatePredictionScore(m, pred);
        totalPoints += score;
        if (isExact) {
          exacts += 1;
        } else if (score > 0) {
          winnerCorrect += 1;
        }
      }
    });

    const leaderboardRow = currentStandings.find(row => row.playerId === selectedPlayer.id);

    return {
      exacts,
      winnerCorrect,
      totalPoints,
      rank: leaderboardRow ? leaderboardRow.rank : '-'
    };
  }, [selectedPlayer, currentRoundMatches, currentStandings]);

  // 1. GROUPING & FILTERING MATHEMATICS FOR COMPARATIVA VIEW
  const organizedMatches = useMemo(() => {
    let list = [...chronoMatches];

    // Filter by text search
    if (searchQuery.trim() !== '') {
      const q = normalizeForSearch(searchQuery);
      list = list.filter(m => {
        return normalizeForSearch(m.local).includes(q) || 
               normalizeForSearch(m.visitor).includes(q) ||
               (m.group && `grupo ${normalizeForSearch(m.group)}`.includes(q));
      });
    }

    const structure: Record<string, Match[]> = {};

    if (groupBy === 'grupo') {
      list.forEach(m => {
        let key = '';
        if (m.round === 'grupos') {
          key = m.group ? `Grupo ${m.group}` : 'Otros';
        } else {
          const rObj = ROUNDS.find(r => r.id === m.round);
          key = rObj ? rObj.name : m.round.toUpperCase();
        }
        if (!structure[key]) structure[key] = [];
        structure[key].push(m);
      });
    } else if (groupBy === 'fecha') {
      list.forEach(m => {
        const key = m.date; // e.g. "11/06/2026"
        if (!structure[key]) structure[key] = [];
        structure[key].push(m);
      });
    } else if (groupBy === 'pais') {
      if (selectedCountry) {
        structure[selectedCountry] = list.filter(m => m.local === selectedCountry || m.visitor === selectedCountry);
      } else {
        structure['Por favor selecciona un país'] = [];
      }
    } else if (groupBy === 'estado') {
      structure['Partidos Jugados'] = list.filter(m => m.localGoals !== null && m.visitorGoals !== null);
      structure['Partidos Pendientes'] = list.filter(m => m.localGoals === null || m.visitorGoals === null);
    }

    return structure;
  }, [chronoMatches, groupBy, selectedCountry, searchQuery]);

  // Dynamic sorting keys for group headings
  const sortedStructureKeys = useMemo(() => {
    return Object.keys(organizedMatches).sort((a, b) => {
      if (groupBy === 'grupo') {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (groupBy === 'fecha') {
        const [dA, mA, yA] = a.split('/').map(Number);
        const [dB, mB, yB] = b.split('/').map(Number);
        return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
      }
      return 0; // maintain original chronological array ordering for selections & status
    });
  }, [organizedMatches, groupBy]);

  // STREAK (RACHA) COMPUTATION HELPER
  // Finds up to the last 5 completed matches inside the round, and computes green/blue/red outcomes
  const getPlayerStreak = (player: Player) => {
    // Sort all played matches in current round
    const playedInRound = chronoMatches.filter(m => m.localGoals !== null && m.visitorGoals !== null);
    // Take last 5
    const lastCompleted = playedInRound.slice(-5);
    
    return lastCompleted.map(m => {
      const pred = player.predictions[m.id];
      if (!pred) return 'gray'; // no prediction sent
      const { score, isExact } = calculatePredictionScore(m, pred);
      if (isExact) return 'green';
      if (score > 0) return 'blue';
      return 'red';
    });
  };

  // INDIVIDUAL AUDITOR MATCHES LIST FILTER
  const auditorFilteredMatches = useMemo(() => {
    if (!selectedPlayer) return [];
    
    return chronoMatches.filter(m => {
      const pred = selectedPlayer.predictions[m.id];
      const isPlayed = m.localGoals !== null && m.visitorGoals !== null;
      
      let matchScore = 0;
      if (pred && isPlayed) {
        const result = calculatePredictionScore(m, pred);
        matchScore = result.score;
      }

      if (filterOnlyHits) {
        return pred && isPlayed && matchScore > 0;
      }
      if (filterOnlyMisses) {
        return (!pred && isPlayed) || (pred && isPlayed && matchScore === 0);
      }

      return true;
    });
  }, [selectedPlayer, chronoMatches, filterOnlyHits, filterOnlyMisses]);

  // COMPARISON MODAL MATH FOR CLICKED MATCH
  const comparedPlayersRows = useMemo(() => {
    if (!selectedComparisonMatch) return [];

    const rows = players.map(p => {
      const pred = p.predictions[selectedComparisonMatch.id];
      
      let score = 0;
      let isExact = false;
      let winEst = '-';
      let detail = 'Fallo (0 Pts)';
      let predictedAdvancing = '-';

      if (pred) {
        const predL = pred.localGoals;
        const predV = pred.visitorGoals;
        if (predL > predV) winEst = 'Local';
        else if (predL < predV) winEst = 'Visitante';
        else winEst = 'Empate';

        const adv = pred.advancingTeam;
        if (adv) {
          if (adv.toLowerCase() === 'local') {
            predictedAdvancing = selectedComparisonMatch.local;
          } else if (adv.toLowerCase() === 'visitor' || adv.toLowerCase() === 'visitante') {
            predictedAdvancing = selectedComparisonMatch.visitor;
          } else {
            predictedAdvancing = adv;
          }
        } else {
          // Infer from 90 mins predictions if possible
          if (predL > predV) {
            predictedAdvancing = selectedComparisonMatch.local;
          } else if (predL < predV) {
            predictedAdvancing = selectedComparisonMatch.visitor;
          }
        }

        const isPlayedCurrent = selectedComparisonMatch.localGoals !== null && selectedComparisonMatch.visitorGoals !== null;
        if (isPlayedCurrent) {
          const evalResult = calculatePredictionScore(selectedComparisonMatch, pred);
          score = evalResult.score;
          isExact = evalResult.isExact;
          if (isExact) detail = `Exacto (+${score})`;
          else if (score > 0) detail = `Ganador (+${score})`;
        } else {
          detail = 'Por Jugar';
        }
      } else {
        detail = 'Sin Pronóstico';
      }

      const streakColors = getPlayerStreak(p);

      return {
        playerName: p.name,
        prediction: pred ? `${pred.localGoals} - ${pred.visitorGoals}` : '-',
        winEst,
        predictedAdvancing,
        score,
        detail,
        streakColors
      };
    });

    // Sort: high points score first, then name
    rows.sort((a, b) => {
      if (selectedComparisonMatch.localGoals !== null && selectedComparisonMatch.visitorGoals !== null) {
        if (b.score !== a.score) return b.score - a.score;
      }
      return a.playerName.localeCompare(b.playerName);
    });

    return rows;
  }, [selectedComparisonMatch, players, chronoMatches]);

  return (
    <div className="space-y-6 animate-fadeIn" id="predictions-control-hub">
      
      {/* 🏅 Phase Selector Nav Tabs inside Pronósticos */}
      {onRoundChange && (
        <section className="bg-white dark:bg-[#130d2d] rounded-2xl border border-slate-100 dark:border-[#221a48] p-3 shadow-xs animate-fadeIn" id="predictions-round-selector">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Mobile Round Selection */}
            <div className="block sm:hidden w-full">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-300 font-mono uppercase tracking-wider block mb-1">
                Fase Seleccionada (Pronósticos)
              </span>
              <select
                id="predictions-round-select-mobile"
                value={selectedRoundId}
                onChange={(e) => onRoundChange(e.target.value as RoundId)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-[#090724] text-white font-mono text-xs font-black border border-indigo-950 focus:ring-2 focus:ring-emerald-400 outline-none shadow-md"
              >
                {ROUNDS.map((r) => (
                  <option key={r.id} value={r.id} className="font-mono bg-slate-900 text-white">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Round Selection */}
            <div className="hidden sm:flex flex-wrap items-center gap-1">
              {ROUNDS.map((r) => {
                const isActive = selectedRoundId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => onRoundChange(r.id)}
                    className={`px-4 py-2 rounded-xl font-mono text-xs font-black transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#090724] dark:bg-[#090724] text-[#00ff66] shadow-md border border-emerald-500/20'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1c153f]'
                    }`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 🧭 NAV SUB-TABS */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('comparativa')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === 'comparativa' 
              ? 'bg-slate-900 text-[#00ff66]' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          👥 Comparador por Partido
        </button>
        <button
          onClick={() => setActiveTab('auditor')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-tight rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === 'auditor' 
              ? 'bg-slate-900 text-[#00ff66]' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          👤 Auditor por Participante
        </button>
      </div>

      {/* VIEW: COMPARATIVA */}
      {activeTab === 'comparativa' && (
        <div className="space-y-4">
          
          {/* Controls Box */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-3xs">
            
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por país o Grupo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>

            {/* Group Filters Horizontals */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
              <span className="text-[10px] uppercase font-mono font-black text-slate-400">Ver por:</span>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/50 p-1 rounded-xl">
                {(['grupo', 'fecha', 'pais', 'estado'] as const).map(pill => (
                  <button
                    key={pill}
                    onClick={() => {
                      setGroupBy(pill);
                      if (pill === 'pais' && !selectedCountry && uniqueTeams.length > 0) {
                        setSelectedCountry(uniqueTeams[0]);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-tight transition-all cursor-pointer ${
                      groupBy === pill ? 'bg-slate-900 text-[#00ff66]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {pill === 'grupo' ? 'Grupo' : pill === 'fecha' ? 'Fecha' : pill === 'pais' ? 'Selección' : 'Estado'}
                  </button>
                ))}
              </div>

              {/* Country selector if groupBy selection */}
              {groupBy === 'pais' && (
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800 outline-none max-w-[150px]"
                >
                  {uniqueTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              )}
            </div>

          </div>

          {/* Groupings Frame */}
          <div className="space-y-6">
            {sortedStructureKeys.map(groupKey => {
              const listMatches = organizedMatches[groupKey];
              if (!listMatches || listMatches.length === 0) return null;

              return (
                <div key={groupKey} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                    <span className="text-xs uppercase font-mono font-black text-indigo-950 tracking-wider">
                      {groupKey}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">({listMatches.length} partidos)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listMatches.map(m => {
                      const isPlayed = m.localGoals !== null && m.visitorGoals !== null;
                      const localFlag = TEAM_STATS[m.local]?.flag || '🏳️';
                      const visitorFlag = TEAM_STATS[m.visitor]?.flag || '🏳️';

                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedComparisonMatch(m)}
                          className="bg-white border hover:border-indigo-400 border-slate-150 p-4 rounded-2xl shadow-3xs hover:shadow-2xs cursor-pointer transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-400 mb-2.5">
                            <span>{m.date} - {m.time} BOT</span>
                            {m.group && (
                              <span className="text-[8px] uppercase tracking-wider font-extrabold bg-[#090724] text-[#00ff66] px-1.5 rounded-sm">
                                Grupo {m.group}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1 p-2 bg-slate-50/75 rounded-xl border border-slate-100">
                            <span className="w-[42%] text-right font-bold text-xs text-slate-850 truncate flex items-center justify-end gap-1.5">
                              <Flag teamName={m.local} variant="circle" />
                              <span className="truncate">{m.local}</span>
                            </span>
                            <div className="px-2 py-0.5 bg-slate-900 border border-slate-800 font-mono text-[11px] text-white rounded font-black text-center min-w-[44px]">
                              {isPlayed ? `${m.localGoals} - ${m.visitorGoals}` : 'VS'}
                            </div>
                            <span className="w-[42%] text-left font-bold text-xs text-slate-850 truncate flex items-center justify-start gap-1.5">
                              <Flag teamName={m.visitor} variant="circle" />
                              <span className="truncate">{m.visitor}</span>
                            </span>
                          </div>

                          <div className="border-t border-slate-100 mt-3 pt-2 text-[10px] text-indigo-600 font-extrabold flex items-center justify-between font-mono">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              Ver pronósticos de todos
                            </span>
                            <span className="text-slate-450 font-normal">Clic para comparar</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* VIEW: AUDITOR INDIVIDUAL */}
      {activeTab === 'auditor' && selectedPlayer && (
        <div className="space-y-6">
          
          {/* Quick Player Autocomp Controller */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3 shadow-3xs relative">
            <div className="text-xs uppercase font-mono font-black text-slate-450">Auditar Pronósticos de:</div>
            
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Buscar participante..."
                value={playerSearchQuery}
                onFocus={() => setShowPlayerDropdown(true)}
                onChange={(e) => {
                  setPlayerSearchQuery(e.target.value);
                  setShowPlayerDropdown(true);
                }}
                className="w-full pl-3 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-500 text-slate-800"
              />
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />

              {/* Suggestions Dropdown overlay */}
              {showPlayerDropdown && (
                <div className="absolute left-0 right-0 top-11 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto z-40">
                  {filteredPlayersSelect.length === 0 ? (
                    <div className="p-3 text-[11px] text-slate-405 italic">No se hallaron participantes.</div>
                  ) : (
                    filteredPlayersSelect.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (onSelectPlayer) onSelectPlayer(p.id);
                          setPlayerSearchQuery('');
                          setShowPlayerDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer ${
                          p.id === currentPlayerId ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'text-slate-700'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Dropdown Backdrop to close */}
            {showPlayerDropdown && (
              <div 
                className="fixed inset-0 z-30 cursor-default" 
                onClick={() => setShowPlayerDropdown(false)} 
              />
            )}

            {/* Aciertos & Fallos Filter checkboxes */}
            <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={filterOnlyHits}
                  onChange={(e) => {
                    setFilterOnlyHits(e.target.checked);
                    if (e.target.checked) setFilterOnlyMisses(false);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-350 cursor-pointer"
                />
                Solo mis aciertos
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={filterOnlyMisses}
                  onChange={(e) => {
                    setFilterOnlyMisses(e.target.checked);
                    if (e.target.checked) setFilterOnlyHits(false);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-350 cursor-pointer"
                />
                Solo mis fallos
              </label>
            </div>
          </div>

          {/* 🌟 USER RESUMEN TARGET SCORE CARD */}
          {selectedPlayerStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 text-white rounded-2xl p-4.5 border border-indigo-950 flex flex-col justify-between">
                <span className="text-[9.5px] font-mono tracking-widest text-[#00ff66] font-black uppercase">Marcadores Exactos</span>
                <span className="text-2xl font-black mt-2 text-white block">{selectedPlayerStats.exacts}</span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1">Suman (+4 pts / +5 pts cada uno)</span>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-between">
                <span className="text-[9.5px] font-mono tracking-widest text-indigo-500 font-black uppercase">Ganadores Correctos</span>
                <span className="text-2xl font-black mt-2 text-slate-905 block">{selectedPlayerStats.winnerCorrect}</span>
                <span className="text-[10px] text-slate-400 font-mono mt-1">Signo acertado (+3 pts / +4 pts)</span>
              </div>
              <div className="bg-white border border-[#00ff66]/25 rounded-2xl p-4.5 flex flex-col justify-between shadow-xs">
                <span className="text-[9.5px] font-mono tracking-widest text-emerald-600 font-black uppercase">Puntos Totales</span>
                <span className="text-2xl font-black mt-2 text-emerald-950 block">{selectedPlayerStats.totalPoints} <span className="text-xs text-slate-400 font-normal">pts</span></span>
                <span className="text-[10px] text-slate-400 font-mono mt-1">Conseguido en el intervalo actual</span>
              </div>
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4.5 flex flex-col justify-between">
                <span className="text-[9.5px] font-mono tracking-widest text-indigo-700 font-black uppercase">Posición General</span>
                <span className="text-2xl font-black mt-2 text-indigo-950 block">Ranking #{selectedPlayerStats.rank}</span>
                <span className="text-[10px] text-indigo-400 font-mono mt-1">Según la tabla de posiciones en vivo</span>
              </div>
            </div>
          )}

          {/* List of matched player predictions */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {auditorFilteredMatches.length === 0 ? (
              <div className="py-16 text-center">
                <CircleAlert className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                <p className="text-slate-450 text-xs font-mono">No se hallaron predicciones bajo estos filtros.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditorFilteredMatches.map(m => {
                  const pred = selectedPlayer.predictions[m.id];
                  const isPlayed = m.localGoals !== null && m.visitorGoals !== null;
                  
                  let score = 0;
                  let isExact = false;
                  if (pred && isPlayed) {
                    const result = calculatePredictionScore(m, pred);
                    score = result.score;
                    isExact = result.isExact;
                  }

                  const localFlag = TEAM_STATS[m.local]?.flag || '🏳️';
                  const visitorFlag = TEAM_STATS[m.visitor]?.flag || '🏳️';

                  return (
                    <div 
                      key={m.id} 
                      onClick={() => setSelectedComparisonMatch(m)}
                      className="p-4 hover:bg-slate-50/40 cursor-pointer transition-colors flex flex-col md:grid md:grid-cols-12 gap-3 items-center group"
                    >
                      {/* Date details */}
                      <div className="md:col-span-3 w-full flex flex-row md:flex-col items-center md:items-start justify-between gap-1">
                        <span className="text-[11px] text-slate-505 font-mono font-black">{m.date} - {m.time} BOT</span>
                        {m.group ? (
                          <span className="text-[8.5px] bg-slate-900 text-[#00ff66] px-1.5 py-0.5 rounded border border-slate-800 uppercase font-mono font-extrabold shadow-sm">
                            Grupo {m.group}
                          </span>
                        ) : (
                          <span className="text-[8.5px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-mono font-black">
                            Eliminatorias
                          </span>
                        )}
                      </div>

                      {/* Middle Frame comparison */}
                      <div className="md:col-span-6 w-full flex items-center justify-between gap-3 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="w-[37%] text-right font-bold text-xs text-slate-800 truncate flex items-center justify-end gap-1.5">
                          <Flag teamName={m.local} variant="circle" />
                          <span className="truncate">{m.local}</span>
                        </div>
                        
                        <div className="text-center shrink-0 flex items-center gap-1 bg-white border border-slate-100 rounded-lg py-1 px-3">
                          <span className="text-[10px] text-slate-450 font-mono font-bold block">Pred:</span>
                          <span className="text-xs font-mono font-black text-slate-900">
                            {pred ? `${pred.localGoals} - ${pred.visitorGoals}` : 'Sin pronós'}
                          </span>
                        </div>

                        <div className="w-[37%] text-left font-bold text-xs text-slate-800 truncate flex items-center justify-start gap-1.5">
                          <Flag teamName={m.visitor} variant="circle" />
                          <span className="truncate">{m.visitor}</span>
                        </div>
                      </div>

                      {/* Right Scores */}
                      <div className="md:col-span-3 w-full flex justify-end">
                        {isPlayed ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-450 font-mono font-bold">Real: {m.localGoals} &ndash; {m.visitorGoals}</span>
                            <span className={`text-[10.5px] uppercase font-mono font-black px-2 py-0.5 mt-1 rounded border flex items-center gap-1 ${
                              score > 0 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}>
                              {isExact ? `Exacto! (+${score} Pts)` : score > 0 ? `Ganador (+${score} Pts)` : `Fallo (0 Pts)`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No disputado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 🔮 INTERACTIVE DYNAMIC COMPARATIVE MATCH MODAL */}
      {selectedComparisonMatch && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col relative space-y-4 max-h-[85vh] animate-scaleUp">
            
            {/* Close */}
            <button 
              onClick={() => setSelectedComparisonMatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Heading Header */}
            <div>
              <span className="text-[9px] font-black uppercase font-mono tracking-widest text-indigo-600 px-2 py-0.5 bg-indigo-50 border border-indigo-150 rounded-lg">
                Vista Comparativa
              </span>
              <h3 className="text-sm font-black text-slate-900 uppercase mt-1.5 flex items-center gap-1">
                Pronósticos de todos los participantes
              </h3>
              <p className="text-slate-500 text-[11px]">
                Compara las predicciones de todos los jugadores en tiempo real para este enfrentamiento.
              </p>
            </div>

            {/* Match Banner info */}
            <div className="bg-[#0c0a28] text-white p-4.5 rounded-2xl border border-indigo-950 flex justify-between items-center relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="w-[38%] text-right space-y-0.5 truncate flex flex-col items-end">
                <Flag teamName={selectedComparisonMatch.local} className="w-8 h-8 rounded-full" variant="circle" />
                <span className="text-[11.5px] font-bold block text-slate-100 truncate w-full">{selectedComparisonMatch.local}</span>
              </div>

              <div className="text-center font-mono shrink-0">
                <span className="text-[8px] uppercase tracking-widest font-black block text-[#00ff66] bg-[#1a2130] px-2 py-0.5 rounded border border-[#00ff66]/10 mb-2">
                  Marcador Real
                </span>
                <span className="text-xl font-black tracking-wider text-white">
                  {selectedComparisonMatch.localGoals !== null && selectedComparisonMatch.visitorGoals !== null
                    ? `${selectedComparisonMatch.localGoals} - ${selectedComparisonMatch.visitorGoals}`
                    : 'VS'}
                </span>
              </div>

              <div className="w-[38%] text-left space-y-0.5 truncate flex flex-col items-start">
                <Flag teamName={selectedComparisonMatch.visitor} className="w-8 h-8 rounded-full" variant="circle" />
                <span className="text-[11.5px] font-bold block text-slate-100 truncate w-full">{selectedComparisonMatch.visitor}</span>
              </div>
            </div>

            {/* Play-Off detail */}
            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-550 border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> {selectedComparisonMatch.date} - {selectedComparisonMatch.time} BOT</span>
              <span className="flex items-center gap-1 justify-end"><Trophy className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> {selectedComparisonMatch.group ? `Grupo ${selectedComparisonMatch.group}` : 'Fase de Eliminatorias'}</span>
            </div>

            {/* Comparisons Table - SCROLLABLE ON MOBILE, STICKY FIRST COLUMN */}
            <div className="overflow-auto border border-slate-150 rounded-2xl shadow-3xs max-h-80">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-slate-50 z-20">
                    <th className="py-2.5 px-4 sticky left-0 bg-slate-50 z-25 min-w-[150px] shadow-[2px_0_5px_rgba(0,0,0,0.03)] border-r border-slate-100">Usuario</th>
                    <th className="py-2.5 px-3 text-center">Racha Últ 5</th>
                    <th className="py-2.5 px-3 text-center">Pronós</th>
                    <th className="py-2.5 px-3 text-center">Signo Est.</th>
                    {selectedComparisonMatch.round !== 'grupos' && (
                      <th className="py-2.5 px-3 text-center">Avanza / Pasa</th>
                    )}
                    <th className="py-2.5 px-3 text-center">Pts</th>
                    <th className="py-2.5 px-4 text-center">Análisis / Chip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-705">
                  {comparedPlayersRows.map((row, index) => {
                    const hasScored = selectedComparisonMatch.localGoals !== null && selectedComparisonMatch.visitorGoals !== null;
                    
                    return (
                      <tr 
                        key={row.playerName} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          hasScored && row.score > 0 
                            ? 'bg-emerald-500/[0.02]' 
                            : 'bg-white'
                        }`}
                      >
                        {/* Sticky Name Column */}
                        <td className="py-2.5 px-4 font-extrabold text-slate-900 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-100 shrink-0">
                          {row.playerName}
                        </td>

                        {/* Racha / Streaks */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1">
                            {row.streakColors.map((col, sIdx) => (
                              <span 
                                key={sIdx}
                                className={`w-2.5 h-2.5 rounded-full select-none ${
                                  col === 'green' ? 'bg-emerald-500' :
                                  col === 'blue' ? 'bg-indigo-400' :
                                  col === 'red' ? 'bg-rose-500' : 'bg-slate-300'
                                }`}
                                title={
                                  col === 'green' ? 'Resultado Exacto' :
                                  col === 'blue' ? 'Ganador Correcto' :
                                  col === 'red' ? 'Fallo' : 'Pendiente'
                                }
                              />
                            ))}
                            {row.streakColors.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">No jugados</span>
                            )}
                          </div>
                        </td>

                        {/* Pronostico */}
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                          {row.prediction}
                        </td>

                        {/* Signo */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          {row.winEst}
                        </td>

                        {/* Clasifica (Elimination only) */}
                        {selectedComparisonMatch.round !== 'grupos' && (
                          <td className="py-2.5 px-3 text-center">
                            {row.predictedAdvancing !== '-' ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50/80 border border-indigo-150 rounded-lg text-slate-800 font-extrabold shadow-3xs max-w-full">
                                <Flag teamName={row.predictedAdvancing} variant="circle" className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[90px] text-[11px] font-black">{row.predictedAdvancing}</span>
                              </div>
                            ) : (
                              <span className="text-slate-405 font-mono">-</span>
                            )}
                          </td>
                        )}

                        {/* Pts obtained */}
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-950 bg-slate-50/30">
                          {hasScored ? row.score : '-'}
                        </td>

                        {/* Chip analysis */}
                        <td className="py-2.5 px-4 text-center font-mono font-bold">
                          {hasScored ? (
                            <span className={`inline-block text-[9.5px] uppercase tracking-wide border px-2 py-0.5 rounded ${
                              row.score > 0 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}>
                              {row.detail}
                            </span>
                          ) : (
                            <span className="text-[9.5px] uppercase tracking-wide border border-slate-200 bg-slate-50 text-slate-500 px-2 py-0.5 rounded">
                              Por jugar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Info footnote */}
            <div className="text-[10px] font-mono text-slate-405 flex items-center gap-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Aciertos exactos premian con +4 pts (+5 en play-offs). Los ganadores acertados premian con +3 pts (+4 en play-offs). Si no hay acierto de signo, suma 0.</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
