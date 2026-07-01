import React from 'react';
import { PlayerLeaderboardRow, RoundId, Match } from '../types';
import { Crown, Sparkles, Gift, Coins, Trophy } from 'lucide-react';

interface PhaseKingsProps {
  standingsByRound: Record<RoundId, PlayerLeaderboardRow[]>;
  totalPlayersCount: number;
  matches: Match[];
}

export const PhaseKings: React.FC<PhaseKingsProps> = ({
  standingsByRound,
  totalPlayersCount,
  matches,
}) => {
  // Total Prize Pool calculation: Bs. 50 entry fee per player.
  const entryFee = 50;
  const totalPot = totalPlayersCount * entryFee;

  // Prize Distribution Table:
  const championPrize = totalPot * 0.50;
  const runnerUpPrize = totalPot * 0.25;
  const thirdPlacePrize = totalPot * 0.125;
  const totalReyesPool = totalPot * 0.125;
  const singleReyPrize = totalReyesPool / 5; // Split among 5 rounds (Grupos, 16avos, 8vos, 4tos, Semis)

  // Eligible rounds for "Rey de Fase"
  const reyesRounds: { id: RoundId; name: string }[] = [
    { id: 'grupos', name: 'Fase de Grupos' },
    { id: 'dieciseisavos', name: 'Dieciseisavos de Final' },
    { id: 'octavos', name: 'Octavos de Final' },
    { id: 'cuartos', name: 'Cuartos de Final' },
    { id: 'semifinales', name: 'Semifinales' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="prizes-and-kings-section">
      {/* Payout Details Display Panel */}
      <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold font-sans tracking-tight">Estructura de Premiación Oficial</h3>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-5">
            <div className="text-xs text-slate-300 font-mono">BOTE TOTAL EN JUEGO ({totalPlayersCount} participantes)</div>
            <div className="text-3xl font-extrabold text-amber-400 mt-1 font-mono">
              Bs. {totalPot.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Cuota de entrada única: Bs. 50,00 por jugador (100% al bote)</div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Trophy className="w-4 h-4 text-amber-400" />
                Campeón del Mundo (50%)
              </span>
              <span className="font-mono font-bold text-amber-400">Bs. {championPrize.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Subcampeón (25%)
              </span>
              <span className="font-mono font-bold text-slate-200">Bs. {runnerUpPrize.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-700" />
                Tercer Puesto (12.5%)
              </span>
              <span className="font-mono font-bold text-slate-300">Bs. {thirdPlacePrize.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pb-2">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Crown className="w-4 h-4 text-emerald-400" />
                Reyes de Fase (12.5%)
              </span>
              <span className="font-mono font-bold text-emerald-300" title="Repartido en partes iguales entre las 5 rondas">
                Bs. {totalReyesPool.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">({reyesRounds.length} x Bs. {singleReyPrize.toFixed(2)})</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 flex gap-2 text-[10px] text-slate-400 font-sans">
          <Gift className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Premio exclusivo &quot;Rey de Fase&quot;: Mayor puntuación acumulada dentro de la ronda, despatado con número de exactos.</span>
        </div>
      </div>

      {/* Phase Kings Standings List */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-sans tracking-tight">Reyes de Fase</h3>
            <p className="text-xs text-slate-500 mt-0.5">El mayor puntaje exclusivo obtenido en cada ronda se corona con Bs. {singleReyPrize.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {reyesRounds.map((roundMeta) => {
            const playersRows = standingsByRound[roundMeta.id] || [];
            
            // For "Rey de Fase", the winner is the one who is currently 1st in the official standings table for that phase (including carry-over bonus and official tiebreaker criteria).
            const activeRoundSurvivors = playersRows.filter(p => !p.isEliminated);
            const winner = activeRoundSurvivors[0];
            // A phase has started if there is at least one played match in this round
            const hasStarted = winner && matches.some(m => m.round === roundMeta.id && m.localGoals !== null && m.localGoals !== undefined);

            return (
              <div
                key={roundMeta.id}
                className={`rounded-xl p-4 border transition-all ${
                  hasStarted
                    ? 'bg-emerald-50/20 border-emerald-100 hover:shadow-xs'
                    : 'bg-slate-50/50 border-slate-150'
                }`}
              >
                <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">
                  {roundMeta.name.split(' ')[0]} {roundMeta.name.split(' ')[1] || ''}
                </div>

                {hasStarted ? (
                  <div className="mt-4 flex flex-col justify-between h-full min-h-[90px]">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm truncate flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        {winner.playerName}
                      </div>
                      <div className="text-xs font-mono font-medium text-emerald-700 mt-1">
                        {winner.totalRoundPoints} Puntos
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {winner.exactHitsInRound} Exacto{winner.exactHitsInRound !== 1 ? 's' : ''} en fase
                      </div>
                      {winner.carryOverBonus > 0 && (
                        <div className="text-[9px] text-slate-400 font-mono">
                          (Arrastre: +{winner.carryOverBonus})
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-2 border-t border-emerald-100/50 flex justify-between items-center text-[10px] font-mono text-emerald-800 font-bold">
                      <span>Premio</span>
                      <span>Bs. {singleReyPrize.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col justify-center items-center py-4 text-center text-slate-400">
                    <Crown className="w-6 h-6 text-slate-300 stroke-[1.5] mb-2" />
                    <span className="text-[10px] font-mono leading-tight">Espera de resultados</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
