import React from 'react';
import { BookOpen, AlertCircle, Info, Calendar } from 'lucide-react';

export const RulesSection: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="rules-section">
      <div className="px-6 py-5 flex items-center justify-between text-left bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5.5 h-5.5 text-blue-400" />
          <div>
            <h3 className="text-base font-bold font-sans tracking-tight">Reglamento Oficial del Torneo</h3>
            <p className="text-xs text-slate-300 mt-0.5">Revisa las reglas de puntuación, desempate y cuotas de entrada oficiales.</p>
          </div>
        </div>
      </div>

      <div className="p-6 text-sm text-slate-600 space-y-6 bg-white">
          
          {/* Rules Section 1: Scoring */}
          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
              <span className="w-1.5 h-4 bg-blue-600 rounded-sm" />
              1. Lógica de Puntuación (Puntos 4 y 6)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-xs font-bold text-blue-600 font-mono">Fase de Grupos (72 Partidos)</span>
                <ul className="list-disc list-inside text-xs mt-2 space-y-2 text-slate-600">
                  <li><strong className="text-slate-800">3 Puntos</strong> por acertar ganador/empate (signo).</li>
                  <li><strong className="text-slate-800">+1 Punto extra</strong> por marcador exacto.</li>
                  <li>Máximo por partido: 4 puntos.</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-xs font-bold text-emerald-600 font-mono">Eliminatorias (Dieciseisavos a Final)</span>
                <p className="text-[11px] text-slate-400 mt-1">Se pronostica el marcador a 90&apos; reglamentarios y el equipo que avanza.</p>
                <ul className="list-disc list-inside text-xs mt-2 space-y-1.5 text-slate-600">
                  <li><strong className="text-emerald-700">5 Puntos</strong>: Acierta signo en 90&apos;, marcador exacto y equipo que clasifica.</li>
                  <li><strong className="text-emerald-700">4 Puntos</strong>: Acierta signo en 90&apos; y equipo clasificado, pero falla marcador exacto.</li>
                  <li><strong className="text-emerald-700">3 Puntos</strong>: Acierta signo en 90&apos; y marcador exacto, pero falla enequipo clasificado.</li>
                  <li><strong className="text-emerald-700">2 Puntos</strong>: Acierta solo uno de los dos (o solo signo o solo equipo clasificado).</li>
                  <li><strong className="text-slate-400">0 Puntos</strong>: Falla ambos aspectos.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Rules Section 2: Elimination Structure */}
          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
              <span className="w-1.5 h-4 bg-orange-600 rounded-sm" />
              2. Estructura de Eliminación Directa por Ronda (Punto 3)
            </h4>
            <p className="text-xs text-slate-500 mt-2">Con <strong className="text-slate-700">11 participantes iniciales</strong>, el cronograma oficial de eliminados es:</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-3 mt-3">
              {[
                { round: 'F. Grupos', pass: 'Pasan 9', elim: '2 Eliminados', bg: 'bg-indigo-50 border-indigo-100 text-indigo-900' },
                { round: 'Dieciseisavos', pass: 'Pasan 7', elim: '2 Eliminados', bg: 'bg-emerald-50 border-emerald-100 text-emerald-900' },
                { round: 'Octavos', pass: 'Pasan 5', elim: '2 Eliminados', bg: 'bg-blue-50 border-blue-100 text-blue-900' },
                { round: 'Cuartos', pass: 'Pasan 4', elim: '1 Eliminado', bg: 'bg-amber-50 border-amber-100 text-amber-900' },
                { round: 'Semifinales', pass: 'Pasan 3', elim: '1 Eliminado', bg: 'bg-purple-50 border-purple-100 text-purple-900' },
                {'round': '3er Puesto', pass: 'Pasan 2', elim: '1 Eliminado', bg: 'bg-rose-50 border-rose-100 text-rose-900' },
                { round: 'Gran Final', pass: 'Campeón', elim: 'Consagración', bg: 'bg-slate-900 border-slate-800 text-white' }
              ].map((ph, idx) => (
                <div key={idx} className={`p-3 rounded-lg border text-center font-sans ${ph.bg}`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider">{idx + 1}. {ph.round}</div>
                  <div className="text-xs font-extrabold mt-1">{ph.pass}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{ph.elim}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules Section 3: Carry Over */}
          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-sm" />
              3. Bonificaciones por Arrastre (Punto 5)
            </h4>
            <p className="text-xs text-slate-500 mt-2">
              Cada ronda reinicia el puntaje a 0 para clasificados, pero se acreditan puntos de arrastre según el podio del periodo inmediato anterior:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-xs font-extrabold text-slate-700">Bonificación Estándar:</span>
                <div className="flex gap-4 mt-2">
                  <div className="bg-amber-50 rounded-lg p-2 flex-1 border border-amber-200 text-center">
                    <div className="text-[11px] text-amber-800 font-bold">1º Puesto</div>
                    <div className="text-lg font-extrabold font-mono text-amber-950">+3 pts</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 flex-1 border border-slate-200 text-center">
                    <div className="text-[11px] text-slate-800 font-bold">2º Puesto</div>
                    <div className="text-lg font-extrabold font-mono text-slate-900">+2 pts</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2 flex-1 border border-orange-200 text-center">
                    <div className="text-[11px] text-orange-800 font-bold">3º Puesto</div>
                    <div className="text-lg font-extrabold font-mono text-orange-950">+1 pt</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs text-xs space-y-2">
                <span className="font-extrabold text-slate-700 text-xs">Excepciones de Arrastre:</span>
                <ul className="space-y-1.5 text-slate-500 font-mono text-[11px]">
                  <li>&bull; <strong className="text-slate-700">De Octavos a Cuartos</strong>: Reciben solo 1º (+2) y 2º (+1).</li>
                  <li>&bull; <strong className="text-slate-700">De Cuartos a Semis</strong>: Recibe solo el 1º (+1).</li>
                  <li>&bull; <strong className="text-slate-700">De Semis a Tercer Puesto / Final</strong>: Sin bonificaciones (0 pts).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Rules Section 4: Tiebreakers */}
          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200/60 pb-1.5">
              <span className="w-1.5 h-4 bg-cyan-600 rounded-sm" />
              4. Criterios de Desempate en Orden Estricto (Punto 6)
            </h4>
            <p className="text-xs text-slate-500 mt-2">
              Si se presenta el mismo puntaje agregado al final de una fase, el sistema aplica los siguientes criterios uno por uno de forma secuencial:
            </p>

            <ul className="mt-3 space-y-2 text-xs">
              {[
                { label: 'Criterio 1', text: 'Mayor número de resultados exactas (marcador clavado) en la ronda actual.' },
                { label: 'Criterio 2', text: 'Mayor número de resultados exactos totales acumulados (desde Fase de Grupos).' },
                { label: 'Criterio 3', text: 'Mayor puntuación exclusiva obtenida en la ronda anterior (sin contar arrastre).' },
                { label: 'Criterio 4', text: 'Mayor número de resultados exactos obtenidos en la ronda inmediatamente anterior.' },
                { label: 'Criterio 5', text: 'Mayor antelación en la entrega oficial del formulario para la ronda en curso.' },
                { label: 'Criterio 6', text: 'Sorteo por consenso o azar público (lanzamiento de moneda o bolillero).' }
              ].map((ct, idx) => (
                <li key={idx} className="flex gap-2 items-start bg-white p-2 border border-slate-100 rounded-lg shadow-xs">
                  <span className="bg-cyan-50 text-cyan-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shrink-0">
                    {ct.label}
                  </span>
                  <span className="text-slate-700">{ct.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Plazos Límites */}
          <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 text-xs flex items-center gap-1">
                Plazo Límite de Recepción (Bolivia, UTC-4)
              </p>
              <p className="text-[11px] text-blue-800 mt-1">
                Los formularios deben subirse antes de las <strong className="text-blue-900">12:00 del mediodía</strong> del día de apertura de cada fase correspondiente. No se aceptan envíos fragmentados o modificaciones posteriores al inicio del primer partido.
              </p>
            </div>
          </div>

        </div>
    </div>
  );
};
