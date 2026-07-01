import React from 'react';
import { PlayerLeaderboardRow, RoundInfo, Match } from '../types';
import { Shield, Clock, Award, AlertTriangle, Check, ChevronRight } from 'lucide-react';

interface LeaderboardProps {
  round: RoundInfo;
  rows: PlayerLeaderboardRow[];
  matches: Match[];
  previousRows?: PlayerLeaderboardRow[];
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
  onShowSummary?: (playerId: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  round, 
  rows,
  matches,
  previousRows,
  selectedPlayerId,
  onSelectPlayer,
  onShowSummary
}) => {
  const displayedRows = round.id === 'grupos' ? rows : rows.filter(r => !r.isEliminated);

  // Find all unique, sorted and non-empty delivery times to assign ordering indices
  const sortedUniqueTimes = Array.from<string>(
    new Set<string>(
      displayedRows
        .map(r => r.deliveryTime)
        .filter((t): t is string => typeof t === 'string' && t !== '')
    )
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const getDeliveryOrdinal = (deliveryTime: string): string => {
    if (!deliveryTime) return '-';
    const index = sortedUniqueTimes.indexOf(deliveryTime);
    if (index === -1) return '-';
    
    // Convert to ordinal abbreviation in Spanish
    const position = index + 1;
    if (position === 1) return '1º en entregar';
    if (position === 2) return '2º en entregar';
    if (position === 3) return '3º en entregar';
    return `${position}º en entregar`;
  };

  const getDeliveryOrdinalCustom = (deliveryTime: string): string => {
    if (!deliveryTime) return '';
    const index = sortedUniqueTimes.indexOf(deliveryTime);
    if (index === -1) return '';
    const position = index + 1;
    if (position === 1) return 'entregado 1ero';
    if (position === 2) return 'entregado 2do';
    if (position === 3) return 'entregado 3ero';
    if (position === 4) return 'entregado 4to';
    if (position === 5) return 'entregado 5to';
    if (position === 6) return 'entregado 6to';
    if (position === 7) return 'entregado 7mo';
    if (position === 8) return 'entregado 8vo';
    if (position === 9) return 'entregado 9no';
    if (position === 10) return 'entregado 10mo';
    if (position === 11) return 'entregado 11vo';
    return `entregado ${position}º`;
  };

  // Determine cutoff indices for elimination
  const activeRows = rows.filter(r => !r.isEliminated);
  const totalActiveCount = activeRows.length;
  const survivorCount = Math.max(0, totalActiveCount - round.eliminatedCount);

  // Math elimination helper calculation
  const pendingMatches = matches.filter(
    m => m.round === round.id && (m.localGoals === null || m.localGoals === undefined)
  );
  const pendingCount = pendingMatches.length;
  const maxPtsPerMatch = round.id === 'grupos' ? 4 : 5;
  const maxPossiblePointsDiff = pendingCount * maxPtsPerMatch;

  // Highest score among non-eliminated players
  const leaderScore = activeRows.length > 0 ? activeRows[0].totalRoundPoints : 0;

  return (
    <div className="bg-white dark:bg-[#130d2d] rounded-2xl shadow-sm border border-slate-100 dark:border-[#221a48] overflow-hidden" id="leaderboard-section">
      {/* Header Info */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#090724] dark:to-[#120e4f] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 rounded-full mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Tabla de Posiciones Oficial
          </span>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white">
            Clasificación: {round.name}
          </h2>
          <p className="text-xs text-slate-300 dark:text-indigo-200 mt-1">
            Se eliminan {round.eliminatedCount} participante{round.eliminatedCount !== 1 ? 's' : ''} al final de esta fase. Quedan {survivorCount} activos para la siguiente ronda.
          </p>
        </div>

        <div className="flex gap-3 text-xs border-t border-slate-700/50 pt-3 md:pt-0 md:border-t-0 font-mono">
          <div className="bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
            <div className="text-emerald-400 font-bold">PUNTOS TOTALES</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-300">Ronda + Arrastre</div>
          </div>
          <div className="bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
            <div className="text-blue-400 font-bold">MARCADOR EXACTO</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-300">Ronda (+1 PV)</div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-[#252055] scrollbar-track-transparent">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-[#1a134d]/30 border-b border-slate-100 dark:border-[#221a48] font-mono text-slate-500 dark:text-indigo-300 text-[11px] uppercase tracking-wider">
              <th className="py-4 px-4 text-center w-12 font-bold">Pos</th>
              <th className="py-4 px-6 font-bold">Participante</th>
              <th className="py-4 px-4 text-center font-bold font-sans text-indigo-950 dark:text-emerald-300 bg-indigo-550/5 w-28 border-x border-indigo-100/30 dark:border-indigo-900/25">Puntos Totales</th>
              <th className="py-4 px-4 text-center font-bold">Ptos Ronda</th>
              <th className="py-4 px-4 text-center font-bold">Exactos Ronda</th>
              <th className="py-4 px-4 text-center font-bold">Arrastre</th>
              {round.id !== 'grupos' && (
                <>
                  <th className="py-4 px-4 text-center font-bold text-amber-600 dark:text-amber-400" title="Puntos obtenidos en la fase anterior (criterio de desempate)">Ptos Fase Ant.</th>
                  <th className="py-4 px-4 text-center font-bold text-amber-600 dark:text-amber-400" title="Marcadores exactos de la fase anterior (criterio de desempate)">Exactos Fase Ant.</th>
                </>
              )}
              <th className="py-4 px-4 text-center font-bold">Exactos Total</th>
              <th className="py-4 px-4 text-center font-bold">Entrega</th>
              <th className="py-4 px-4 text-center font-bold w-36">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#221a48] text-sm">
            {displayedRows.map((row, idx) => {
              // Determine if this row is in the elimination zone for the *active* pool
              const isActive = !row.isEliminated;
              // If active, is their active position beyond the survivorCount?
              const isEliminationZone = isActive && (idx >= survivorCount);
              const isSurvivorZone = isActive && (idx < survivorCount);

              // Styling values
              let rowBg = 'hover:bg-slate-50/50 dark:hover:bg-[#1d1647]/25';
              let rankBadge = 'bg-slate-100 text-slate-600 dark:bg-[#1c153f] dark:text-indigo-300';
              let zoneStyle = '';

              if (row.isEliminated) {
                rowBg = 'bg-slate-50/40 opacity-60 hover:bg-slate-50/60 dark:bg-[#110c29]/20 dark:opacity-50';
                rankBadge = 'bg-slate-200 text-slate-400 dark:bg-[#110c29] dark:text-indigo-700';
              } else if (isEliminationZone) {
                rowBg = 'bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-950/5 dark:hover:bg-rose-950/10';
                rankBadge = 'bg-rose-100 text-rose-700 font-bold dark:bg-rose-950/20 dark:text-rose-400';
                zoneStyle = 'border-l-4 border-rose-500';
              } else if (isSurvivorZone) {
                if (row.rank === 1) {
                  rowBg = 'bg-amber-50/15 hover:bg-amber-50/30 dark:bg-amber-950/5 dark:hover:bg-amber-950/10';
                  rankBadge = 'bg-amber-100 text-amber-800 font-bold border border-amber-300 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
                } else if (row.rank === 2) {
                  rowBg = 'bg-slate-50/70 hover:bg-slate-50 dark:bg-[#1c153f]/20 dark:hover:bg-[#1c153f]/40';
                  rankBadge = 'bg-slate-200 text-slate-800 font-bold dark:bg-slate-800 dark:text-slate-200';
                } else if (row.rank === 3) {
                  rowBg = 'bg-orange-50/10 hover:bg-orange-50/20 dark:bg-orange-950/5 dark:hover:bg-orange-950/10';
                  rankBadge = 'bg-orange-100 text-orange-800 font-bold dark:bg-orange-950/20 dark:text-orange-400';
                } else {
                  rowBg = 'bg-emerald-50/5 hover:bg-emerald-50/15 dark:bg-emerald-950/5 dark:hover:bg-emerald-950/10';
                  rankBadge = 'bg-emerald-100 text-emerald-800 font-medium dark:bg-emerald-950/20 dark:text-emerald-400';
                }
                zoneStyle = 'border-l-4 border-emerald-500';
              }

              // Trend computation
              const prevRow = previousRows?.find(p => p.playerId === row.playerId);
              const prevRank = prevRow ? prevRow.rank : row.rank;
              let trendIcon = null;
              if (isActive && prevRow) {
                if (row.rank < prevRank) {
                  trendIcon = <span className="text-emerald-500 font-bold ml-1.5 text-xs select-none cursor-help" title={`Subió ${prevRank - row.rank} puesto(s) (Anterior: ${prevRank}º)`}>⬆️</span>;
                } else if (row.rank > prevRank) {
                  trendIcon = <span className="text-rose-500 font-bold ml-1.5 text-xs select-none cursor-help" title={`Bajó ${row.rank - prevRank} puesto(s) (Anterior: ${prevRank}º)`}>⬇️</span>;
                } else {
                  trendIcon = <span className="text-slate-400 font-semibold ml-1.5 text-xs select-none cursor-help" title="Mantiene su posición">➖</span>;
                }
              }

              // Mathematical elimination check
              const cutoffScore = (activeRows.length > survivorCount && survivorCount > 0)
                ? activeRows[survivorCount - 1].totalRoundPoints
                : 0;
              const playerMaxPossibleTotal = row.totalRoundPoints + maxPossiblePointsDiff;
              const isMathematicallyEliminated = isActive && 
                (activeRows.length > survivorCount) && 
                (pendingCount > 0) && 
                (playerMaxPossibleTotal < cutoffScore);

              const isSelected = selectedPlayerId === row.playerId;
              return (
                <tr 
                  key={row.playerId} 
                  onClick={() => onSelectPlayer?.(row.playerId)}
                  title="Haz clic para seleccionar este participante en todas las vistas"
                  className={`transition-all duration-150 cursor-pointer ${rowBg} ${zoneStyle} ${isSelected ? 'bg-indigo-550/20 dark:bg-indigo-950/30 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/45 ring-2 ring-indigo-500/25 shadow-sm' : ''}`} 
                  id={`player-row-${row.playerId}`}
                >
                  {/* Position number */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono font-bold ${rankBadge}`}>
                        {row.isEliminated ? '-' : row.rank}
                      </span>
                      {trendIcon}
                    </div>
                  </td>

                  {/* Name and optional tie-breaker info */}
                  <td className="py-3 px-6 font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <span 
                          className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-[#00ff66] underline decoration-dotted decoration-indigo-300 dark:decoration-indigo-950/20 transition-colors"
                          title="Clic para ver 'Mi Resumen' (Estadísticas Avanzadas)"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent select player side-effects unless custom modal handles it
                            onShowSummary?.(row.playerId);
                          }}
                        >
                          {row.playerName}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] uppercase font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <span className="w-1 h-1 bg-indigo-600 rounded-full animate-ping" />
                            Marcado
                          </span>
                        )}
                        {isActive && row.rank === 1 && (
                          <span title="Rey / Líder de la Fase">
                            <Award className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
                          </span>
                        )}
                        {idx < survivorCount && idx < 3 && isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium font-mono dark:bg-amber-950/30 dark:text-amber-300">
                            +{round.maxCarryOverBonus[(idx + 1).toString()] || 0} Arrastre
                          </span>
                        )}
                      </div>
                      
                      {row.tieBreakReason && (
                        <span className="text-[10px] text-slate-500 dark:text-indigo-300 mt-0.5 flex items-center gap-1 font-sans">
                          <Clock className="w-3 h-3 text-blue-400" />
                          {row.tieBreakReason === 'DELIVERY_ORDER' ? (
                            <span>Desempate (orden de entrega): <strong className="text-blue-700 dark:text-blue-300 font-extrabold">{getDeliveryOrdinalCustom(row.deliveryTime)}</strong></span>
                          ) : (
                            <span>Desempate: {row.tieBreakReason}</span>
                          )}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Total aggregate points HIGHLIGHTED IN BOLD */}
                  <td className="py-3 px-4 text-center font-mono font-black text-indigo-950 dark:text-indigo-200 bg-indigo-550/5 text-base shadow-xs select-none">
                    {row.isEliminated ? '-' : row.totalRoundPoints}
                  </td>

                  {/* Points from predictions in this round */}
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-600 dark:text-slate-300" title="Puntos obtenidos sin el bono exacto (3 pts en grupos por acierto de resultado; 4 o 2 pts en eliminatorias)">
                    {row.isEliminated ? '-' : row.roundScore - row.exactHitsInRound}
                  </td>

                  {/* Exact matches in current round */}
                  <td className="py-3 px-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                    {row.isEliminated ? '-' : row.exactHitsInRound}
                  </td>

                  {/* Dragged Points from previous round */}
                  <td className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-[#00ff66] font-semibold">
                    {row.isEliminated ? '-' : (row.carryOverBonus > 0 ? `+${row.carryOverBonus}` : '0')}
                  </td>

                  {round.id !== 'grupos' && (
                    <>
                      <td className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400 font-semibold" title="Puntos de la fase anterior">
                        {row.isEliminated ? '-' : row.previousRoundScore}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400 font-semibold" title="Exactos de la fase anterior">
                        {row.isEliminated ? '-' : row.previousExactHits}
                      </td>
                    </>
                  )}

                  {/* Total exact matches in tournament up to now */}
                  <td className="py-3 px-4 text-center font-mono text-slate-500 dark:text-slate-400 text-xs">
                    {row.isEliminated ? '-' : row.totalExactHitsCumulative}
                  </td>

                  {/* Submission Timestamp */}
                  <td className="py-3 px-4 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold font-mono">
                    {row.deliveryTime ? getDeliveryOrdinal(row.deliveryTime) : '-'}
                  </td>

                  {/* Badge showing current promotion or elimination status */}
                  <td className="py-3 px-4 text-center">
                    {row.isEliminated ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-400 dark:bg-[#1c153f] dark:text-slate-500 rounded-full border border-slate-200 dark:border-[#2b215c]">
                        Eliminado
                      </span>
                    ) : isMathematicallyEliminated ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black bg-zinc-150 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-full border border-zinc-300 dark:border-zinc-800" title="Matemáticamente imposible alcanzar el 1er lugar de la clasificación con los partidos restantes.">
                        ⚰️ Eliminado Mat.
                      </span>
                    ) : isEliminationZone ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-900/50 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        Zona Descenso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-[#00ff66]/10">
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        Clasificado
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Legend */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-[#1a134d]/30 border-t border-slate-100 dark:border-[#221a48] text-xs text-slate-500 dark:text-indigo-300 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded" /> Zona de Clasificación (Avanzan)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-900 rounded" /> Zona de Eliminación Directa
          </span>
        </div>

        <div className="text-[11px] font-medium text-slate-400">
          * El orden de entrega oficial de los pronósticos determina el desempate definitivo en igualdad de condiciones.
        </div>
      </div>
    </div>
  );
};
