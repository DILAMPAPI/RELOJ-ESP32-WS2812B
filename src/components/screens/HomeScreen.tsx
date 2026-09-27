import React from 'react';
import { BleManager } from '../../services/bleManager';
import { AlertCircle, Bluetooth, BluetoothConnected, Clock, Coffee, Palette, Play, Pause, Square, Bell, Sparkles } from 'lucide-react';

interface HomeScreenProps {
  ble: BleManager;
  onNavigate: (tabIndex: number) => void;
  onOpenBleDialog: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ ble, onNavigate, onOpenBleDialog }) => {
  const { status, config, state, alarms } = ble;
  const isConnected = state === 'connected';
  const activeAlarmsCount = alarms.filter((a) => a.enabled).length;

  const isTimerOrPomodoro = status.mode !== 'CLOCK';
  const isBreak = status.mode === 'POMODORO' && status.phase === 'BREAK';

  return (
    <div className="space-y-4 pb-20">
      {/* Banner Urgente de Alarma / Alerta Activa (alert=1) */}
      {status.alert && (
        <div className="p-4 bg-red-950 border-2 border-red-500 rounded-2xl shadow-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-red-200 text-sm sm:text-base">¡ALARMA O ALERTA SONANDO!</h3>
              <p className="text-xs text-red-300">Buzzer activo y parpadeo rojo en el reloj.</p>
            </div>
          </div>
          <button
            onClick={() => ble.stopAlert()}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-red-900/50 flex items-center gap-1.5 transition-all"
          >
            <Square className="w-4 h-4 fill-white" />
            DETENER
          </button>
        </div>
      )}

      {/* Tarjeta de Estado de Conexión BLE */}
      <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              isConnected ? 'bg-amber-500/20 text-amber-400' : 'bg-stone-800 text-stone-500'
            }`}
          >
            {isConnected ? <BluetoothConnected className="w-5 h-5" /> : <Bluetooth className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-100 text-sm">{ble.deviceName}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400' : state === 'scanning' ? 'bg-amber-400 animate-ping' : 'bg-stone-600'
                }`}
              />
            </div>
            <p className="text-xs text-stone-400">
              {isConnected
                ? 'Conectado · Sincronizado 1/s'
                : state === 'scanning'
                ? 'Buscando "Reloj ESP32"...'
                : 'Desconectado'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenBleDialog}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors"
        >
          {isConnected ? 'Cambiar / Desconectar' : 'Conectar'}
        </button>
      </div>

      {/* Tarjeta Principal de Hora Digital */}
      <div className="p-6 bg-gradient-to-b from-stone-900 to-black border border-stone-800 rounded-3xl text-center shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500/90 mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Hora Real del Reloj (GET_STATUS)</span>
        </div>

        <div
          className="text-5xl sm:text-6xl font-mono font-bold tracking-widest my-2 select-all"
          style={{
            color: isConnected
              ? `rgb(${config.color.r}, ${config.color.g}, ${config.color.b})`
              : 'rgba(255,255,255,0.4)',
            textShadow: isConnected
              ? `0 0 20px rgba(${config.color.r}, ${config.color.g}, ${config.color.b}, 0.5)`
              : 'none',
          }}
        >
          {isConnected ? status.time : '--:--:--'}
        </div>

        <div className="flex items-center justify-center gap-3 mt-4 text-xs text-stone-400">
          <span className="px-2.5 py-1 bg-stone-800/80 rounded-lg border border-stone-700/50">
            Formato: {config.timeFormat} Horas
          </span>
          <span className="px-2.5 py-1 bg-stone-800/80 rounded-lg border border-stone-700/50">
            Brillo: {Math.round((config.brightness * 100) / 255)}%
          </span>
          <span className="px-2.5 py-1 bg-stone-800/80 rounded-lg border border-stone-700/50">
            Modo: {status.mode}
          </span>
        </div>
      </div>

      {/* Widget de Modo Activo si está corriendo Temporizador o Pomodoro */}
      {isTimerOrPomodoro && (
        <div
          className={`p-4 rounded-2xl border ${
            isBreak
              ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
              : 'bg-amber-950/40 border-amber-600/50 text-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              {status.mode === 'POMODORO' ? (
                <>
                  <Coffee className="w-4 h-4" />
                  <span>
                    POMODORO: {status.phase === 'BREAK' ? 'DESCANSO (LEDS VERDES)' : 'TRABAJO'}
                    {status.currentRound && ` · Ronda ${status.currentRound}/${status.totalRounds || 4}`}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>TEMPORIZADOR ACTIVO</span>
                </>
              )}
            </div>
            {status.paused && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-black rounded-full">
                PAUSADO
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-3xl font-mono font-bold tracking-wider">
              {formatRemaining(status.remainingSec)}
            </div>
            <div className="flex items-center gap-2">
              {status.paused ? (
                <button
                  onClick={() => (status.mode === 'POMODORO' ? ble.resumePomodoro() : ble.resumeTimer())}
                  className="p-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold flex items-center gap-1 text-xs"
                >
                  <Play className="w-4 h-4 fill-black" /> Reanudar
                </button>
              ) : (
                <button
                  onClick={() => (status.mode === 'POMODORO' ? ble.pausePomodoro() : ble.pauseTimer())}
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs flex items-center gap-1"
                >
                  <Pause className="w-4 h-4" /> Pausar
                </button>
              )}
              <button
                onClick={() => (status.mode === 'POMODORO' ? ble.stopPomodoro() : ble.stopTimer())}
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs flex items-center gap-1"
              >
                <Square className="w-4 h-4" /> Detener
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accesos Rápidos a las demás secciones */}
      <div>
        <h4 className="text-xs uppercase font-semibold tracking-wider text-stone-400 mb-3 px-1">
          Accesos Rápidos
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate(1)}
            className="p-4 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 rounded-2xl text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Palette className="w-5 h-5" />
            </div>
            <div className="font-semibold text-stone-100 text-sm">Iluminación</div>
            <div className="text-xs text-stone-400">Color y brillo 58 LEDs</div>
          </button>

          <button
            onClick={() => onNavigate(2)}
            className="p-4 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 rounded-2xl text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <div className="font-semibold text-stone-100 text-sm">Alarmas</div>
            <div className="text-xs text-stone-400">{activeAlarmsCount} activas de 5</div>
          </button>

          <button
            onClick={() => onNavigate(3)}
            className="p-4 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 rounded-2xl text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div className="font-semibold text-stone-100 text-sm">Temporizador</div>
            <div className="text-xs text-stone-400">Cuenta regresiva</div>
          </button>

          <button
            onClick={() => onNavigate(4)}
            className="p-4 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 rounded-2xl text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="font-semibold text-stone-100 text-sm">Pomodoro</div>
            <div className="text-xs text-stone-400">Trabajo y descanso</div>
          </button>
        </div>
      </div>
    </div>
  );
};

function formatRemaining(sec?: number): string {
  if (sec === undefined || sec === null) return '00:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
