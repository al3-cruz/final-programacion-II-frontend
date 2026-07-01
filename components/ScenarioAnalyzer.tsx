import React, { useState, useMemo } from 'react';
import { Match, Player, PlayerLeaderboardRow, RoundId, RoundInfo } from '../types';
import { calculatePredictionScore, ROUNDS, calculateStandings } from '../utils/rulesEngine';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  HelpCircle, 
  User, 
  ArrowUp, 
  ChevronRight, 
  LineChart, 
  Trophy, 
  AlertCircle,
  Zap,
  Swords,
  Gauge,
  Info,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRightLeft
} from 'lucide-react';

interface ScenarioAnalyzerProps {
  selectedPlayer: Player;
  players: Player[];
  matches: Match[];
  selectedRoundId: RoundId;
  currentStandings: PlayerLeaderboardRow[];
  standingsByRound: Record<RoundId, PlayerLeaderboardRow[]>;
}

export const ScenarioAnalyzer: React.FC<ScenarioAnalyzerProps> = ({
  selectedPlayer,
  players,
  matches,
  selectedRoundId,
  currentStandings,
  standingsByRound
}) => {
  // Find current player standings row
  const playerStandingRow = currentStandings.find(r => r.playerId === selectedPlayer.id);
  const playerRank = playerStandingRow?.rank || 0;
  const currentTotalPoints = playerStandingRow?.totalRoundPoints || 0;

  // 1. TIMELINE CALCULATION: Chronological match-by-match simulation
  // Get all matches belonging to this round that have been played (Goals is NOT null)
  const playedMatchesOfRound = useMemo(() => {
    return matches
      .filter(m => m.round === selectedRoundId && m.localGoals !== null && m.visitorGoals !== null)
      .sort((a, b) => {
        const [d1, m1, y1] = a.date.split('/').map(Number);
        const [d2, m2, y2] = b.date.split('/').map(Number);
        const timeA = new Date(y1, m1 - 1, d1).getTime();
        const timeB = new Date(y2, m2 - 1, d2).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.time.localeCompare(b.time);
      });
  }, [matches, selectedRoundId]);

  const timelineStepsVisible = useMemo(() => {
    const list: { 
      idx: number;
      matchLabel: string; 
      rank: number; 
      points: number; 
      detail: string;
      isExact: boolean;
      matchObj?: Match;
    }[] = [];

    // Step 0: Base state (Beginning of round, before any matches of this round are played)
    const baseStateMatches = matches.map(m => 
      m.round === selectedRoundId ? { ...m, localGoals: null, visitorGoals: null } : m
    );
    const baseStandings = calculateStandings(baseStateMatches, players)[selectedRoundId] || [];
    const baseRow = baseStandings.find(r => r.playerId === selectedPlayer.id);

    if (baseRow) {
      list.push({
        idx: 0,
        matchLabel: 'Inicio',
        rank: baseRow.isEliminated ? 11 : baseRow.rank,
        points: baseRow.totalRoundPoints,
        detail: 'Puntaje de arrastre inicial de la ronda anterior.',
        isExact: false
      });
    }

    // Sequential evaluation
    for (let s = 1; s <= playedMatchesOfRound.length; s++) {
      const activeSubset = playedMatchesOfRound.slice(0, s);
      const lastMatchPlayedInStep = playedMatchesOfRound[s - 1];

      // Build simulated matches
      const mockMatches = matches.map(m => {
        if (m.round === selectedRoundId) {
          const isPlayed = activeSubset.some(pm => pm.id === m.id);
          if (isPlayed) return m;
          return { ...m, localGoals: null, visitorGoals: null };
        }
        return m;
      });

      const standingsAtStep = calculateStandings(mockMatches, players)[selectedRoundId] || [];
      const pRow = standingsAtStep.find(r => r.playerId === selectedPlayer.id);

      if (pRow) {
        const pred = selectedPlayer.predictions[lastMatchPlayedInStep.id];
        const { score, isExact } = calculatePredictionScore(lastMatchPlayedInStep, pred);
        
        let detailDesc = `vs ${lastMatchPlayedInStep.visitor} (${lastMatchPlayedInStep.localGoals}-${lastMatchPlayedInStep.visitorGoals}). `;
        if (pred) {
          detailDesc += `Pronosticó: [${pred.localGoals}-${pred.visitorGoals}]. Sumó +${score} pts.`;
        } else {
          detailDesc += `Sin pronóstico cargado.`;
        }

        list.push({
          idx: s,
          matchLabel: `M${s}`,
          rank: pRow.isEliminated && s < playedMatchesOfRound.length ? 11 : pRow.rank,
          points: pRow.totalRoundPoints,
          detail: detailDesc,
          isExact,
          matchObj: lastMatchPlayedInStep
        });
      }
    }

    return list;
  }, [matches, players, selectedPlayer, selectedRoundId, playedMatchesOfRound]);

  // State to hold clicked timeline point details
  const [selectedPoint, setSelectedPoint] = useState<typeof timelineStepsVisible[0] | null>(() => {
    return timelineStepsVisible.length > 0 ? timelineStepsVisible[timelineStepsVisible.length - 1] : null;
  });

  // State to hold active tab inside the right panel and sub-filters
  const [activeAnalyzerTab, setActiveAnalyzerTab] = useState<'rivals' | 'combinatorial'>('combinatorial');
  const [selectedPathFilter, setSelectedPathFilter] = useState<'salvation' | 'risk' | 'glory'>('salvation');

  // Advanced Stats from Timeline
  const ranksList = timelineStepsVisible.map(t => t.rank);
  const maxRankReached = Math.min(...ranksList, 11); // Min value is highest rank
  const minRankReached = Math.max(...ranksList, 1);  // Max value is lowest rank
  
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (ranksList.length > 2) {
    const last = ranksList[ranksList.length - 1];
    const prev = ranksList[ranksList.length - 2];
    if (last < prev) trendDirection = 'up';
    else if (last > prev) trendDirection = 'down';
  }

  // 2. CONVENIÓMETRO: Scenarios for pending matches
  const pendingMatches = useMemo(() => {
    return matches
      .filter(m => m.round === selectedRoundId && (m.localGoals === null || m.localGoals === undefined))
      .sort((a, b) => {
        const [d1, m1, y1] = a.date.split('/').map(Number);
        const [d2, m2, y2] = b.date.split('/').map(Number);
        const timeA = new Date(y1, m1 - 1, d1).getTime();
        const timeB = new Date(y2, m2 - 1, d2).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.time.localeCompare(b.time);
      });
  }, [matches, selectedRoundId]);

  // 3. COMBINATORIAL SIMULATION: Detailed scenario combinations for relegation and Top 3/1st place
  const criticalSimulation = useMemo(() => {
    if (pendingMatches.length === 0) return null;

    // We take up to 3 pending matches of the active round
    const simMatches = pendingMatches.slice(0, 3);
    const numMatches = simMatches.length;

    // We simulate 3 outcomes for each: Local win (2-1), Draw (1-1), Visitor win (1-2)
    const outcomes = [
      { type: 'local', goalsL: 2, goalsV: 1, label: 'Victoria Local (2-1)', shortLabel: 'L' },
      { type: 'draw', goalsL: 1, goalsV: 1, label: 'Empate (1-1)', shortLabel: 'E' },
      { type: 'visitor', goalsL: 1, goalsV: 2, label: 'Victoria Visitante (1-2)', shortLabel: 'V' }
    ];

    const tempScenarios: any[] = [];

    const recurse = (matchIndex: number, currentSet: any[]) => {
      if (matchIndex === numMatches) {
        tempScenarios.push([...currentSet]);
        return;
      }
      const match = simMatches[matchIndex];
      outcomes.forEach(out => {
        recurse(matchIndex + 1, [
          ...currentSet,
          {
            matchId: match.id,
            local: match.local,
            visitor: match.visitor,
            localGoals: out.goalsL,
            visitorGoals: out.goalsV,
            label: out.label,
            shortLabel: out.shortLabel
          }
        ]);
      });
    };

    recurse(0, []);

    // Standings calculation for each scenario
    const totalActivePlayers = currentStandings.filter(r => !r.isEliminated).length;
    const currentRoundInfo = ROUNDS.find(r => r.id === selectedRoundId);
    const eliminatedCount = currentRoundInfo?.eliminatedCount || 0;
    const safetyThreshold = totalActivePlayers - eliminatedCount; // players <= safetyThreshold are safe, > are relegated

    const scenarioResults = tempScenarios.map((scen, idx) => {
      // Modify only the matches being simulated
      const mockMatches = matches.map(m => {
        const sim = scen.find((s: any) => s.matchId === m.id);
        if (sim) {
          return {
            ...m,
            localGoals: sim.localGoals,
            visitorGoals: sim.visitorGoals
          };
        }
        return m;
      });

      const simStandingsMap = calculateStandings(mockMatches, players);
      const simStandings = simStandingsMap[selectedRoundId] || [];
      const simRow = simStandings.find(r => r.playerId === selectedPlayer.id);

      const rank = simRow?.rank || 11;
      const points = simRow?.totalRoundPoints || 0;

      let category: '1st' | 'top3' | 'survival' | 'relegation' = 'survival';
      if (rank === 1) {
        category = '1st';
      } else if (rank <= 3) {
        category = 'top3';
      } else if (rank > safetyThreshold) {
        category = 'relegation';
      }

      return {
        id: `scen-${idx}`,
        outcomes: scen,
        rank,
        points,
        category
      };
    });

    const totalCount = scenarioResults.length;
    const firstCountReal = scenarioResults.filter(r => r.category === '1st').length;
    const top3CountReal = scenarioResults.filter(r => r.category === '1st' || r.category === 'top3').length;
    const relegationCountReal = scenarioResults.filter(r => r.category === 'relegation').length;
    const survivalCountReal = totalCount - relegationCountReal;

    return {
      simMatches,
      totalCount,
      firstCount: firstCountReal,
      top3Count: top3CountReal,
      relegationCount: relegationCountReal,
      survivalCount: survivalCountReal,
      firstPercent: Math.round((firstCountReal / totalCount) * 100),
      top3Percent: Math.round((top3CountReal / totalCount) * 100),
      survivalPercent: Math.round((survivalCountReal / totalCount) * 100),
      relegationPercent: Math.round((relegationCountReal / totalCount) * 100),
      scenarios: scenarioResults,
      safetyThreshold,
      eliminatedCount,
      totalActivePlayers
    };
  }, [pendingMatches, matches, players, selectedPlayer, currentStandings, selectedRoundId]);

  // Dynamic selector of top 3 rivals of audit player
  const top3Rivals = useMemo(() => {
    const playerIndex = currentStandings.findIndex(r => r.playerId === selectedPlayer.id);
    const list: PlayerLeaderboardRow[] = [];

    // 1. Leader (Rank 1)
    const leader = currentStandings.find(r => r.rank === 1);
    if (leader && leader.playerId !== selectedPlayer.id) {
      list.push(leader);
    }

    // 2. Immediately above
    if (playerIndex > 0) {
      const above = currentStandings[playerIndex - 1];
      if (!list.some(l => l.playerId === above.playerId)) {
        list.push(above);
      }
    }

    // 3. Immediately below
    if (playerIndex < currentStandings.length - 1) {
      const below = currentStandings[playerIndex + 1];
      if (!list.some(l => l.playerId === below.playerId)) {
        list.push(below);
      }
    }

    // 4. Fallback fill to always render 3 (e.g. if we are leader, fill 2nd, 3rd, 4th)
    if (list.length < 3) {
      currentStandings.forEach(row => {
        if (row.playerId !== selectedPlayer.id && list.length < 3 && !list.some(l => l.playerId === row.playerId)) {
          list.push(row);
        }
      });
    }

    return list.slice(0, 3).sort((a, b) => a.rank - b.rank);
  }, [currentStandings, selectedPlayer]);

  // First upcoming match calculations for the rivalry list
  const incomingMatch = pendingMatches[0];

  const optimalScenariosForRivals = useMemo(() => {
    if (!incomingMatch) return {};

    const standardOutcomes = [
      { l: 1, v: 0 }, { l: 2, v: 1 }, { l: 0, v: 0 }, { l: 1, v: 1 },
      { l: 0, v: 1 }, { l: 1, v: 2 }, { l: 3, v: 0 }, { l: 0, v: 3 }
    ];

    const userPred = selectedPlayer.predictions[incomingMatch.id];
    if (userPred) {
      standardOutcomes.push({ l: userPred.localGoals, v: userPred.visitorGoals });
    }

    const results: Record<string, { marker: string; userPts: number; rivalPts: number; delta: number }> = {};

    top3Rivals.forEach(rival => {
      const rivalPlayer = players.find(p => p.id === rival.playerId);
      const rivalPred = rivalPlayer?.predictions[incomingMatch.id];
      if (rivalPred) {
        standardOutcomes.push({ l: rivalPred.localGoals, v: rivalPred.visitorGoals });
      }

      let bestDelta = -999;
      let optimalScore = '0-0';
      let bestUserPts = 0;
      let bestRivalPts = 0;

      standardOutcomes.forEach(o => {
        const testMatch = { ...incomingMatch, localGoals: o.l, visitorGoals: o.v };
        const { score: uScore } = calculatePredictionScore(testMatch, userPred);
        const { score: rScore } = calculatePredictionScore(testMatch, rivalPred);
        const pointsDifference = uScore - rScore;

        if (pointsDifference > bestDelta) {
          bestDelta = pointsDifference;
          optimalScore = `${o.l}-${o.v}`;
          bestUserPts = uScore;
          bestRivalPts = rScore;
        }
      });

      results[rival.playerId] = {
        marker: optimalScore,
        userPts: bestUserPts,
        rivalPts: bestRivalPts,
        delta: bestDelta
      };
    });

    return results;
  }, [incomingMatch, top3Rivals, selectedPlayer, players]);

  // Game Theory Scenario calculations down the line (for up to 3 upcoming matches)
  const next3Pending = pendingMatches.slice(0, 3);
  
  const gameTheoryScenarios = useMemo(() => {
    return next3Pending.map(match => {
      const userPred = selectedPlayer.predictions[match.id];
      
      // Direct above and below rival objects
      const playerIndex = currentStandings.findIndex(r => r.playerId === selectedPlayer.id);
      const rAboveRow = playerIndex > 0 ? currentStandings[playerIndex - 1] : null;
      const rBelowRow = playerIndex < currentStandings.length - 1 ? currentStandings[playerIndex + 1] : null;
      
      const rAbove = rAboveRow ? players.find(p => p.id === rAboveRow.playerId) : null;
      const rBelow = rBelowRow ? players.find(p => p.id === rBelowRow.playerId) : null;

      const rivalPred = rAbove ? rAbove.predictions[match.id] : null;
      const rivalBelowPred = rBelow ? rBelow.predictions[match.id] : null;

      const scenariosToTest = [
        { localGoals: 1, visitorGoals: 0, label: 'Victoria local (1-0)' },
        { localGoals: 2, visitorGoals: 1, label: 'Victoria local (2-1)' },
        { localGoals: 0, visitorGoals: 0, label: 'Empate sin goles (0-0)' },
        { localGoals: 1, visitorGoals: 1, label: 'Empate con goles (1-1)' },
        { localGoals: 0, visitorGoals: 1, label: 'Victoria visitante (0-1)' },
        { localGoals: 1, visitorGoals: 2, label: 'Victoria visitante (1-2)' },
        { localGoals: 3, visitorGoals: 0, label: 'Goleada local (3-0)' },
        { localGoals: 0, visitorGoals: 3, label: 'Goleada visitante (0-3)' },
      ];

      if (userPred) {
        scenariosToTest.push({ 
          localGoals: userPred.localGoals, 
          visitorGoals: userPred.visitorGoals, 
          label: `Tu marcador exacto (${userPred.localGoals}-${userPred.visitorGoals})` 
        });
      }
      if (rivalPred) {
        scenariosToTest.push({ 
          localGoals: rivalPred.localGoals, 
          visitorGoals: rivalPred.visitorGoals, 
          label: `Marcador de ${rAbove?.name} (${rivalPred.localGoals}-${rivalPred.visitorGoals})` 
        });
      }
      if (rivalBelowPred) {
        scenariosToTest.push({ 
          localGoals: rivalBelowPred.localGoals, 
          visitorGoals: rivalBelowPred.visitorGoals, 
          label: `Marcador de ${rBelow?.name} (${rivalBelowPred.localGoals}-${rivalBelowPred.visitorGoals})` 
        });
      }

      const uniqueScenarios: { localGoals: number; visitorGoals: number; label: string }[] = [];
      const seen = new Set<string>();
      scenariosToTest.forEach(s => {
        const key = `${s.localGoals}-${s.visitorGoals}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueScenarios.push(s);
        }
      });

      interface EvaluatedScenario {
        localGoals: number;
        visitorGoals: number;
        label: string;
        userPts: number;
        rivalPts: number;
        margin: number;
      }

      let bestAbove: EvaluatedScenario | null = null;
      let worstAbove: EvaluatedScenario | null = null;

      uniqueScenarios.forEach(scn => {
        const dummyMatch = { ...match, localGoals: scn.localGoals, visitorGoals: scn.visitorGoals };
        const { score: uScore } = calculatePredictionScore(dummyMatch, userPred);
        const { score: rScore } = rAbove ? calculatePredictionScore(dummyMatch, rivalPred) : { score: 0 };
        const gap = uScore - rScore;

        const evalScen: EvaluatedScenario = {
          localGoals: scn.localGoals,
          visitorGoals: scn.visitorGoals,
          label: scn.label,
          userPts: uScore,
          rivalPts: rScore,
          margin: gap
        };

        if (!bestAbove || gap > bestAbove.margin) {
          bestAbove = evalScen;
        }
        if (!worstAbove || gap < worstAbove.margin) {
          worstAbove = evalScen;
        }
      });

      let bestBelow: EvaluatedScenario | null = null;
      let worstBelow: EvaluatedScenario | null = null;

      uniqueScenarios.forEach(scn => {
        const dummyMatch = { ...match, localGoals: scn.localGoals, visitorGoals: scn.visitorGoals };
        const { score: uScore } = calculatePredictionScore(dummyMatch, userPred);
        const { score: rScore } = rBelow ? calculatePredictionScore(dummyMatch, rivalBelowPred) : { score: 0 };
        const gap = uScore - rScore;

        const evalScen: EvaluatedScenario = {
          localGoals: scn.localGoals,
          visitorGoals: scn.visitorGoals,
          label: scn.label,
          userPts: uScore,
          rivalPts: rScore,
          margin: gap
        };

        if (!bestBelow || gap > bestBelow.margin) {
          bestBelow = evalScen;
        }
        if (!worstBelow || gap < worstBelow.margin) {
          worstBelow = evalScen;
        }
      });

      // Defensive / Anti-Riesgo Safety Scenario: minimize rScore - uScore (penalty) while securing points:
      let safetyScenario: { localGoals: number; visitorGoals: number; label: string; userPts: number; rivalPts: number; penalty: number } | null = null;
      let minPenalty = 999;
      uniqueScenarios.forEach(scn => {
        const dummyMatch = { ...match, localGoals: scn.localGoals, visitorGoals: scn.visitorGoals };
        const { score: uScore } = calculatePredictionScore(dummyMatch, userPred);
        const { score: rScore } = rBelow ? calculatePredictionScore(dummyMatch, rivalBelowPred) : { score: 0 };
        const penalty = rScore - uScore;

        if (uScore >= 2 && penalty < minPenalty) {
          minPenalty = penalty;
          safetyScenario = {
            localGoals: scn.localGoals,
            visitorGoals: scn.visitorGoals,
            label: scn.label,
            userPts: uScore,
            rivalPts: rScore,
            penalty
          };
        }
      });

      return {
        match,
        userPred,
        rivalPred,
        rivalBelowPred,
        rivalAboveName: rAbove?.name || '',
        rivalBelowName: rBelow?.name || '',
        bestAbove,
        worstAbove,
        bestBelow,
        worstBelow,
        safetyScenario
      };
    });
  }, [next3Pending, selectedPlayer, players, currentStandings]);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4" id="scenario-analyzer-timeline-section">
      
      {/* LEFT: POSITIONAL TIMELINE PANEL (7 Cols) */}
      <div className="lg:col-span-7 bg-white dark:bg-[#130d2d] rounded-3xl border border-slate-100 dark:border-[#221a48] p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-indigo-600 dark:text-amber-400" />
              Evolución de Puesto Partido tras Partido
            </h3>
            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-amber-400/10 dark:text-amber-400 px-2.5 py-1 rounded-full uppercase border border-indigo-100 dark:border-amber-400/20">
              {selectedPlayer.name}
            </span>
          </div>
          
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 leading-relaxed">
            Gráfico histórico de rendimiento. Muestra cómo asciende o desciende la posición de <strong>{selectedPlayer.name}</strong> tras resolverse cada partido de esta ronda. 
            <span className="text-indigo-600 dark:text-amber-300 font-bold ml-1">Haz clic en cualquier punto físico del gráfico</span> para decodificar los puntajes exactos de ese encuentro.
          </p>

          {playedMatchesOfRound.length === 0 ? (
            <div className="py-24 px-4 border-2 border-dashed border-slate-100 dark:border-[#2b215c]/45 rounded-2xl bg-slate-50/40 dark:bg-[#110c29]/20 text-center text-slate-400 text-xs font-mono">
              El análisis de evolución temporal se activará cuando comience un partido de esta fase, o tan pronto simules un marcador en la sección inferior de Fixture.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Responsive SVG Step Chart - BIGGER DESIGN */}
              <div className="bg-[#090724] text-slate-100 p-5 rounded-2xl relative overflow-hidden shadow-sm border border-indigo-950">
                <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
                  <Sparkles className="w-24 h-24 text-indigo-400" />
                </div>
                
                {/* Chart Container: Raised from h-44 to h-80 */}
                <div className="w-full h-80 mt-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 240">
                    {/* Horizontal grid lines for ranks 1, 3, 5, 8, 11 */}
                    {[1, 3, 5, 7, 9, 11].map(r => {
                      const yVal = 20 + ((r - 1) / 10) * 200;
                      return (
                        <g key={r} className="opacity-20 font-sans">
                          <line x1="40" y1={yVal} x2="490" y2={yVal} stroke="#ffffff" strokeWidth="1" strokeDasharray="4 4" />
                          <text x="12" y={yVal + 3} fill="#ffffff" className="text-[9.5px] font-black font-mono">{r}º</text>
                        </g>
                      );
                    })}

                    {/* Plot coordinates */}
                    {(() => {
                      const pointsCount = timelineStepsVisible.length;
                      const xStep = Math.max(10, 430 / (pointsCount - 1 || 1));
                      const pointCoords = timelineStepsVisible.map((step, idx) => {
                        const x = 50 + idx * xStep;
                        const y = 20 + ((step.rank - 1) / 10) * 200;
                        return { x, y, ...step };
                      });

                      let pathStr = '';
                      pointCoords.forEach((pt, idx) => {
                        if (idx === 0) {
                          pathStr += `M ${pt.x} ${pt.y}`;
                        } else {
                          pathStr += ` L ${pt.x} ${pt.y}`;
                        }
                      });

                      return (
                        <>
                          <path 
                            d={pathStr} 
                            fill="none" 
                            stroke="#00ff66" 
                            strokeWidth="3.5" 
                            className="drop-shadow-[0_2px_8px_rgba(0,255,102,0.4)] transition-all" 
                          />
                          
                          {pointCoords.map((pt, idx) => {
                            const isLast = idx === pointCoords.length - 1;
                            const isSelectedPoint = selectedPoint?.idx === pt.idx;
                            const fillDotColor = pt.isExact ? '#ffbf00' : '#3b82f6';
                            return (
                              <g 
                                key={idx} 
                                className="group cursor-pointer"
                                onClick={() => setSelectedPoint(pt)}
                              >
                                {/* Glow hover effect */}
                                <circle 
                                  cx={pt.x} 
                                  cy={pt.y} 
                                  r={isSelectedPoint ? '14' : '10'} 
                                  fill={isSelectedPoint ? 'rgba(0,255,102,0.2)' : 'transparent'} 
                                  className="transition-all duration-150 group-hover:fill-white/10"
                                />

                                <circle 
                                  cx={pt.x} 
                                  cy={pt.y} 
                                  r={isLast ? '7.5' : '6'} 
                                  fill={isLast ? '#00ff66' : fillDotColor} 
                                  stroke={isSelectedPoint ? '#00ff66' : 'rgba(255,255,255,0.7)'} 
                                  strokeWidth={isSelectedPoint ? '3' : '1.5'}
                                  className="transition-all"
                                />

                                <circle 
                                  cx={pt.x} 
                                  cy={pt.y} 
                                  r="20" 
                                  fill="transparent" 
                                />

                                {isLast && !isSelectedPoint && (
                                  <g>
                                    <rect x={pt.x - 22} y={pt.y - 25} width="44" height="15" rx="4" fill="#00ff66" />
                                    <text x={pt.x} y={pt.y - 14} fill="#090724" className="text-[9px] font-black text-center font-mono" textAnchor="middle">
                                      AHORA
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* X-Axis Legends */}
                <div className="flex justify-between pl-11 pr-2 mt-2 text-[9px] font-mono text-slate-400 border-t border-white/10 pt-3">
                  {timelineStepsVisible.map((step, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedPoint(step)}
                      className={`text-center font-black uppercase tracking-wider cursor-pointer hover:text-[#00ff66] transition-colors py-1 px-1.5 rounded ${selectedPoint?.idx === step.idx ? 'text-[#00ff66] bg-white/10' : ''}`} 
                      title={step.detail}
                    >
                      {step.matchLabel}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic highlights indicators */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-[#110c29]/50 border border-slate-100 dark:border-[#221a48] p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase font-mono tracking-wider">Pico de Ranking</div>
                    <div className="text-xs sm:text-sm font-black text-emerald-800 dark:text-[#00ff66] mt-1">{maxRankReached}º Lugar</div>
                  </div>
                  <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="bg-slate-50 dark:bg-[#110c29]/50 border border-slate-100 dark:border-[#221a48] p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase font-mono tracking-wider">Suelo de Ranking</div>
                    <div className="text-xs sm:text-sm font-black text-rose-800 dark:text-rose-400 mt-1">{minRankReached}º Lugar</div>
                  </div>
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                </div>

                <div className="bg-slate-50 dark:bg-[#110c29]/50 border border-slate-100 dark:border-[#221a48] p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase font-mono tracking-wider">Tendencia</div>
                    <div className={`text-xs sm:text-sm font-black mt-1 ${trendDirection === 'up' ? 'text-emerald-700 dark:text-[#00ff66]' : trendDirection === 'down' ? 'text-rose-700' : 'text-slate-700 dark:text-indigo-300'}`}>
                      {trendDirection === 'up' ? 'Al Alza 📈' : trendDirection === 'down' ? 'A la baja 📉' : 'Estable ➖'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Point Detail Card */}
              {selectedPoint && (
                <div className="bg-slate-50 dark:bg-[#1c153f]/30 p-4 rounded-2xl border border-slate-150 dark:border-[#221a48] space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-[#2b215c]/45 pb-1.5">
                    <span className="text-xs font-black uppercase text-indigo-700 dark:text-amber-400 font-mono flex items-center gap-1">
                      <Info className="w-4 h-4" /> Detalle del Hito Histórico ({selectedPoint.matchLabel})
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                      Puntos: {selectedPoint.points} pts | Puesto: {selectedPoint.rank}º
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans mt-1">
                    {selectedPoint.detail}
                  </p>
                  {selectedPoint.matchObj && (
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-3">
                      <span>Cotejo jugado el: <strong className="text-slate-600 dark:text-slate-200">{selectedPoint.matchObj.date} {selectedPoint.matchObj.time}</strong></span>
                      <span>Partido ID: <strong className="text-slate-600 dark:text-slate-200">{selectedPoint.matchObj.id}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-slate-50 dark:bg-[#110c29]/30 border border-slate-150 dark:border-[#221a48]/40 p-4 rounded-2xl text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-mono">
          <span className="font-extrabold text-indigo-750 dark:text-amber-300">Leyenda:</span> Los puntos <span className="text-[#ffbf00] font-black">Amarillos</span> simbolizan marcadores exactos (+4 puntos), mientras que los <span className="text-blue-600 font-black">Azules</span> corresponden a aciertos de ganador/empate (+2 o +3 puntos).
        </div>
      </div>

      {/* RIGHT: EXPECTED SCENARIOS & GAME THEORY ADVANCED ADVISORY PANEL (5 Cols) */}
      <div className="lg:col-span-12 xl:col-span-5 bg-gradient-to-b from-[#0e0c38] to-[#040316] text-white rounded-3xl border border-indigo-950 p-6 shadow-xl flex flex-col justify-between">
        <div className="space-y-5">
          
          <div className="flex items-center gap-2 text-[#00ff66]">
            <Sparkles className="w-5 h-5 text-[#00ff66] animate-pulse" />
            <h3 className="text-sm sm:text-base font-black font-sans tracking-tight uppercase">
              Simulador de Escenarios Inteligente
            </h3>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <div className="bg-indigo-500/15 p-2 rounded-xl text-[#00ff66] shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-indigo-300 font-mono font-bold uppercase tracking-wider">Auditando a:</div>
              <div className="text-sm font-black text-white">{selectedPlayer.name} &bull; Puesto {playerRank}º</div>
            </div>
          </div>

          {/* Navigation Tab Selector inside Scenario Analyzer panel */}
          <div className="flex border border-white/10 p-0.5 bg-[#030211] rounded-xl">
            <button
              onClick={() => setActiveAnalyzerTab('combinatorial')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg font-mono transition-all cursor-pointer ${
                activeAnalyzerTab === 'combinatorial'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              🔥 Descenso y Liderato
            </button>
            <button
              onClick={() => setActiveAnalyzerTab('rivals')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg font-mono transition-all cursor-pointer ${
                activeAnalyzerTab === 'rivals'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              ⚡ Rivales & Estrategia
            </button>
          </div>

          {activeAnalyzerTab === 'rivals' ? (
            <div className="space-y-5">
              {/* MATRIZ DE IMPACTO: TOP 3 RIVALS COMPARISON GRID */}
              <div className="space-y-2.5">
                <div className="text-[10px] font-mono text-[#00ff66] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                  Matriz de Impacto (Tus 3 Rivales Claves)
                </div>

                {incomingMatch ? (
                  <div className="overflow-hidden border border-white/10 bg-white/[0.02] rounded-xl text-left">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="bg-white/5 text-[9px] text-indigo-300 border-b border-white/10 uppercase tracking-wider">
                          <th className="py-2 px-3">Rival</th>
                          <th className="py-2 px-1">Fecha Pred</th>
                          <th className="py-2 px-2 text-center text-[#00ff66]">Pred Óptimo</th>
                          <th className="py-2 px-3 text-right">Ventaja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {top3Rivals.map((rival) => {
                          const rivalPlayer = players.find(p => p.id === rival.playerId);
                          const rivalPred = rivalPlayer?.predictions[incomingMatch.id];
                          const opt = optimalScenariosForRivals[rival.playerId];

                          return (
                            <tr key={rival.playerId} className="hover:bg-white/5 transition-colors">
                              <td className="py-2 px-3 text-slate-100 font-bold truncate max-w-[120px]">
                                {rival.playerName} ({rival.rank}º)
                              </td>
                              <td className="py-2 px-1 text-indigo-300 text-[11px]">
                                {rivalPred ? `${rivalPred.localGoals}-${rivalPred.visitorGoals}` : 'Sin cargo'}
                              </td>
                              <td className="py-2 px-2 text-[#00ff66] text-center font-black">
                                {opt ? opt.marker : '-'}
                              </td>
                              <td className="py-2 px-3 text-right text-white font-extrabold">
                                {opt && opt.delta > 0 ? `+${opt.delta}` : opt ? opt.delta : 0} pts
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 rounded-xl text-center text-[10px] text-zinc-400 italic">
                    Sin partidos pendientes para proyectar matriz.
                  </div>
                )}
              </div>

              {pendingMatches.length === 0 ? (
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-center text-xs text-zinc-400 font-mono leading-relaxed">
                  No existen cotejos pendientes en esta etapa del torneo nacional o mundial. Todas las predicciones han concluido.
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* GAME THEORY CARDS BY MATCH */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2">
                      <Swords className="w-4 h-4 text-emerald-400" />
                      Próximos {Math.min(3, pendingMatches.length)} Partidos Claves
                    </div>

                    {gameTheoryScenarios.map(({ match, userPred, rivalPred, rivalBelowPred, rivalAboveName, rivalBelowName, bestAbove, worstAbove, bestBelow, worstBelow, safetyScenario }, index) => {
                      const hasSameTendencyWithAbove = userPred && rivalPred && 
                        Math.sign(userPred.localGoals - userPred.visitorGoals) === Math.sign(rivalPred.localGoals - rivalPred.visitorGoals);
                      
                      return (
                        <div key={match.id} className="p-4.5 bg-white/5 border border-white/10 rounded-2xl space-y-3.5 relative overflow-hidden">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="text-xs font-black text-white">
                              #{index + 1}. {match.local} vs {match.visitor}
                            </div>
                            <span className="text-[9.5px] font-mono text-yellow-300 font-bold tracking-tight">
                              {match.date}
                            </span>
                          </div>

                          {/* Predictions grid */}
                          <div className="grid grid-cols-2 gap-3 text-[10.5px] font-mono">
                            <div className="bg-[#030211] p-2 rounded-lg border border-white/5">
                              <span className="text-[8.5px] text-slate-450 block">Tu Predicción</span>
                              <span className="font-black text-white">
                                {userPred ? `${userPred.localGoals} - ${userPred.visitorGoals}` : 'N/C'}
                              </span>
                            </div>
                            {rivalAboveName ? (
                              <div className="bg-[#030211] p-2 rounded-lg border border-white/5">
                                <span className="text-[8.5px] text-cyan-400 block max-w-[120px] truncate">Perseguido: {rivalAboveName}</span>
                                <span className="font-black text-emerald-400">
                                  {rivalPred ? `${rivalPred.localGoals} - ${rivalPred.visitorGoals}` : 'N/C'}
                                </span>
                              </div>
                            ) : (
                              <div className="bg-[#030211] p-2 rounded-lg border border-white/5">
                                <span className="text-[8.5px] text-zinc-400 block">Perseguido</span>
                                <span className="text-zinc-500">Líder Absoluto</span>
                              </div>
                            )}
                          </div>

                          {/* Game theory recommendation block */}
                          {userPred && (bestAbove || bestBelow) ? (
                            <div className="text-[11px] leading-relaxed space-y-2">
                              
                              {/* How to beat the rival above */}
                              {rivalAboveName && bestAbove && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                                  <span className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-emerald-400 block mb-1">
                                    RUTA DE ASCENSO MÁXIMO
                                  </span>
                                  Si el partido culmina <strong className="text-white">{(bestAbove as any).localGoals}-{(bestAbove as any).visitorGoals}</strong> ({(bestAbove as any).label}):
                                  <div className="mt-1 text-emerald-300">
                                    Tú sumas <span className="font-black">{(bestAbove as any).userPts} pts</span> vs {(bestAbove as any).rivalPts} pts de {rivalAboveName}. 
                                    ¡Ganarás <strong className="font-black text-white">+{(bestAbove as any).margin} pts de ventaja relativa!</strong>
                                  </div>
                                </div>
                              )}

                              {/* Safeguard from rival below (ESCAPE DEL PERSEGUIDOR) */}
                              {rivalBelowName && bestBelow && (
                                <div className="bg-indigo-500/10 border border-white/10 p-3 rounded-xl space-y-1">
                                  <span className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-indigo-400 block">
                                    ESCAPE DEL PERSEGUIDOR ({rivalBelowName})
                                  </span>
                                  El marcador óptimo para mantener a distancia a {rivalBelowName} es <strong className="text-indigo-200">{(bestBelow as any).localGoals}-{(bestBelow as any).visitorGoals}</strong> (ventaja neta de +{(bestBelow as any).margin} pts).
                                </div>
                              )}

                              {/* Anti-Riesgo / Seguridad Lock strategy */}
                              {rivalBelowName && safetyScenario && (
                                <div className="bg-amber-400/5 border border-amber-450/15 p-3 rounded-xl space-y-1">
                                  <span className="text-[9px] font-mono uppercase tracking-wider font-black text-amber-300 block flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-amber-300" /> ESTRATEGIA DE BLOQUEO ANTI-RIESGO
                                  </span>
                                  <div className="text-slate-300 text-[10.5px]">
                                    El marcador conservador mínimo de seguridad es <strong className="text-white">{(safetyScenario as any).localGoals}-{(safetyScenario as any).visitorGoals}</strong> ({(safetyScenario as any).label}).
                                  </div>
                                  <div className="text-[10px] text-amber-200">
                                    Asegura que sumas <span className="font-medium text-white">{(safetyScenario as any).userPts} pts</span>, garantizando que {rivalBelowName} como máximo pueda recortarte <span className="font-bold text-white">{(safetyScenario as any).penalty > 0 ? (safetyScenario as any).penalty : 0} pts</span>.
                                  </div>
                                </div>
                              )}

                              {/* Synergy status (warning for identical outcomes) */}
                              {rivalAboveName && hasSameTendencyWithAbove && (
                                <div className="bg-indigo-950/20 border border-white/5 p-3 rounded-xl text-[10px] text-amber-300 flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="font-extrabold">Coincidencia de Tendencia:</strong> Ambos apostaron por el mismo ganador. El partido arroja poca rentabilidad para recortar distancias a menos que aciertes el marcador exacto de manera solitaria.
                                  </div>
                                </div>
                              )}

                            </div>
                          ) : (
                            <div className="text-[10.5px] text-zinc-400 bg-white/5 p-2.5 rounded-lg leading-normal italic text-center">
                              Pronósticos no disponibles para calcular la teoría de juegos del partido.
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 animate-fadeIn">
              {/* COMBINATORIAL SIMULATION TAB PANEL */}
              <div className="space-y-4">
                <div className="text-[11px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
                  Análisis Matemático Multivariable
                </div>

                {criticalSimulation ? (
                  <div className="space-y-4">
                    {/* Probabilities overview bar list */}
                    <div className="grid grid-cols-2 gap-2.5 font-mono">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[9px] text-amber-400 font-bold block uppercase">1º Lugar (Gloria)</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-black text-white">{criticalSimulation.firstPercent}%</span>
                          <span className="text-[9.5px] text-slate-400">({criticalSimulation.firstCount}/{criticalSimulation.totalCount})</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-amber-400 h-full rounded-full" style={{ width: `${criticalSimulation.firstPercent}%` }} />
                        </div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[9px] text-emerald-400 font-bold block uppercase">Top 3 (Podio)</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-black text-white">{criticalSimulation.top3Percent}%</span>
                          <span className="text-[9.5px] text-slate-400">({criticalSimulation.top3Count}/{criticalSimulation.totalCount})</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${criticalSimulation.top3Percent}%` }} />
                        </div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[9px] text-blue-400 font-bold block uppercase">Supervivencia</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-black text-white">{criticalSimulation.survivalPercent}%</span>
                          <span className="text-[9.5px] text-slate-400">({criticalSimulation.survivalCount}/{criticalSimulation.totalCount})</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-blue-400 h-full rounded-full" style={{ width: `${criticalSimulation.survivalPercent}%` }} />
                        </div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className={`text-[9px] font-bold block uppercase ${criticalSimulation.relegationPercent > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          Descenso / Eliminar
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-lg font-black ${criticalSimulation.relegationPercent > 0 ? 'text-rose-400' : 'text-slate-300'}`}>{criticalSimulation.relegationPercent}%</span>
                          <span className="text-[9.5px] text-slate-400">({criticalSimulation.relegationCount}/{criticalSimulation.totalCount})</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className={`h-full rounded-full ${criticalSimulation.relegationPercent > 0 ? 'bg-rose-500' : 'bg-slate-500'}`} style={{ width: `${criticalSimulation.relegationPercent}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Alert Banners */}
                    {criticalSimulation.relegationCount > 0 ? (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2.5 text-xs">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-rose-300 block font-extrabold uppercase text-[10px] tracking-wider">¡ALERTA DE RIESGO DE ELIMINACIÓN!</strong>
                          Hay <strong className="text-white font-black">{criticalSimulation.relegationCount} combinaciones ({criticalSimulation.relegationPercent}%)</strong> que te descienden al fondo de la tabla (puestos {criticalSimulation.safetyThreshold + 1}º a {criticalSimulation.totalActivePlayers}º), causando tu eliminación.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/25 rounded-xl flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-300 block font-extrabold uppercase text-[10px] tracking-wider">¡SALVACIÓN MATEMÁTICA ASEGURADA!</strong>
                          ¡Excelente! No hay combinaciones que te hagan descender en los partidos simulados. Tu permanencia en el torneo está garantizada.
                        </div>
                      </div>
                    )}

                    {/* Sub-Filters */}
                    <div className="flex border-b border-white/5 pb-2 gap-1 overflow-x-auto select-none">
                      <button
                        onClick={() => setSelectedPathFilter('salvation')}
                        className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          selectedPathFilter === 'salvation'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/5 text-slate-350 hover:bg-white/10'
                        }`}
                      >
                        🛡️ Rutas de Salvación ({criticalSimulation.survivalCount})
                      </button>
                      <button
                        onClick={() => setSelectedPathFilter('risk')}
                        className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          selectedPathFilter === 'risk'
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/5 text-slate-355 hover:bg-white/10'
                        }`}
                      >
                        ⚠️ Rutas de Riesgo ({criticalSimulation.relegationCount})
                      </button>
                      <button
                        onClick={() => setSelectedPathFilter('glory')}
                        className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          selectedPathFilter === 'glory'
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-white/5 text-slate-355 hover:bg-white/10'
                        }`}
                      >
                        ⭐ Rutas del Podio ({criticalSimulation.top3Count})
                      </button>
                    </div>

                    {/* Scenarios lists */}
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {(() => {
                        const filtered = criticalSimulation.scenarios.filter(scen => {
                          if (selectedPathFilter === 'salvation') return scen.category !== 'relegation';
                          if (selectedPathFilter === 'risk') return scen.category === 'relegation';
                          if (selectedPathFilter === 'glory') return scen.category === '1st' || scen.category === 'top3';
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-10 text-xs font-mono text-zinc-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                              No hay escenarios posibles en este filtro.
                            </div>
                          );
                        }

                        const sorted = [...filtered].sort((a, b) => a.rank - b.rank);

                        return sorted.map((scen, sIdx) => {
                          const is1st = scen.rank === 1;
                          const isTop3 = scen.rank <= 3;
                          const isRelegated = scen.category === 'relegation';

                          const badgeColor = 
                            is1st ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                            isTop3 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                            isRelegated ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse' :
                            'bg-blue-500/15 text-blue-300 border-blue-500/30';

                          const badgeText = 
                            is1st ? 'Líder 1º' :
                            isTop3 ? `Puesto ${scen.rank}º (Top 3)` :
                            isRelegated ? `Puesto ${scen.rank}º (Descenso)` :
                            `Puesto ${scen.rank}º (Salvado)`;

                          return (
                            <div key={scen.id} className="p-3.5 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all space-y-2 text-left">
                              <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/5 pb-1.5">
                                <span className="text-slate-400 font-bold uppercase">Escenario #{sIdx + 1}</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                  {badgeText}
                                </span>
                              </div>
                              <div className="space-y-1.5 font-mono text-[10px]">
                                {scen.outcomes.map((out: any, mIdx: number) => (
                                  <div key={mIdx} className="flex justify-between items-center bg-black/40 px-2 py-1.5 rounded">
                                    <span className="text-zinc-300 font-medium truncate max-w-[150px]">{out.local} vs {out.visitor}</span>
                                    <span className="text-emerald-400 font-bold shrink-0">{out.localGoals} - {out.visitorGoals} ({out.shortLabel})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    <div className="text-[10px] text-zinc-400 font-mono text-left leading-normal">
                      * Este análisis comparativo asume que los marcadores indicados son el resultado final real, recalculando tu puntaje acumulado frente al resto de competidores.
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-white/5 rounded-2xl text-center text-xs text-zinc-500 italic">
                    No hay partidos pendientes en esta ronda para simular escenarios.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Algorithmic Support Notice footer */}
        <div className="mt-8 border-t border-white/10 pt-4 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#00ff66]" />
          <span className="text-[9.5px] font-mono text-zinc-400">
            Motor de conveniencia comparativa integrado en tiempo real de 3 niveles con bloqueo anti-riesgo.
          </span>
        </div>
      </div>

    </section>
  );
};
