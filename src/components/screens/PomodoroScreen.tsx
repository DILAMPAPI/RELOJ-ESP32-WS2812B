import React, { useState } from 'react';
import { BleManager } from '../../services/bleManager';
import { Play, Pause, RotateCcw, Coffee, Sparkles, Sliders } from 'lucide-react';

interface PomodoroScreenProps {
  ble: BleManager;
}

export const PomodoroScreen: React.FC<PomodoroScreenProps> = ({ ble }) => {
  const { status, state } = ble;
  const isConnected = state === 'connected';

  const [workMin, setWorkMin] = useState<number>(25);
  const [breakMin, setBreakMin] = useState<number>(5);
  const [rounds, setRounds] = useState<number>(4);

  const isPomodoroMode = status.mode === 'POMODORO';
  const isBreak = isPomodoroMode && status.phase === 'BREAK';

  const formatSec = (sec?: number) => {
    if (sec === undefined || sec === null) return '25:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    ble.startPomodoro(workMin, breakMin, rounds);
  };

  const handlePause = () => {
    ble.pausePomodoro();
  };

  const handleResume = () => {
    ble.resumePomodoro();
  };

  const handleStop = () => {
    ble.stopPomodoro();
  };

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h2 className="text-xl font-bold text-stone-100">Método Pomodoro</h2>
        <p className="text-xs text-stone-400">
          Bloques de trabajo y descanso controlados por el firmware del reloj
        </p>
      </div>

      {/* Tarjeta Visual Principal (Verde en descanso como en los LEDs físicos WS2812B) */}
      <div
        className={`p-8 rounded-3xl border text-center shadow-2xl transition-all relative overflow-hidden ${
          isBreak
            ? 'bg-gradient-to-b from-emerald-950/80 to-black border-emerald-500/60 shadow-emerald-950/30'
            : 'bg-gradient-to-b from-stone-900 to-black border-stone-800'
        }`}
      >
        {/* Badge de Fase */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isBreak
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-900/50'
                : 'bg-orange-500 text-white'
            }`}
          >
            {isBreak ? (
              <>
                <Coffee className="w-3.5 h-3.5" />
                <span>DESCANSO (LEDS VERDES EN RELOJ)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>FASE DE TRABAJO ENFOCADO</span>
              </>
            )}
          </div>
        </div>

        {/* Contador Gigante de la Fase Actual */}
        <div
          className={`text-6xl sm:text-7xl font-mono font-black tracking-widest my-2 ${
            isBreak ? 'text-emerald-400' : isPomodoroMode ? 'text-orange-500' : 'text-stone-300'
          }`}
          style={{
            textShadow: isBreak
              ? '0 0 24px rgba(16, 185, 129, 0.4)'
              : isPomodoroMode
              ? '0 0 24px rgba(249, 115, 22, 0.4)'
              : undefined,
          }}
        >
          {isPomodoroMode ? formatSec(status.remainingSec) : `${workMin.toString().padStart(2, '0')}:00`}
        </div>

        {/* Indicador de Ronda */}
        <div className="text-xs font-medium text-stone-400 mt-2">
          {isPomodoroMode ? (
            <span className="text-stone-200 font-bold">
              Ronda {status.currentRound || 1} de {status.totalRounds || rounds}
              {status.paused && ' · (PAUSADO EN RELOJ)'}
            </span>
          ) : (
            <span>
              Ciclo: {workMin}m trabajo / {breakMin}m descanso ({rounds} rondas)
            </span>
          )}
        </div>
      </div>

      {/* Controles de Acción */}
      <div className="flex items-center gap-3">
        {isPomodoroMode ? (
          <>
            {status.paused ? (
              <button
                onClick={handleResume}
                disabled={!isConnected}
                className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-950/30 transition-all disabled:opacity-40"
              >
                <Play className="w-5 h-5 fill-black" />
                Reanudar
              </button>
            ) : (
              <button
                onClick={handlePause}
                disabled={!isConnected}
                className="flex-1 py-4 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold rounded-2xl flex items-center justify-center gap-2 text-sm border border-stone-700 transition-all disabled:opacity-40"
              >
                <Pause className="w-5 h-5" />
                Pausar (PAUSE_POMODORO)
              </button>
            )}
            <button
              onClick={handleStop}
              disabled={!isConnected}
              className="py-4 px-6 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 font-semibold rounded-2xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-40"
              title="Reiniciar y volver a modo reloj"
            >
              <RotateCcw className="w-5 h-5" />
              Reiniciar
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            disabled={!isConnected}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-40"
          >
            <Play className="w-5 h-5 fill-black" />
            Iniciar Pomodoro en Reloj ESP32
          </button>
        )}
      </div>

      {/* Configuración de Parámetros de Pomodoro */}
      {!isPomodoroMode && (
        <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-stone-100 text-sm">Parámetros del Ciclo</span>
          </div>

          <div className="space-y-4">
            {/* Minutos de Trabajo */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-stone-300">Tiempo de Trabajo:</span>
                <span className="font-mono font-bold text-orange-400">{workMin} minutos</span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={workMin}
                onChange={(e) => setWorkMin(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            {/* Minutos de Descanso */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-stone-300">Tiempo de Descanso:</span>
                <span className="font-mono font-bold text-emerald-400">{breakMin} minutos</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={breakMin}
                onChange={(e) => setBreakMin(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Número de Rondas */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-stone-300">Número de Rondas:</span>
                <span className="font-mono font-bold text-stone-200">{rounds} rondas</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={rounds}
                onChange={(e) => setRounds(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-stone-300"
              />
            </div>
          </div>

          {/* Preajustes */}
          <div className="pt-2 border-t border-stone-800 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setWorkMin(25);
                setBreakMin(5);
                setRounds(4);
              }}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-medium transition-colors"
            >
              25 / 5 min (Clásico 4 rondas)
            </button>
            <button
              onClick={() => {
                setWorkMin(50);
                setBreakMin(10);
                setRounds(4);
              }}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-medium transition-colors"
            >
              50 / 10 min (Extendido)
            </button>
            <button
              onClick={() => {
                setWorkMin(15);
                setBreakMin(3);
                setRounds(3);
              }}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-medium transition-colors"
            >
              15 / 3 min (Rápido)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
