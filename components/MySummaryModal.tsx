import React, { useMemo } from 'react';
import { Player, Match, RoundId, PlayerLeaderboardRow } from '../types';
import { calculatePredictionScore } from '../utils/rulesEngine';
import { X, Award, Percent, Activity, TrendingDown, Target, Shield, Calendar, Sparkles } from 'lucide-react';

interface MySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  players: Player[];
  matches: Match[];
  selectedRoundId: RoundId;
  standingsRow: PlayerLeaderboardRow | undefined;
}

export const MySummaryModal: React.FC<MySummaryModalProps> = ({
  isOpen,
  onClose,
  player,
  players,
  matches,
  selectedRoundId,
  standingsRow
}) => {
  if (!isOpen) return null;

  // 1. Filter completed matches for the selected round where the player has a prediction
  const completedRoundMatches = useMemo(() => {
    return matches.filter(m => 
      m.round === selectedRoundId && 
      m.localGoals !== null && 
      m.localGoals !== undefined && 
      m.visitorGoals !== null && 
      m.visitorGoals !== undefined
    );
  }, [matches, selectedRoundId]);

  // 2. Calculate effectiveness by team / selección
  const teamEffectiveness = useMemo(() => {
    const stats: Record<string, { total: number; correct: number }> = {};

    completedRoundMatches.forEach(m => {
      const pred = player.predictions[m.id];
      if (!pred) return;

      const { score } = calculatePredictionScore(m, pred);
      const isCorrect = score > 0; // successfully guessed sign or better

      [m.local, m.visitor].forEach(t => {
        if (!stats[t]) {
          stats[t] = { total: 0, correct: 0 };
        }
        stats[t].total += 1;
        if (isCorrect) {
          stats[t].correct += 1;
        }
      });
    });

    return Object.entries(stats)
      .map(([team, data]) => ({
        team,
        percentage: (data.correct / data.total) * 100,
        total: data.total,
        correct: data.correct
      }))
      .filter(t => t.total >= 1) // Only show teams with at least 1 completed match prediction
      .sort((a, b) => b.percentage - a.percentage || b.total - a.total)
      .slice(0, 4); // Top 4 teams
  }, [completedRoundMatches, player]);

  // 3. Average score by match date (Puntaje promedio por Fecha)
  const averageScoreByDate = useMemo(() => {
    const datesData: Record<string, { totalPoints: number; count: number }> = {};

    completedRoundMatches.forEach(m => {
      const pred = player.predictions[m.id];
      if (!pred) return;

      const { score } = calculatePredictionScore(m, pred);
      
      const dateString = m.date; // "DD/MM/YYYY" format
      if (!datesData[dateString]) {
        datesData[dateString] = { totalPoints: 0, count: 0 };
      }
      datesData[dateString].totalPoints += score;
      datesData[dateString].count += 1;
    });

    return Object.entries(datesData)
      .map(([date, data]) => ({
        date,
        avg: data.totalPoints / data.count,
        count: data.count
      }))
      .sort((a, b) => {
        const parseDate = (dStr: string) => {
          const [d, m, y] = dStr.split('/').map(Number);
          return new Date(y, m - 1, d).getTime();
        };
        return parseDate(a.date) - parseDate(b.date);
      });
  }, [completedRoundMatches, player]);

  // 4. Calculate Top 3 Lost Opportunities (Casi triples/puntos exactos o partidos empatados al final)
  const topLostOpportunities = useMemo(() => {
    const list = completedRoundMatches.map(m => {
      const pred = player.predictions[m.id];
      if (!pred) return null;

      const { score } = calculatePredictionScore(m, pred);
      const maxPossible = m.round === 'grupos' ? 4 : 5;
      const pointsLost = maxPossible - score;

      const diffLocal = Math.abs(pred.localGoals - m.localGoals!);
      const diffVisitor = Math.abs(pred.visitorGoals - m.visitorGoals!);
      const goalDeviation = diffLocal + diffVisitor;

      return {
        match: m,
        pred,
        score,
        pointsLost,
        goalDeviation
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null)
    // We prioritize highest points lost, but with minimal goal deviation (meaning they were very close!)
    .sort((a, b) => b.pointsLost - a.pointsLost || a.goalDeviation - b.goalDeviation)
    .slice(0, 3);

    return list;
  }, [completedRoundMatches, player]);

  // 5. General Overall metrics
  const totalPredictedInRound = useMemo(() => {
    const roundMatches = matches.filter(m => m.round === selectedRoundId);
    return roundMatches.filter(m => player.predictions[m.id]).length;
  }, [matches, selectedRoundId, player]);

  const generalEffectiveness = useMemo(() => {
    if (completedRoundMatches.length === 0) return 0;
    let correctCount = 0;
    completedRoundMatches.forEach(m => {
      const pred = player.predictions[m.id];
      if (pred) {
        const { score } = calculatePredictionScore(m, pred);
        if (score > 0) correctCount++;
      }
    });
    return (correctCount / completedRoundMatches.length) * 100;
  }, [completedRoundMatches, player]);

  const generalExactRate = useMemo(() => {
    if (completedRoundMatches.length === 0) return 0;
    let exactCount = 0;
    completedRoundMatches.forEach(m => {
      const pred = player.predictions[m.id];
      if (pred) {
        const { isExact } = calculatePredictionScore(m, pred);
        if (isExact) exactCount++;
      }
    });
    return (exactCount / completedRoundMatches.length) * 100;
  }, [completedRoundMatches, player]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" id="my-summary-modal-overlay">
      <div className="bg-white dark:bg-[#130d2d] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-[#221a48] transition-all flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#090724] to-[#120e4f] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#00ff66]/10 border border-[#00ff66]/20 p-2 rounded-xl text-white">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight uppercase font-display text-white">
                Mi Resumen: {player.name}
              </h3>
              <p className="text-[11px] text-indigo-200 mt-0.5">Estadísticas predictivas avanzadas procesadas en tiempo real</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            id="close-summary-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-[#1c153f] p-4 rounded-xl border border-slate-100 dark:border-[#2b215c]/30 text-center space-y-1">
              <div className="text-slate-400 dark:text-indigo-300 text-[10px] uppercase font-mono font-bold">Puntos en Ronda</div>
              <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                {standingsRow?.roundScore || 0}
              </div>
              <div className="text-[10px] text-slate-500">Excluye bono de arrastre</div>
            </div>
            <div className="bg-slate-50 dark:bg-[#1c153f] p-4 rounded-xl border border-slate-100 dark:border-[#2b215c]/30 text-center space-y-1">
              <div className="text-slate-400 dark:text-indigo-300 text-[10px] uppercase font-mono font-bold">Efectividad General</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-[#00ff66] font-mono flex items-center justify-center gap-1">
                <Percent className="w-5 h-5 stroke-[2.5]" />
                {generalEffectiveness.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500">Acierto en ganar/perder/empate</div>
            </div>
            <div className="bg-slate-50 dark:bg-[#1c153f] p-4 rounded-xl border border-slate-100 dark:border-[#2b215c]/30 text-center space-y-1">
              <div className="text-slate-400 dark:text-indigo-300 text-[10px] uppercase font-mono font-bold">Marcadores Exactos</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {standingsRow?.exactHitsInRound || 0}
              </div>
              <div className="text-[10px] text-slate-500">({generalExactRate.toFixed(1)}% de precisión)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Efectividad por Selección */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-mono">
                <Target className="w-4 h-4 text-emerald-500" />
                Efectividad por Equipo Top
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Selecciones mundiales donde el participante tiene mejores proyecciones de acierto.</p>
              
              {teamEffectiveness.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {teamEffectiveness.map((t, index) => (
                    <div key={index} className="bg-slate-50/50 dark:bg-[#1c153f]/40 p-3 rounded-lg border border-slate-100/60 dark:border-[#2b215c]/20 flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{t.team}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 dark:text-indigo-300 font-mono text-[10px]">({t.correct}/{t.total} aciertos)</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-[#00ff66] bg-emerald-500/10 dark:bg-[#00ff66]/10 px-2 py-0.5 rounded">
                          {t.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono text-[11px] border border-dashed border-slate-200 dark:border-[#2b215c]/40 rounded-xl">
                  Sin información de efectividad todavía.
                </div>
              )}
            </div>

            {/* Right Column: Puntaje Promedio por Fecha */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-mono">
                <Calendar className="w-4 h-4 text-blue-500" />
                Puntaje Promedio por Fecha
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Progreso histórico consolidado según la fecha del partido jugado.</p>

              {averageScoreByDate.length > 0 ? (
                <div className="space-y-2 pt-1 max-h-[175px] overflow-y-auto pr-1">
                  {averageScoreByDate.map((d, index) => (
                    <div key={index} className="bg-slate-50/50 dark:bg-[#1c153f]/40 p-2.5 rounded-lg border border-slate-100/60 dark:border-[#2b215c]/20 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-600 dark:text-slate-300 font-bold">{d.date}</span>
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-slate-400 text-[10px] font-normal">({d.count} part.)</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {d.avg.toFixed(2)} pts med.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono text-[11px] border border-dashed border-slate-200 dark:border-[#2b215c]/40 rounded-xl">
                  Sin partidos jugados para ponderar promedio.
                </div>
              )}
            </div>

          </div>

          {/* Section Detail: Top 3 Oportunidades Perdidas */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 font-mono">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              Top 3 Oportunidades Perdidas (Casi Aciertos)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Los partidos donde el participante estuvo más cerca de obtener los puntos exactos pero falló por un gol de diferencia.</p>

            {topLostOpportunities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {topLostOpportunities.map((o, index) => (
                  <div key={index} className="bg-rose-500/[0.02] dark:bg-[#25123a]/10 p-3.5 rounded-xl border border-rose-500/10 dark:border-[#cf4e72]/20 flex flex-col justify-between space-y-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1.5 text-[9px] uppercase tracking-wider font-mono text-slate-400 dark:text-indigo-300 font-semibold">
                        <span>Puntos: {o.score}</span>
                        <span className="text-rose-600 font-bold">-{o.pointsLost} pts</span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-slate-200 truncate leading-tight">
                        {o.match.local} vs {o.match.visitor}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 space-y-0.5 font-mono">
                        <div>Pronosticó: <strong className="text-slate-700 dark:text-white">{o.pred.localGoals}-{o.pred.visitorGoals}</strong></div>
                        <div>Resultado: <strong className="text-slate-700 dark:text-white">{o.match.localGoals}-{o.match.visitorGoals}</strong></div>
                      </div>
                    </div>
                    <div className="text-[10.5px] font-medium text-rose-600 dark:text-rose-400 italic font-sans flex items-center gap-0.5">
                      <span>Perdido por {o.goalDeviation} {o.goalDeviation === 1 ? 'gol' : 'goles'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 font-mono text-[11px] border border-dash border-slate-200 dark:border-[#2b215c]/40 rounded-xl">
                Sin oportunidades perdidas registradas aún.
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#1a134d]/40 border-t border-slate-100 dark:border-[#221a48] text-right">
          <button 
            onClick={onClose}
            className="cursor-pointer text-xs font-black uppercase text-slate-900 bg-slate-200 hover:bg-slate-300 px-4 py-2.5 rounded-xl transition-all"
            id="close-summary-modal-footer-btn"
          >
            Cerrar Resumen
          </button>
        </div>

      </div>
    </div>
  );
};
