import React, { useState, useMemo } from 'react';
import { Match, Player, PlayerLeaderboardRow, RoundId } from '../types';
import { calculatePredictionScore, ROUNDS } from '../utils/rulesEngine';
import { 
  GitCompare, 
  User, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  HelpCircle, 
  ShieldAlert,
  Calendar,
  AlertCircle,
  Trophy,
  Award,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  Coins,
  Gauge
} from 'lucide-react';

interface PlayerComparisonProps {
  players: Player[];
  matches: Match[];
  selectedRoundId: RoundId;
  standingsByRound: Record<RoundId, PlayerLeaderboardRow[]>;
}

export const PlayerComparison: React.FC<PlayerComparisonProps> = ({
  players,
  matches,
  selectedRoundId,
  standingsByRound
}) => {
  // Modes: 'classic' (1 vs 1) or 'multi' (3 to 5 players comparison)
  const [compareMode, setCompareMode] = useState<'classic' | 'multi'>('classic');

  // ==========================================
  // STATE & LOGIC: CLASSIC MODE (1 vs 1)
  // ==========================================
  const [playerAId, setPlayerAId] = useState<string>(players[0]?.id || '');
  const [playerBId, setPlayerBId] = useState<string>(players[1]?.id || players[0]?.id || '');

  const playerA = useMemo(() => players.find(p => p.id === playerAId), [players, playerAId]);
  const playerB = useMemo(() => players.find(p => p.id === playerBId), [players, playerBId]);

  // Round info 
  const roundMatches = useMemo(() => {
    return matches.filter(m => m.round === selectedRoundId);
  }, [matches, selectedRoundId]);

  const roundsList = useMemo(() => ROUNDS, []);

  // Standing rows
  const roundStandings = useMemo(() => standingsByRound[selectedRoundId] || [], [standingsByRound, selectedRoundId]);

  const pARow = useMemo(() => roundStandings.find(r => r.playerId === playerAId), [roundStandings, playerAId]);
  const pBRow = useMemo(() => roundStandings.find(r => r.playerId === playerBId), [roundStandings, playerBId]);

  // Chronologically sorted matches
  const sortedMatches = useMemo(() => {
    return [...roundMatches].sort((a, b) => {
      const [d1, m1, y1] = a.date.split('/').map(Number);
      const [d2, m2, y2] = b.date.split('/').map(Number);
      const dateA = new Date(y1, m1 - 1, d1).getTime();
      const dateB = new Date(y2, m2 - 1, d2).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.time.localeCompare(b.time);
    });
  }, [roundMatches]);

  // Detailed Match-by-match comparison calculation
  const matchComparisons = useMemo(() => {
    if (!playerA || !playerB) return [];

    return sortedMatches.map(match => {
      const predA = playerA.predictions[match.id];
      const predB = playerB.predictions[match.id];

      const scoredA = match.localGoals !== null && match.visitorGoals !== null;
      
      const { score: scoreA, isExact: exactA } = scoredA 
        ? calculatePredictionScore(match, predA) 
        : { score: 0, isExact: false };

      const { score: scoreB, isExact: exactB } = scoredA 
        ? calculatePredictionScore(match, predB) 
        : { score: 0, isExact: false };

      let winner: 'A' | 'B' | 'none' = 'none';
      if (scoredA) {
        if (scoreA > scoreB) winner = 'A';
        else if (scoreB > scoreA) winner = 'B';
      }

      return {
        match,
        predA,
        predB,
        scoreA,
        scoreB,
        exactA,
        exactB,
        winner,
        isPlayed: scoredA
      };
    });
  }, [sortedMatches, playerA, playerB]);

  // Aggregated comparative statistics
  const comparisonStats = useMemo(() => {
    let playedCount = 0;
    
    let totalScoreA = 0;
    let totalScoreB = 0;

    let matchWinsA = 0;  // Matches where A earned more points than B
    let matchWinsB = 0;  // Matches where B earned more points than A
    let matchDraws = 0;  // Matches where both earned identical points

    let exactHitsA = 0;
    let exactHitsB = 0;

    matchComparisons.forEach(c => {
      if (c.isPlayed) {
        playedCount++;
        totalScoreA += c.scoreA;
        totalScoreB += c.scoreB;

        if (c.scoreA > c.scoreB) matchWinsA++;
        else if (c.scoreB > c.scoreA) matchWinsB++;
        else matchDraws++;

        if (c.exactA) exactHitsA++;
        if (c.exactB) exactHitsB++;
      }
    });

    return {
      playedCount,
      totalScoreA,
      totalScoreB,
      matchWinsA,
      matchWinsB,
      matchDraws,
      exactHitsA,
      exactHitsB,
      diff: Math.abs(totalScoreA - totalScoreB),
      ahead: totalScoreA > totalScoreB ? 'A' : totalScoreB > totalScoreA ? 'B' : 'Draw'
    };
  }, [matchComparisons]);

  // Dynamic Head-to-Head win streak calculation: Chronological sequence of direct wins
  const streakInfo = useMemo(() => {
    if (compareMode !== 'classic') return null;
    const playedS = matchComparisons.filter(c => c.isPlayed);
    if (playedS.length === 0) return { player: 'none', count: 0 };

    let currentStreakWinner: 'A' | 'B' | 'none' = 'none';
    let streakCount = 0;

    // Evaluate backwards starting from the latest played match
    for (let i = playedS.length - 1; i >= 0; i--) {
      const comp = playedS[i];
      if (comp.scoreA === comp.scoreB) {
        // Tie breaks the winning streak
        break;
      }
      const matchWinner = comp.scoreA > comp.scoreB ? 'A' : 'B';
      if (currentStreakWinner === 'none') {
        currentStreakWinner = matchWinner;
        streakCount = 1;
      } else if (currentStreakWinner === matchWinner) {
        streakCount++;
      } else {
        break; // streak ended
      }
    }

    return {
      player: currentStreakWinner,
      count: streakCount
    };
  }, [matchComparisons, compareMode]);


  // ==========================================
  // STATE & LOGIC: MULTI-COMPARE MODE (3-5)
  // ==========================================
  const [selectedMultiPlayerIds, setSelectedMultiPlayerIds] = useState<string[]>(() => {
    return players.slice(0, 3).map(p => p.id); // Pre-select first 3
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="player-comparison-panel">
      
      {/* 🚀 BANNER HERO CONTROLLER */}
      <div className="bg-[#0e0c38] text-white p-6 rounded-3xl border border-indigo-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg relative overflow-hidden" id="comparison-hero">
        <div className="absolute left-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/15 p-2.5 rounded-2xl text-indigo-400 shrink-0">
            <GitCompare className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono font-black tracking-widest text-[#00ff66] bg-[#00ff66]/10 px-2.5 py-0.5 rounded-lg border border-[#00ff66]/20">
              MÓDULO DE COMPARACIÓN COPA EXTRA
            </span>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight mt-1">
              Comparador Corporativo e Individual de Pronósticos
            </h2>
            <p className="text-xs text-indigo-200 mt-1">
              Visualiza en paralelo las predicciones cara a cara tradicionales, o despliega la matriz cruzada de 3 a 5 rivales.
            </p>
          </div>
        </div>

        {/* Selected round identifier */}
        <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
          <span className="text-[9px] text-[#00ff66] font-mono font-black block text-center uppercase tracking-wider">Fase Evaluada</span>
          <span className="text-xs font-bold text-white mt-0.5 block text-center">
            {roundsList.find(r => r.id === selectedRoundId)?.name || selectedRoundId}
          </span>
        </div>
      </div>

      {/* 🎛️ MODE SELECTOR (Classic 1v1 vs Multi 3-5) */}
      <div className="flex border-b border-slate-200 dark:border-[#221a48] pb-[1px]">
        <button
          onClick={() => setCompareMode('classic')}
          className={`cursor-pointer px-5 py-3 text-xs uppercase font-extrabold tracking-wider transition-all duration-150 relative ${
            compareMode === 'classic'
              ? 'text-indigo-600 dark:text-amber-400 border-b-2 border-indigo-600 dark:border-amber-400 font-black'
              : 'text-slate-400 dark:text-indigo-300 hover:text-slate-600'
          }`}
        >
          Análisis Clásico 1vs1
        </button>
        <button
          onClick={() => setCompareMode('multi')}
          className={`cursor-pointer px-5 py-3 text-xs uppercase font-extrabold tracking-wider transition-all duration-150 relative ${
            compareMode === 'multi'
              ? 'text-indigo-600 dark:text-amber-400 border-b-2 border-indigo-600 dark:border-amber-400 font-black'
              : 'text-slate-400 dark:text-indigo-300 hover:text-slate-600'
          }`}
        >
          Multicomparador H2H (3-5 Jugadores)
        </button>
      </div>

      {/* RENDER MODE A: CLASSIC (1 vs 1) */}
      {compareMode === 'classic' && (
        <>
          {/* 🤝 PLAYER CHOICE CONTROLLER SECTION */}
          <div className="bg-white dark:bg-[#130d2d] border border-slate-100 dark:border-[#221a48] rounded-3xl p-5.5 shadow-sm space-y-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Selector Participant A */}
            <div className="md:col-span-5 space-y-2">
              <label className="text-[10px] uppercase font-mono font-black text-slate-450 dark:text-indigo-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-505" />
                PARTICIPANTE A (IZQUIERDA)
              </label>
              <select
                value={playerAId}
                onChange={(e) => setPlayerAId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-black border border-slate-200 dark:border-[#2b215c] outline-none rounded-xl bg-slate-50 text-slate-800 dark:bg-[#110c29] dark:text-slate-100 focus:ring-1 focus:ring-indigo-300"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === playerBId}>
                    {p.name} {p.isEliminated ? '(Eliminado)' : ''}
                  </option>
                ))}
              </select>

              {pARow && (
                <div className="flex items-center gap-2 mt-1 text-[10.5px] font-mono text-slate-500 dark:text-slate-400 font-semibold pl-1">
                  <span>Posición: <strong className="text-slate-850 dark:text-white">{pARow.isEliminated ? 'Eliminado' : `${pARow.rank}º`}</strong></span>
                  <span>&bull;</span>
                  <span>Puntos: <strong className="text-indigo-950 dark:text-amber-300 font-bold">{pARow.totalRoundPoints} pts</strong></span>
                </div>
              )}
            </div>

            {/* Verses indicator logo */}
            <div className="md:col-span-2 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#090724] border border-indigo-950 flex items-center justify-center text-white font-black text-xs shadow-md">
                VS
              </div>
            </div>

            {/* Selector Participant B */}
            <div className="md:col-span-5 space-y-2">
              <label className="text-[10px] uppercase font-mono font-black text-slate-455 dark:text-indigo-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-505" />
                PARTICIPANTE B (DERECHA)
              </label>
              <select
                value={playerBId}
                onChange={(e) => setPlayerBId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-black border border-slate-200 dark:border-[#2b215c] outline-none rounded-xl bg-slate-50 text-slate-800 dark:bg-[#110c29] dark:text-slate-100 focus:ring-1 focus:ring-emerald-300"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === playerAId}>
                    {p.name} {p.isEliminated ? '(Eliminado)' : ''}
                  </option>
                ))}
              </select>

              {pBRow && (
                <div className="flex items-center gap-2 mt-1 text-[10.5px] font-mono text-slate-500 dark:text-slate-400 font-semibold pl-1">
                  <span>Posición: <strong className="text-slate-850 dark:text-white">{pBRow.isEliminated ? 'Eliminado' : `${pBRow.rank}º`}</strong></span>
                  <span>&bull;</span>
                  <span>Puntos: <strong className="text-indigo-950 dark:text-amber-300 font-bold">{pBRow.totalRoundPoints} pts</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* 📊 DYNAMIC COMPARISON SCOREBOARD CARDS */}
          {playerA && playerB && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-summary-h2h">
              {/* Card A: Leader or Status */}
              <div className="bg-white dark:bg-[#130d2d] border border-slate-100 dark:border-[#221a48] rounded-2xl p-4.5 flex flex-col justify-between shadow-3xs">
                <div>
                  <span className="text-[9px] uppercase font-mono font-bold text-slate-400">Ventaja en Ronda</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-850 dark:text-white mt-1 flex items-center gap-1.5">
                    {comparisonStats.ahead === 'A' && (
                      <span className="text-indigo-700 dark:text-indigo-400">{playerA.name} lidera H2H</span>
                    )}
                    {comparisonStats.ahead === 'B' && (
                      <span className="text-emerald-700 dark:text-[#00ff66]">{playerB.name} lidera H2H</span>
                    )}
                    {comparisonStats.ahead === 'Draw' && (
                      <span className="text-amber-600">Empate Absoluto</span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
                    {comparisonStats.ahead !== 'Draw' 
                      ? `${comparisonStats.ahead === 'A' ? playerA.name : playerB.name} supera por un margen relativo neto de ${comparisonStats.diff} puntos en esta ronda.` 
                      : 'Ambos tienen exactamente el mismo acumulado de puntos en los encuentros evaluados de la ronda.'
                    }
                  </p>
                </div>
                <div className="mt-4 border-t border-slate-100 dark:border-[#2b215c]/45 pt-3 flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-slate-400">SCORE ACUMULADO</span>
                  <span className="text-slate-800 dark:text-slate-200 text-sm">
                    <span className="text-indigo-600 dark:text-indigo-400">{comparisonStats.totalScoreA}</span>
                    <span className="text-slate-350 dark:text-slate-600 px-1.5">:</span>
                    <span className="text-emerald-600 dark:text-[#00ff66]">{comparisonStats.totalScoreB}</span>
                  </span>
                </div>
              </div>

              {/* Card B: Individual Match victories breakdown */}
              <div className="bg-white dark:bg-[#130d2d] border border-slate-100 dark:border-[#221a48] rounded-2xl p-4.5 flex flex-col justify-between shadow-3xs">
                <div>
                  <span className="text-[9px] uppercase font-mono font-bold text-slate-400">Duelos Individuales ganados</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-850 dark:text-white mt-1">
                    Breakdown de Cotejos
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
                    La cantidad de veces que un participante superó individualmente al otro en puntaje por partido jugado.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-1 text-center font-mono text-xs">
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 p-1.5 rounded-lg border border-indigo-100/60 dark:border-indigo-900/30">
                    <div className="text-[8px] text-indigo-455 font-bold uppercase truncate">{playerA.name.slice(0, 8)}</div>
                    <div className="font-extrabold text-[#090724] dark:text-white text-sm mt-0.5">{comparisonStats.matchWinsA}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="text-[8.5px] text-slate-400 font-bold uppercase">EMPATES</div>
                    <div className="font-extrabold text-[#090724] dark:text-white text-sm mt-0.5">{comparisonStats.matchDraws}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-1.5 rounded-lg border border-emerald-100/60 dark:border-emerald-900/30">
                    <div className="text-[8px] text-emerald-505 font-bold uppercase truncate">{playerB.name.slice(0, 8)}</div>
                    <div className="font-extrabold text-[#090724] dark:text-white text-sm mt-0.5">{comparisonStats.matchWinsB}</div>
                  </div>
                </div>
              </div>

              {/* Card C: Exact Match score lines */}
              <div className="bg-white dark:bg-[#130d2d] border border-slate-100 dark:border-[#221a48] rounded-2xl p-4.5 flex flex-col justify-between shadow-3xs">
                <div>
                  <span className="text-[9px] uppercase font-mono font-bold text-slate-400">Eficiencia en Marcadores</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-850 dark:text-white mt-1">
                    Ases de Resultados Exactos
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
                    Suma de plenos y aciertos de marcador exacto (+4 puntos) completados durante la fase activa por cada participante.
                  </p>
                </div>
                <div className="mt-4 border-t border-slate-100 dark:border-[#2b215c]/45 pt-3 flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-indigo-650 dark:text-indigo-300">{playerA.name.slice(0, 10)}: <strong className="text-slate-850 dark:text-white">{comparisonStats.exactHitsA}</strong></span>
                  <span className="text-emerald-700 dark:text-[#00ff66]">{playerB.name.slice(0, 10)}: <strong className="text-slate-850 dark:text-white">{comparisonStats.exactHitsB}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* 🏅 ACTIVE H2H STREAK BANNER */}
          {streakInfo && streakInfo.player !== 'none' && streakInfo.count > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300/30 dark:border-amber-900/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fadeIn" id="h2h-streak-indicator">
              <div className="flex items-center gap-3">
                <div className="bg-amber-400 text-amber-950 p-2 rounded-xl text-xs font-black animate-bounce shrink-0">
                  ⚡ RACHA ACTIVA
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-sans font-black text-slate-800 dark:text-white">
                    {streakInfo.player === 'A' ? playerA?.name : playerB?.name}
                  </span>
                  <span className="text-slate-600 dark:text-slate-350 font-medium"> tiene una racha activa de </span>
                  <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400 text-base">{streakInfo.count} {streakInfo.count === 1 ? 'partido ganado' : 'partidos ganados'} consecutivo(s) </span>
                  <span className="text-slate-600 dark:text-slate-350 font-medium">cara a cara sobre </span>
                  <span className="font-sans font-black text-slate-800 dark:text-white">
                    {streakInfo.player === 'A' ? playerB?.name : playerA?.name}
                  </span>.
                </div>
              </div>
            </div>
          )}

          {/* ⚽ MATCH BY MATCH H2H DETAILED FEED */}
          <div className="bg-white dark:bg-[#130d2d] border border-slate-100 dark:border-[#221a48] rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#090724] dark:to-[#120e4f] text-white flex justify-between items-center border-b border-slate-150 dark:border-indigo-950">
              <h3 className="text-xs sm:text-sm font-black font-sans uppercase tracking-tight flex items-center gap-2 text-white">
                <Coins className="w-4 h-4 text-[#00ff66]" />
                Fixture Comparativo Detallado Cara a Cara
              </h3>
              <span className="text-[10px] uppercase font-mono font-extrabold text-slate-400 dark:text-indigo-300">
                {roundMatches.length} Partidos Totales
              </span>
            </div>

            {matchComparisons.length === 0 ? (
              <div className="py-20 text-center font-mono text-xs text-slate-400">
                No hay partidos disponibles para mostrar la tabla comparativa.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-[#252055]">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#1a134d]/30 border-b border-slate-150 dark:border-[#221a48] text-[10px] font-mono text-slate-400 dark:text-indigo-300 font-black uppercase tracking-wider">
                      <th className="py-4 px-6 w-52">Partido / Calendario</th>
                      <th className="py-4 px-4 text-center w-24">Resultado Real</th>
                      <th className="py-4 px-4 text-center font-bold text-slate-700 dark:text-indigo-200">{playerA?.name} (A)</th>
                      <th className="py-4 px-4 text-center font-bold text-slate-700 dark:text-indigo-200">{playerB?.name} (B)</th>
                      <th className="py-4 px-4 text-center w-32 font-bold">Estado Duelo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#221a48] text-xs">
                    {matchComparisons.map(({ match, predA, predB, scoreA, scoreB, exactA, exactB, winner, isPlayed }) => (
                      <tr 
                        key={match.id} 
                        className={`hover:bg-slate-50/50 dark:hover:bg-[#1c153f]/25 transition-all duration-75 ${
                          winner === 'A' ? 'bg-indigo-50/10' : winner === 'B' ? 'bg-emerald-50/10' : ''
                        }`}
                      >
                        <td className="py-3 px-6 font-bold text-slate-800 dark:text-slate-350">
                          <div className="truncate leading-tight max-w-[220px]" title={`${match.local} vs ${match.visitor}`}>
                            {match.local} vs {match.visitor}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono font-medium mt-0.5">{match.date} &bull; {match.time}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-extrabold text-[#090724] dark:text-white">
                          {isPlayed ? (
                            <span className="bg-slate-100 dark:bg-[#110c29] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-black">
                              {match.localGoals} - {match.visitorGoals}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[10px]">Pendiente</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center justify-center font-mono">
                            <span className="font-extrabold text-[#090724] dark:text-white">
                              {predA ? `${predA.localGoals} - ${predA.visitorGoals}` : 'N/C'}
                            </span>
                            {isPlayed && (
                              <span className={`text-[9px] font-black mt-1 px-1.5 py-0.5 rounded ${
                                exactA ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-900'
                              }`}>
                                +{scoreA} pts
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center justify-center font-mono">
                            <span className="font-extrabold text-[#090724] dark:text-white">
                              {predB ? `${predB.localGoals} - ${predB.visitorGoals}` : 'N/C'}
                            </span>
                            {isPlayed && (
                              <span className={`text-[9px] font-black mt-1 px-1.5 py-0.5 rounded ${
                                exactB ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-900'
                              }`}>
                                +{scoreB} pts
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPlayed ? (
                            winner === 'A' ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-950/40 px-2 py-1 rounded-md">
                                &larr; {playerA?.name.slice(0, 8)} +{scoreA - scoreB}
                              </span>
                            ) : winner === 'B' ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-700 dark:text-[#00ff66] bg-emerald-100/60 dark:bg-[#00ff66]/10 px-2 py-1 rounded-md">
                                {playerB?.name.slice(0, 8)} +{scoreB - scoreA} &rarr;
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[9px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md">
                                Dividen Puntos
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono italic">Por jugar</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* RENDER MODE B: MULTI-COMPARE (3-5 PLAYERS CHECKBOX MATRIX CELL MIX) */}
      {compareMode === 'multi' && (
        <div className="space-y-6">
          {/* CHECKBOX PILOT SELECTOR GROUP */}
          <div className="bg-white dark:bg-[#130d2d] border border-slate-100 dark:border-[#221a48] rounded-3xl p-5.5 shadow-sm space-y-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10.5px] uppercase font-mono font-black text-slate-450 dark:text-indigo-300 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-505" />
                CONJUNTO DE PARTICIPANTES COMPARTIDOS (MÍNIMO 3, MÁXIMO 5)
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Marca las casillas de los participantes para contrastar sus tácticas de pronósticos en paralelo.</p>
              
              <div className="flex flex-wrap gap-2 pt-2">
                {players.map(p => {
                  const isChecked = selectedMultiPlayerIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (isChecked) {
                          if (selectedMultiPlayerIds.length > 3) {
                            setSelectedMultiPlayerIds(prev => prev.filter(id => id !== p.id));
                          }
                        } else {
                          if (selectedMultiPlayerIds.length < 5) {
                            setSelectedMultiPlayerIds(prev => [...prev, p.id]);
                          }
                        }
                      }}
                      className={`cursor-pointer px-3.5 py-2.5 text-xs font-black rounded-2xl border flex items-center gap-2.5 transition-all duration-150 ${
                        isChecked
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 dark:bg-[#110c29] dark:border-[#2b215c] text-slate-700 dark:text-indigo-200 hover:bg-slate-100 dark:hover:bg-[#1c153f]'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        readOnly 
                        className="accent-white cursor-pointer" 
                      />
                      <span>{p.name} {p.isEliminated ? '(Eliminado)' : ''}</span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono mt-1.5 pl-0.5">
                Seleccionados: <span className="text-indigo-650 dark:text-amber-400 font-black">{selectedMultiPlayerIds.length}</span> jugadore{selectedMultiPlayerIds.length !== 1 ? 's' : ''} de un máximo de 5 permitidos.
              </div>
            </div>
          </div>

          {/* CROSS TABULATION MATRIX GRID */}
          <div className="bg-white dark:bg-[#130d2d] border border-slate-100 dark:border-[#221a48] rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#090724] dark:to-[#120e4f] text-white flex justify-between items-center border-b border-indigo-950">
              <h3 className="text-xs sm:text-sm font-black font-sans uppercase tracking-tight flex items-center gap-2 text-white">
                <GitCompare className="w-4 h-4 text-amber-400 animate-spin-slow" />
                Matriz de Pronósticos y Puntos Cruzados
              </h3>
              <span className="text-[10px] uppercase font-mono font-extrabold text-indigo-200">
                {selectedMultiPlayerIds.length} Jugadores en matriz
              </span>
            </div>

            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-[#252055]">
              <table className="w-full text-left border-collapse min-w-[850px] font-sans">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-[#1a134d]/30 border-b border-slate-150 dark:border-[#221a48] text-[10px] font-mono text-slate-500 dark:text-indigo-300 font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-48">Partido / Cotejo</th>
                    <th className="py-3.5 px-4 text-center w-24">Resultado Real</th>
                    {selectedMultiPlayerIds.map(id => {
                      const playerObj = players.find(p => p.id === id);
                      return (
                        <th key={id} className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-100 bg-white/5 border-l border-slate-100 dark:border-[#221a48]">
                          {playerObj?.name}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#221a48] text-xs">
                  {sortedMatches.map(match => {
                    const scored = match.localGoals !== null && match.visitorGoals !== null;
                    return (
                      <tr key={match.id} className="hover:bg-slate-50/40 dark:hover:bg-[#110c29]/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-850 dark:text-slate-300">
                          <div className="truncate leading-tight max-w-[200px]" title={`${match.local} vs ${match.visitor}`}>
                            {match.local} vs {match.visitor}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono font-medium mt-0.5">{match.date} &bull; {match.round === 'grupos' ? 'Grp ' + (match.group || '') : 'Elim.'}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-extrabold text-slate-900 dark:text-slate-200">
                          {scored ? (
                            <span className="bg-slate-100 dark:bg-[#110c29] px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 font-black">
                              {match.localGoals} - {match.visitorGoals}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[10px]">Pendiente</span>
                          )}
                        </td>
                        
                        {selectedMultiPlayerIds.map(id => {
                          const playerObj = players.find(p => p.id === id);
                          const pred = playerObj?.predictions[match.id];
                          
                          const { score, isExact } = scored 
                            ? calculatePredictionScore(match, pred) 
                            : { score: 0, isExact: false };

                          let scoreBadge = '';
                          if (scored) {
                            if (isExact) {
                              scoreBadge = 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400';
                            } else if (score > 0) {
                              scoreBadge = 'bg-blue-105 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400';
                            } else {
                              scoreBadge = 'bg-slate-100 text-slate-450 border border-slate-200 dark:bg-slate-900/30 dark:text-slate-500';
                            }
                          } else {
                            scoreBadge = 'bg-slate-50 text-slate-400 dark:bg-[#110c29]/20 font-normal';
                          }

                          return (
                            <td key={id} className="py-3 px-4 text-center border-l border-slate-100 dark:border-[#221a48]">
                              <div className="flex flex-col items-center justify-center gap-1 font-mono">
                                <span className="font-extrabold text-[#090724] dark:text-white">
                                  {pred ? `${pred.localGoals} - ${pred.visitorGoals}` : 'N/C'}
                                </span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${scoreBadge}`}>
                                  {scored ? `+${score} pts` : '-'}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Aggregate Summary Matrix Footer */}
                  <tr className="bg-slate-50/50 dark:bg-[#1a134d]/40 font-mono font-bold text-slate-800 dark:text-indigo-200 border-t-2 border-slate-200 dark:border-[#221a48]">
                    <td className="py-4 px-4 uppercase text-[10px] font-black">
                      Total Puntos Ronda
                    </td>
                    <td className="py-4 px-4 text-center text-slate-400">&mdash;</td>
                    {selectedMultiPlayerIds.map(id => {
                      const playerObj = players.find(p => p.id === id);
                      const playerStanding = standingsByRound[selectedRoundId]?.find(r => r.playerId === id);
                      return (
                        <td key={id} className="py-4 px-4 text-center font-black text-indigo-950 dark:text-white text-sm border-l border-slate-150 dark:border-[#221a48]">
                          <div className="bg-indigo-550/10 dark:bg-emerald-500/10 py-1.5 px-3 rounded-lg border border-indigo-100 dark:border-emerald-950 text-indigo-600 dark:text-emerald-400 inline-block min-w-[70px]">
                            {playerStanding?.totalRoundPoints || 0} pts
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-[#110c29]/20 text-xs text-slate-500 dark:text-indigo-300 font-mono">
              💡 <span className="font-extrabold text-indigo-650 dark:text-amber-400">Guía:</span> Las etiquetas resaltadas en dorado (<span className="text-amber-500 font-black">Gold</span>) corresponden a marcadores exactos (+4 pts). Las etiquetas en azul corresponden a aciertos de tendencia (+2 o +3 pts).
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
