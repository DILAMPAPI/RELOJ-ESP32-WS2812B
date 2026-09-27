import React, { useState } from 'react';
import { BleManager } from '../../services/bleManager';
import { Play, Pause, RotateCcw, Clock, AlertTriangle } from 'lucide-react';

interface TimerScreenProps {
  ble: BleManager;
}

export const TimerScreen: React.FC<TimerScreenProps> = ({ ble }) => {
  const { status, state } = ble;
  const isConnected = state === 'connected';

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  const isTimerMode = status.mode === 'TIMER';
  const remaining = status.remainingSec ?? (hours * 3600 + minutes * 60 + seconds);

  const formatBigTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    ble.startTimer(hours, minutes, seconds);
  };

  const handlePause = () => {
    ble.pauseTimer();
  };

  const handleResume = () => {
    ble.resumeTimer();
  };

  const handleStop = () => {
    ble.stopTimer();
  };

  return (
    <div className="space-y-5 pb-20">
      <div>
        <h2 className="text-xl font-bold text-stone-100">Temporizador Físico</h2>
        <p className="text-xs text-stone-400">
          Cuenta regresiva ejecutada de forma autónoma en el ESP32-C3
        </p>
      </div>

      {/* Visualización Grande de la Cuenta Regresiva Sincronizada con GET_STATUS */}
      <div className="p-8 bg-black border border-stone-800 rounded-3xl text-center shadow-2xl relative overflow-hidden">
        {/* Indicador de estado */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span
            className={`w-2 h-2 rounded-full ${
              isTimerMode
                ? status.paused
                  ? 'bg-amber-400'
                  : 'bg-emerald-400 animate-pulse'
                : 'bg-stone-600'
            }`}
          />
          <span className="text-xs font-mono uppercase tracking-wider text-stone-400">
            {isTimerMode
              ? status.paused
                ? 'PAUSADO EN RELOJ (PAUSE_TIMER)'
                : 'CORRIENDO EN FIRMWARE (remainingSec)'
              : 'CONFIGURAR Y ENVIAR AL ESP32'}
          </span>
        </div>

        {/* Gran Display */}
        <div
          className={`text-6xl sm:text-7xl font-mono font-black tracking-widest my-2 ${
            isTimerMode
              ? status.paused
                ? 'text-amber-400'
                : 'text-orange-500'
              : 'text-stone-300'
          }`}
          style={{
            textShadow: isTimerMode ? '0 0 24px rgba(249, 115, 22, 0.4)' : undefined,
          }}
        >
          {isTimerMode ? formatBigTimer(status.remainingSec || 0) : formatBigTimer(hours * 3600 + minutes * 60 + seconds)}
        </div>

        <div className="text-xs text-stone-500 mt-2 font-mono">
          {isTimerMode ? 'Sincronizado vía GET_STATUS (1 Hz)' : 'El reloj mantendrá la cuenta aunque cierres la app'}
        </div>
      </div>

      {/* Botones de Control de Temporizador */}
      <div className="flex items-center gap-3">
        {isTimerMode ? (
          <>
            {status.paused ? (
              <button
                onClick={handleResume}
                disabled={!isConnected}
                className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-950/30 transition-all disabled:opacity-40"
              >
                <Play className="w-5 h-5 fill-black" />
                Reanudar (RESUME_TIMER)
              </button>
            ) : (
              <button
                onClick={handlePause}
                disabled={!isConnected}
                className="flex-1 py-4 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold rounded-2xl flex items-center justify-center gap-2 text-sm border border-stone-700 transition-all disabled:opacity-40"
              >
                <Pause className="w-5 h-5" />
                Pausar (PAUSE_TIMER)
              </button>
            )}
            <button
              onClick={handleStop}
              disabled={!isConnected}
              className="py-4 px-6 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 font-semibold rounded-2xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-40"
              title="Detener temporizador y volver a reloj"
            >
              <RotateCcw className="w-5 h-5" />
              Detener
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            disabled={!isConnected || (hours === 0 && minutes === 0 && seconds === 0)}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg shadow-orange-950/40 transition-all disabled:opacity-40"
          >
            <Play className="w-5 h-5 fill-white" />
            Iniciar Temporizador en Reloj
          </button>
        )}
      </div>

      {/* Configuración de Horas, Minutos, Segundos */}
      {!isTimerMode && (
        <div className="p-5 bg-stone-900/90 border border-stone-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-stone-100 text-sm">Configuración de Duración</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {/* Horas */}
            <div className="p-3 bg-stone-850 rounded-xl border border-stone-800">
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Horas</label>
              <input
                type="number"
                min={0}
                max={23}
                value={hours}
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-center text-3xl font-mono font-bold bg-transparent text-stone-100 focus:outline-none"
              />
            </div>

            {/* Minutos */}
            <div className="p-3 bg-stone-850 rounded-xl border border-stone-800">
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Minutos</label>
              <input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="w-full text-center text-3xl font-mono font-bold bg-transparent text-stone-100 focus:outline-none"
              />
            </div>

            {/* Segundos */}
            <div className="p-3 bg-stone-850 rounded-xl border border-stone-800">
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Segundos</label>
              <input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="w-full text-center text-3xl font-mono font-bold bg-transparent text-stone-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Preajustes rápidos */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[1, 3, 5, 10, 15, 20, 30].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setHours(0);
                  setMinutes(m);
                  setSeconds(0);
                }}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-medium transition-colors"
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nota de protocolo */}
      <div className="p-3.5 bg-stone-900/60 border border-stone-800 rounded-xl flex items-start gap-2.5 text-xs text-stone-400">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          Al llegar a cero, el ESP32 activará automáticamente el buzzer y parpadeará en rojo (<code className="text-amber-300">alert=1</code>). Podrás silenciarlo con el botón de STOP_ALERT.
        </span>
      </div>
    </div>
  );
};
